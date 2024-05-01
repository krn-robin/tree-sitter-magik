import globals from "globals";

export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.commonjs,
        ...globals.es2021,
      }
      rules: {
        "arrow-parens": "off",
        "indent": ["error", 2, {"SwitchCase": 1}],
        "max-len": [
          "error",
          {"code": 120, "ignoreComments": true, "ignoreUrls": true, "ignoreStrings": true},
    ],
  },
};
