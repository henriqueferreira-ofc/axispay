import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    if (!env[name]?.trim()) {
      throw new Error(`Missing ${name}: configure it before building AxisPay.`);
    }
  }
  return {
    // O aplicativo Cloudflare é servido na raiz do domínio.
    base: "/",
  };
});
