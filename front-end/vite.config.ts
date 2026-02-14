import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  
  return {
    base: '/',
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
    ],
    server: {
      hmr: !isProduction,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
      emptyOutDir: true,
    },
  };
});
