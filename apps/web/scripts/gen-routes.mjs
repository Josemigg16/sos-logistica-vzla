// Regenera routeTree.gen.ts sin levantar el dev server de Vite.
// Usa el mismo Generator que el plugin de TanStack Router internamente, para
// que `tsc -b` (que corre antes de `vite build`) vea el árbol de rutas al día.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Generator, getConfig } from "@tanstack/router-generator";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const config = getConfig({ target: "react", autoCodeSplitting: true }, root);
const generator = new Generator({ config, root });
await generator.run();
console.log("routeTree.gen.ts regenerado");
