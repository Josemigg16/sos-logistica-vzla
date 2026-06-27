import { Hono } from "hono";
import { updateSupportPhoneSchema } from "@sos/shared";
import type { GetSupportPhone } from "../../application/settings/get-support-phone";
import type { UpdateSupportPhone } from "../../application/settings/update-support-phone";
import { authentication, requireRole, type AuthEnv } from "./middleware/authentication";

export interface SettingsRoutesDeps {
  getSupportPhone: GetSupportPhone;
  updateSupportPhone: UpdateSupportPhone;
}

/**
 * Rutas del bounded context `settings`. Hoy solo expone el número de contacto
 * de soporte para verificación de centros de acopio (público en GET, edición
 * restringida a ADMIN/MANAGER en PUT).
 */
export function createSettingsRoutes(deps: SettingsRoutesDeps): Hono<AuthEnv> {
  const router = new Hono<AuthEnv>();

  // GET público: la pantalla de verificación post-registro lo lee sin sesión.
  router.get("/support-phone", async (c) => {
    try {
      const contact = await deps.getSupportPhone.execute();
      return c.json(contact);
    } catch (error) {
      console.error("Error en GET /settings/support-phone:", error);
      return c.json({ error: "Error interno" }, 500);
    }
  });

  router.put(
    "/support-phone",
    authentication,
    requireRole("ADMIN", "MANAGER"),
    async (c) => {
      const parsed = updateSupportPhoneSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) {
        return c.json(
          { error: "Datos inválidos", details: parsed.error.flatten() },
          400,
        );
      }
      try {
        const contact = await deps.updateSupportPhone.execute({
          phone: parsed.data.phone,
        });
        return c.json(contact);
      } catch (error) {
        console.error("Error en PUT /settings/support-phone:", error);
        return c.json({ error: "Error interno" }, 500);
      }
    },
  );

  return router;
}
