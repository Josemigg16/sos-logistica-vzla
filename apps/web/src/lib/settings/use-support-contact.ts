import { useQuery } from "@tanstack/react-query";
import type { PublicSupportContact } from "@sos/shared";
import { fetchSupportPhone } from "./client";

/**
 * Hook compartido que lee el número de contacto de SOS Logística desde el
 * backend. La pantalla de verificación post-registro y el bloque de contacto
 * lo usan para tener la fuente de verdad única.
 *
 * - El número puede no estar configurado todavía (`phone === ""`): la UI debe
 *   mostrar un placeholder en ese caso.
 * - El query no requiere sesión (endpoint público).
 */
export function useSupportContact() {
  return useQuery<PublicSupportContact>({
    queryKey: ["settings", "support-phone"],
    queryFn: fetchSupportPhone,
    // Cache razonable: el número cambia muy esporádicamente.
    staleTime: 60_000,
  });
}

/** Limpia el teléfono para usarlo en wa.me / tel: (solo dígitos). */
export function toWhatsappNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
