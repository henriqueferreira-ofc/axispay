import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import type { Database } from "../../../src/integrations/supabase/types.ts";

export const supabaseAdmin = createClient<Database>(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type Context = { request: Request; userId: string; claims: { email?: string } };
export function defineOperation<T = undefined>() {
  let requiresAuth = false;
  let parse = (_value: unknown): T => undefined as T;
  const builder = {
    authenticated() { requiresAuth = true; return builder; },
    inputValidator<U>(validator: (value: unknown) => U) {
      const next = defineOperation<U>();
      if (requiresAuth) next.authenticated();
      next.setParser(validator);
      return next;
    },
    setParser(validator: (value: unknown) => T) { parse = validator; },
    handler<R>(handler: (args: { data: T; context: Context }) => Promise<R>) {
      return async (request: Request, value: unknown): Promise<R> => {
        const context: Context = { request, userId: "", claims: {} };
        if (requiresAuth) {
          const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
          if (!token) throw new Error("Entre com e-mail e senha para ativar a biometria.");
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (error || !data.user) throw new Error("Sessão inválida. Entre novamente.");
          context.userId = data.user.id;
          context.claims = { email: data.user.email };
        }
        return handler({ data: parse(value), context });
      };
    },
  };
  return builder;
}
