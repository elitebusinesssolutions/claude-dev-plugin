import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [".claude-plugin/types/**", "skills/*-workspace/**", "skills/*/evals/**"]
  },
  { files: ["hooks/**/*.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["hooks/**/*.ts"],
    rules: {
      curly: ["error", "all"],
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    files: ["hooks/**/*.ts"],
    ignores: ["hooks/**/*.test.ts"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: false,
          require: { FunctionDeclaration: true, ArrowFunctionExpression: true }
        }
      ]
    }
  }
]);
