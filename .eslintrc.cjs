module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "import", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    // TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",

    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",

    // Imports
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      },
    ],
    "import/no-duplicates": "error",

    // General
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
  },
  settings: {
    react: { version: "detect" },
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
  },
  overrides: [
    {
      // Node-only files (server, scripts)
      files: ["server/**/*.ts", "server/**/*.tsx"],
      env: { node: true, browser: false },
    },
    {
      // Electron / browser files
      files: ["desktop/**/*.ts", "desktop/**/*.tsx"],
      env: { browser: true, node: false },
    },
    {
      // Electron main process
      files: ["desktop/electron/**/*.ts"],
      env: { node: true, browser: false },
    },
    {
      // Config files
      files: ["*.config.js", "*.config.ts", "*.config.cjs", "*.config.mjs"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: [
    "node_modules",
    ".next",
    "out",
    "dist",
    "dist-electron",
    "release",
    "*.generated.ts",
    "prisma/generated",
  ],
};
