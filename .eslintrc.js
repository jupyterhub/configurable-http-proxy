module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
  },
  root: true,
  rules: {
    "no-unused-vars": "off",
  },
};
