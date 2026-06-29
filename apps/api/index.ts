import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createIdentityModule } from "./src/infrastructure/identity.module";
import {
  createResourcesModule,
  createCentrosModule,
} from "./src/infrastructure/resources.module";
import { createProductsModule } from "./src/infrastructure/products.module";
import { createNeedsModule } from "./src/infrastructure/needs.module";
import { createOperationsModule } from "./src/infrastructure/operations.module";
import { createIncidentsModule } from "./src/infrastructure/incidents.module";
import { createFleetModule } from "./src/infrastructure/fleet.module";
import { createCargoModule } from "./src/infrastructure/cargo.module";
import { createConvoysModule } from "./src/infrastructure/convoys.module";
import { createSettingsModule } from "./src/infrastructure/settings.module";

const app = new Hono();

app.use("*", logger());

// CORS con credenciales para que el frontend mande la cookie del refresh token.
app.use(
  "/*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

// Bounded context `identity` — autenticación bajo /auth.
app.route("/auth", createIdentityModule().routes);

// Bounded context `resources` — hubs y stock de insumos bajo /resources.
app.route("/resources", createResourcesModule().routes);

// `resources` (ACL legacy) — centros de acopio bajo /centros (Strangler Fig).
app.route("/centros", createCentrosModule().routes);

// `resources` (ACL legacy) — catálogo de productos bajo /productos.
app.route("/", createProductsModule().routes);

// `resources` (ACL legacy) — necesidades bajo /needs y /necesidades.
app.route("/", createNeedsModule().routes);

// Bounded context `operations` — planificación de viajes bajo /operations.
app.route("/operations", createOperationsModule().routes);

// Bounded context `incidents` — emergencias bajo /incidents (GET público).
app.route("/incidents", createIncidentsModule().routes);

// Bounded context `fleet` — choferes, vehículos y tipos de vehículo bajo /fleet.
app.route("/fleet", createFleetModule().routes);

// Bounded context `cargo` — lotes, asignaciones y traspasos bajo /cargo.
app.route("/cargo", createCargoModule().routes);

// Bounded context `convoys` — caravanas escoltadas ZODI bajo /convoys.
app.route("/convoys", createConvoysModule().routes);

// Bounded context `settings` — configuración global de la app bajo /settings.
app.route("/settings", createSettingsModule().routes);

// --- Endpoints del Servidor ---

app.get("/health", (c) =>
  c.json({ status: "ok", service: "sos-api", ts: new Date().toISOString() })
);

app.get("/", (c) => c.text("Portuguesa Unida API"));

const port = Number(process.env.PORT ?? 8081);

export default {
  port,
  fetch: app.fetch,
};
