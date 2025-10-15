import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/", "dist/", "build/"], // replaces .eslintignore
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn"], // change 'error' → 'warn' to reduce noise
      "no-undef": "error",
      "no-irregular-whitespace": "error",
    },
  },
]);
