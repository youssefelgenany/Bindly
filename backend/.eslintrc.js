module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended"
  ],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    // your preferred rules; these are sensible defaults
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  },
};
