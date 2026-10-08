// ESLint's recommended rule set for plain JavaScript.
import js from "@eslint/js";
// Wraps the flat config array so ESLint validates its shape.
import { defineConfig } from "eslint/config";
// Rules that check JSDoc comments.
import jsdoc from "eslint-plugin-jsdoc";
// Parser and recommended rules for TypeScript.
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    // Engine-generated types, scratch skill workspaces and eval fixtures are not source.
    ignores: [".claude-plugin/types/**", "skills/*-workspace/**", "skills/*/evals/**"]
  },
  // Makes ESLint lint the mod's TypeScript files, which it skips by default.
  { files: ["hooks/**/*.ts"] },
  // Baseline rules for every linted file.
  js.configs.recommended,
  // TypeScript-aware recommended rules.
  tseslint.configs.recommended,
  {
    files: ["hooks/**/*.ts"],
    rules: {
      // Every if/else/loop body takes braces, so an added line never falls outside the block.
      curly: ["error", "all"],
      // An empty block is an error, except a catch that deliberately swallows.
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    // Hooks carry JSDoc on every function and exported type; tests are exempt.
    files: ["hooks/**/*.ts"],
    ignores: ["hooks/**/*.test.ts"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          // Not-exported functions need JSDoc as well.
          publicOnly: false,
          // Every kind of function, class and method declaration.
          require: {
            FunctionDeclaration: true,
            FunctionExpression: true,
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            MethodDefinition: true
          },
          // Exported types and interfaces, which `require` does not cover.
          contexts: [
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
            "ExportNamedDeclaration > TSInterfaceDeclaration"
          ]
        }
      ]
    }
  }
]);
