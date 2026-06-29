import type { PublicIncident } from "@sos/shared";
import { API_URL } from "@/lib/auth/config";

export async function fetchPublicIncidents(): Promise<PublicIncident[]> {
  const res = await fetch(`${API_URL}/incidents`);
  if (!res.ok) throw new Error("No se pudieron cargar las emergencias");
  return ((await res.json()) as { incidents: PublicIncident[] }).incidents;
}

export function getKmDistance(p1: [number, number], p2: [number, number]): number {
  const [lon1, lat1] = p1;
  const [lon2, lat2] = p2;
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
