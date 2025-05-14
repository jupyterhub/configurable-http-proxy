const globals = require("globals");
const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ["bin/*", "**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jasmine,
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
]);
