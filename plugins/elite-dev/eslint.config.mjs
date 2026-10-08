import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  { files: ["hooks/**/*.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["hooks/**/*.ts"],
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  }
]);
