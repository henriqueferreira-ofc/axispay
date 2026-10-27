import { defineOperation } from "./runtime.ts";

import { z } from "npm:zod@3.24.2";
import { supabaseAdmin } from "./runtime.ts";
import { validPasskeyChallenge } from "./policy.ts";
import { base64UrlToBytes, bytesToBase64Url } from "./base64url.ts";

/**
 * Real WebAuthn (passkey) authentication.
 * - Registration requires an existing signed-in session (first login is always email + password).
 * - Login verifies the device signature on the server, then issues a one-time sign-in token
 *   for that user. No biometric data ever leaves the device.
 */

function resolveOrigin(req: Request) {
  const originHeader = req?.headers.get("origin");
  const origin = originHeader ?? "";
  if (!origin) throw new Error("Origem inválida");
  const { hostname, protocol } = new URL(origin);
  if (protocol !== "https:" && hostname !== "localhost") throw new Error("Origem inválida");
  return { origin, rpID: hostname };
}

const responseSchema = z.record(z.string(), z.any());

export const startPasskeyRegistration = defineOperation()
  .authenticated()
  .handler(async ({ context }) => {
    try {
      const { generateRegistrationOptions } = await import("npm:@simplewebauthn/server@13.3.3");
      const { origin, rpID } = resolveOrigin(context.request);
      const email = typeof context.claims.email === "string" ? context.claims.email : "usuario";

      const { data: existing, error: credentialsError } = await supabaseAdmin
        .from("passkey_credentials")
        .select("credential_id, transports")
        .eq("user_id", context.userId)
        .eq("rp_id", rpID);

      if (credentialsError) {
        console.error("Passkey credential lookup failed", credentialsError.code);
        return {
          error:
            "O servidor não conseguiu acessar o cadastro de biometria. Verifique a migração das tabelas no Supabase.",
        };
      }

      const options = await generateRegistrationOptions({
        // Generate inside the handler using the runtime's native Web Crypto.
        // Avoid the library's challenge helper initialization in split Worker bundles.
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpName: "AxisPay",
        rpID,
        userName: email,
        userID: new TextEncoder().encode(context.userId),
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((c) => ({
          id: c.credential_id,
          transports: c.transports as AuthenticatorTransport[] as never,
        })),
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
      });

      await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .lt("expires_at", new Date().toISOString());
      const { data: ch, error } = await supabaseAdmin
        .from("passkey_challenges")
        .insert({
          user_id: context.userId,
          challenge: options.challenge,
          kind: "register",
          rp_id: rpID,
          origin,
        })
        .select("id")
        .single();
      if (error || !ch) throw new Error("Não foi possível iniciar o cadastro");
      return { challengeId: ch.id, options, error: null };
    } catch (error) {
      console.error("Passkey registration preparation failed", error);
      return {
        error:
          "Não foi possível preparar a biometria no servidor. Tente novamente ou entre com e-mail e senha.",
      };
    }
  });

export const finishPasskeyRegistration = defineOperation()
  .authenticated()
  .inputValidator((d) =>
    z
      .object({
        challengeId: z.string().uuid(),
        response: responseSchema,
        deviceLabel: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("npm:@simplewebauthn/server@13.3.3");

    const { data: ch, error: consumeError } = await supabaseAdmin
      .from("passkey_challenges")
      .delete()
      .eq("id", data.challengeId)
      .eq("kind", "register")
      .eq("user_id", context.userId)
      .select("*")
      .maybeSingle();
    const expected = resolveOrigin(context.request);
    if (consumeError || !ch || !validPasskeyChallenge(ch, expected, Date.now()))
      throw new Error("Tempo esgotado, tente novamente");

    const verification = await verifyRegistrationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: ch.origin,
      expectedRPID: ch.rp_id,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo)
      throw new Error("Biometria não confirmada");

    const cred = verification.registrationInfo.credential;
    const { error } = await supabaseAdmin.from("passkey_credentials").insert({
      user_id: context.userId,
      credential_id: cred.id,
      public_key: bytesToBase64Url(cred.publicKey),
      counter: cred.counter,
      transports: (cred.transports ?? []) as string[],
      rp_id: ch.rp_id,
      device_label: data.deviceLabel ?? null,
    });
    if (error) throw new Error("Não foi possível salvar a biometria");
    return { credentialId: cred.id };
  });

export const startPasskeyLogin = defineOperation()
  .inputValidator((d) => z.object({ credentialId: z.string().min(1).max(512).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateAuthenticationOptions } = await import("npm:@simplewebauthn/server@13.3.3");
    const { origin, rpID } = resolveOrigin(context.request);

    let allowCredentials: { id: string; transports?: never }[] | undefined;
    let challengeUserId: string | undefined;
    if (data.credentialId) {
      const { data: c } = await supabaseAdmin
        .from("passkey_credentials")
        .select("credential_id, transports, user_id")
        .eq("credential_id", data.credentialId)
        .eq("rp_id", rpID)
        .maybeSingle();
      if (!c) return { missing: true as const };
      challengeUserId = c.user_id;
      allowCredentials = [{ id: c.credential_id, transports: c.transports as never }];
    }

    const options = await generateAuthenticationOptions({
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpID,
      allowCredentials,
      userVerification: "required",
    });

    await supabaseAdmin
      .from("passkey_challenges")
      .delete()
      .lt("expires_at", new Date().toISOString());
    const { data: ch, error } = await supabaseAdmin
      .from("passkey_challenges")
      .insert({
        user_id: challengeUserId,
        challenge: options.challenge,
        kind: "login",
        rp_id: rpID,
        origin,
      })
      .select("id")
      .single();
    if (error || !ch) throw new Error("Não foi possível iniciar o acesso");
    return {
      missing: false as const,
      challengeId: ch.id,
      options,
    };
  });

export const finishPasskeyLogin = defineOperation()
  .inputValidator((d) =>
    z.object({ challengeId: z.string().uuid(), response: responseSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyAuthenticationResponse } = await import("npm:@simplewebauthn/server@13.3.3");

    const { data: ch, error: consumeError } = await supabaseAdmin
      .from("passkey_challenges")
      .delete()
      .eq("id", data.challengeId)
      .eq("kind", "login")
      .select("*")
      .maybeSingle();
    const expected = resolveOrigin(context.request);
    if (consumeError || !ch || !validPasskeyChallenge(ch, expected, Date.now()))
      throw new Error("Tempo esgotado, tente novamente");

    const credentialId = typeof data.response.id === "string" ? data.response.id : "";
    const { data: cred } = await supabaseAdmin
      .from("passkey_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .eq("rp_id", ch.rp_id)
      .maybeSingle();
    if (!cred || (ch.user_id && ch.user_id !== cred.user_id))
      throw new Error("Biometria não cadastrada neste aparelho");

    const verification = await verifyAuthenticationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: ch.origin,
      expectedRPID: ch.rp_id,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: base64UrlToBytes(cred.public_key),
        counter: Number(cred.counter),
        transports: cred.transports as never,
      },
    });
    if (!verification.verified) throw new Error("Biometria não confirmada");

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("passkey_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id)
      .eq("counter", cred.counter)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) throw new Error("Biometria não confirmada");

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(
      cred.user_id,
    );
    const email = userRes?.user?.email;
    if (userErr || !email) throw new Error("Conta não encontrada");

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) throw new Error("Não foi possível concluir o acesso");
    return { tokenHash };
  });
