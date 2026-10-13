import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const config = [
  globalIgnores([".next/**", "drizzle/**", "next-env.d.ts", "supabase/.temp/**"]),
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // O código existente usa efeitos de hidratação e relógio da fila de forma intencional.
      // Essas regras novas do React 19 serão habilitadas após refatoração dedicada.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default config;
