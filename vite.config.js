import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/taiwan-casualty-model/", // <-- use your repo name here
});
