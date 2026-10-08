// ESLint's recommended rule set for plain JavaScript.
import js from "@eslint/js";
// Wraps the flat config array so ESLint validates its shape.
import { defineConfig } from "eslint/config";
// Rules that check JSDoc comments.
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
  // Skill eval fixtures are not source.
  { ignores: ["skills/*/evals/**"] },
  // Baseline rules for every linted file.
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      // The hooks use require() and module.exports, not ES modules.
      sourceType: "commonjs",
      // Node globals that the recommended rules would otherwise report as undefined.
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      // An empty block is an error, except a catch that deliberately swallows.
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    // Test runner globals, so test files do not report describe/it/test as undefined.
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        before: "readonly",
        after: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    }
  },
  {
    // Hooks carry JSDoc on every function; tests are exempt.
    files: ["hooks/**/*.js"],
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
