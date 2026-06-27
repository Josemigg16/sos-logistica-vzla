import type { PublicSupportContact } from "@sos/shared";
import { API_URL } from "@/lib/auth/config";
import { getToken } from "@/lib/auth/token-store";

/**
 * Cliente del bounded context `settings`. Aísla el endpoint del UI: la pantalla
 * de verificación y el panel admin hablan con estas funciones y nunca con fetch
 * directo.
 */

export async function fetchSupportPhone(): Promise<PublicSupportContact> {
  const res = await fetch(`${API_URL}/settings/support-phone`);
  if (!res.ok) throw new Error("No se pudo obtener el número de contacto");
  return res.json();
}

export async function updateSupportPhone(phone: string): Promise<PublicSupportContact> {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/settings/support-phone`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "No se pudo guardar el número de contacto");
  }
  return res.json();
}
