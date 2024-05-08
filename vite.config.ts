import { defineConfig, ProxyOptions, UserConfig } from "vite";
import preact from "@preact/preset-vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }): UserConfig => {
  const host = mode === "localdev" ? "lh.xmit.dev:8443" : "xmit.co";
  const secure = mode !== "localdev";
  return {
    plugins: [preact(), basicSsl()],
    server: {
      proxy: {
        "/api/web": {
          target: `https://${host}`,
          secure,
          changeOrigin: true,
          headers: {
            origin: `https://${host}`,
          },
          configure: (_, options: ProxyOptions) => {
            options.cookieDomainRewrite = "localhost";
          },
        },
        "/api/web/socket": {
          target: `wss://${host}`,
          secure,
          changeOrigin: true,
          ws: true,
          headers: {
            origin: `https://${host}`,
          },
        },
      },
    },
  };
});
