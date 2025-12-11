import eslintPluginImport from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.ts", "**/*.js"],
    ignores: ["/lib/**/*", "/generated/**/*", "eslint.config.js", ".eslintrc.js", "lib//", "dist//"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.dev.json"],
        sourceType: "module",
        ecmaVersion: 2020,
      },
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      import: eslintPluginImport,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      quotes: ["error", "double"],
      indent: ["error", 2],
      "import/no-unresolved": "off",
    },
  },
  // Recommended rulesets (apply after plugins)
  ...tseslint.configs.recommended,
];