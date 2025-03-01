import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: "src/main/main.ts",
        },
        external: [
          "electron",
          "electron-updater",
          "better-sqlite3", // 将 better-sqlite3 标记为外部模块
        ],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: "src/preload/preload.ts",
        },
        external: ["electron"],
      },
    },
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: "src/renderer/index.html",
        },
      },
    },
  },
});
