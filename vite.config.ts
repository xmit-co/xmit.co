import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [preact({ devtoolsInProd: true }), basicSsl()],
  server: {
    proxy: {
      "/api/web": {
        target: "https://xmit.co",
        changeOrigin: true,
        headers: {
          origin: "https://xmit.co",
        },
      },
      "/api/web/socket": {
        target: "wss://xmit.co",
        changeOrigin: true,
        ws: true,
        headers: {
          origin: "https://xmit.co",
        },
      },
    },
  },
});
