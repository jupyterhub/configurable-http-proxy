const globals = require("globals");
const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ["bin/configurable-http-proxy", "**/*js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
  {
    files: ["test/**/*js"],
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
        ...globals.jasmine,
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
]);
