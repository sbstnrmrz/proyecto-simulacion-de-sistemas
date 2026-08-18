import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        experimento: "experimento.html",
        partida: "partida.html",
      },
    },
  },
});
