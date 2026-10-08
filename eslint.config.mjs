// ESLint's recommended rule set for plain JavaScript.
import js from "@eslint/js";
// Wraps the flat config array so ESLint validates its shape.
import { defineConfig } from "eslint/config";
// Rules that check JSDoc comments.
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
  {
    // Local Claude state and .NET build output are not source.
    ignores: [".claude/**", "**/bin/**", "**/obj/**"]
  },
  // Baseline rules for every linted file.
  js.configs.recommended,
  {
    // The repo's own Node scripts and their tests.
    files: ["scripts/**/*.js", "tests/**/*.js"],
    languageOptions: {
      // The scripts use require() and module.exports, not ES modules.
      sourceType: "commonjs",
      // Node globals that the recommended rules would otherwise report as undefined.
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
      // Every if/else/loop body takes braces, so an added line never falls outside the block.
      curly: ["error", "all"],
      // An empty block is an error, except a catch that deliberately swallows.
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    // Scripts carry JSDoc on every function; tests are exempt.
    files: ["scripts/**/*.js"],
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
          }
        }
      ]
    }
  }
]);
