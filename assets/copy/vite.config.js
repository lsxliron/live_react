import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

import react from "@vitejs/plugin-react";
import liveReactPlugin from "live_react/vite-plugin";

const build_env = process.env.BUILD_ENV == "production" ? "prod" : "dev";
const PHX_APP_NAME =  path.basename(path.resolve(".."))

// returns no ecternals for prod SSR build and externals for dev SSR build
function getSsrExternals(isDev) {
  if (isDev) {
    return {
      external: ["react", "react-dom"],
      noExternal: ["live_react"],
    };
  }
  return {};
}

// returns aliases for prod build to avoid duplicate react copies
function getAliases(isDev) {
  if (!isDev) {
    const aliases = {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    };

    // required for phoenix 1.8 and up
    aliases[`phoenix-colocated/${PHX_APP_NAME}`] = path.resolve(
      __dirname,
      `../_build/${build_env}/phoenix-colocated/${PHX_APP_NAME}`,
    )
    return aliases
  }
  return {};
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command !== "build";

  return {
    base: isDev ? undefined : "/assets",
    publicDir: "static",
    plugins: [
      react(),
      liveReactPlugin(),
      tailwindcss(),
    ],
    ssr: {
      // we need it, because in SSR build we want no external
      // and in dev, we want external for fast updates
      ...getSsrExternals(isDev),
    },
    resolve: {
      preserveSymlinks: true,
      alias: {
        ...getAliases(isDev),
        "@": path.resolve(__dirname, "."),
      },
    },
    optimizeDeps: {
      // these packages are loaded as file:../deps/<name> imports
      // so they're not optimized for development by vite by default
      // we want to enable it for better DX
      // more https://vitejs.dev/guide/dep-pre-bundling#monorepos-and-linked-dependencies
      include: ["live_react", "phoenix", "phoenix_html", "phoenix_live_view"],
    },
    build: {
      commonjsOptions: { transformMixedEsModules: true },
      target: "es2020",
      outDir: "../priv/static/assets", // emit assets to priv/static/assets
      emptyOutDir: true,
      sourcemap: isDev, // enable source map in dev build
      manifest: false, // do not generate manifest.json
      rollupOptions: {
        input: {
          app: path.resolve(__dirname, "./js/app.js"),
        },
        output: {
          // remove hashes to match phoenix way of handling asssets
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name][extname]",
        },
      },
    },
  };
});
