import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["scripts/**/*.js", "tests/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        Buffer: "readonly"
      }
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  }
]);
