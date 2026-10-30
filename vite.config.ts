import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "..",
  define: {
    __SERVER_FORWARD_CONSOLE__: "false"
  },
  plugins: [react()],
  server: {
    port: 5173
  }
});
