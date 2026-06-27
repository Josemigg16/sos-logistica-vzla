/**
 * Datos de contacto del equipo de SOS Logística para verificación de centros
 * de acopio recién registrados desde el mapa público.
 *
 * Cuando un centro queda en estado INACTIVO (pendiente de verificación), la
 * persona dueña del centro NO puede activarlo por sí misma — tiene que llamar
 * a este número para que un coordinador interno (ADMIN/MANAGER/ZODI) lo valide.
 *
 * TODO: setear el número real cuando esté disponible. Cambia solo el valor de
 * `SUPPORT_PHONE` — el resto del código lee desde acá.
 */

export const SUPPORT_PHONE = "" as const;

/** Número en formato E.164 limpio para enlaces wa.me / tel:. */
export const SUPPORT_PHONE_WHATSAPP = SUPPORT_PHONE.replace(/[^0-9]/g, "");

/** Indica si ya hay un número configurado (para mostrar fallback). */
export const HAS_SUPPORT_PHONE = SUPPORT_PHONE_WHATSAPP.length > 0;
