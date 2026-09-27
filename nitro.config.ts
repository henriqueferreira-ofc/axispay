import { defineConfig } from "nitro/config";

export default defineConfig({
  // index.html belongs to GitHub Pages. TanStack Start renders the application.
  renderer: false,
});
