// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig({
  vite: {
    // Definindo como '/' para funcionar no Cloudflare
    base: "/",
    plugins: [{
      name: "validate-supabase-browser-config",
      config(_config, { command, mode }) {
        // Vite only exposes VITE_* values by default. Load private server values
        // for the local Node server without defining them in browser bundles.
        if (command === "serve") {
          const serverEnv = loadEnv(mode, process.cwd(), "SUPABASE_");
          for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
            if (!process.env[key] && serverEnv[key]?.trim()) {
              process.env[key] = serverEnv[key];
            }
          }
        }
        if (command !== "build") return;
        const env = loadEnv(mode, process.cwd(), "VITE_");
        const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
          .filter((key) => !env[key]?.trim());
        if (missing.length) {
          throw new Error(`Missing public Supabase build configuration: ${missing.join(", ")}. Check .env and remove empty CI overrides.`);
        }
      },
    }],
  },
});
