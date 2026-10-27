import {
  startPasskeyRegistration, finishPasskeyRegistration,
  startPasskeyLogin, finishPasskeyLogin,
} from "./operations.ts";

const operations = { startPasskeyRegistration, finishPasskeyRegistration, startPasskeyLogin, finishPasskeyLogin };

Deno.serve(async (request: Request) => {
  // This endpoint is called by the same-origin application server, not the browser.
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    if (Number(request.headers.get("content-length")) > 50_000)
      return Response.json({ error: "Requisição muito grande." }, { status: 413 });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 50_000)
      return Response.json({ error: "Requisição muito grande." }, { status: 413 });
    const { action, data } = JSON.parse(raw);
    if (typeof action !== "string" || !Object.hasOwn(operations, action))
      return Response.json({ error: "Operação inválida." }, { status: 400 });
    const result = await operations[action as keyof typeof operations](request, data);
    return Response.json(result);
  } catch (error) {
    console.error("Passkey operation failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "Não foi possível concluir a biometria. Entre novamente ou tente mais tarde." }, { status: 400 });
  }
});
