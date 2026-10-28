import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: { main: "index.html", waterLab: "water-lab.html" },
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
