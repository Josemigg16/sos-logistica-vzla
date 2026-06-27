import { z } from "zod";

/**
 * Settings bounded context — configuración global de la app que un ADMIN puede
 * cambiar desde el panel sin re-deployar. Modelo key/value: cada `setting` es
 * un par clave-valor identificado por una `SettingKey` del catálogo cerrado.
 *
 * Por ahora solo guardamos el número de contacto de SOS Logística que se muestra
 * en la pantalla "verifica tu centro" del flujo público.
 */

export const SETTING_KEYS = ["support_phone"] as const;
export const settingKeySchema = z.enum(SETTING_KEYS);
export type SettingKey = z.infer<typeof settingKeySchema>;

export const updateSupportPhoneSchema = z.object({
  // Acepta vacío para "limpiar" el número; máximo 40 chars para un E.164 con
  // formato humano amplio. La validación de formato exacto vive en la UI.
  phone: z.string().trim().max(40),
});
export type UpdateSupportPhoneRequest = z.infer<typeof updateSupportPhoneSchema>;

export interface PublicSupportContact {
  phone: string;
  updatedAt: string | null;
}
