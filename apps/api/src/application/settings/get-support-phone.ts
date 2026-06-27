import type { PublicSupportContact } from "@sos/shared";
import type { SettingRepository } from "../../domain/settings/repositories/setting.repository";

/**
 * Use case: obtener el número de contacto de soporte que se muestra en el
 * flujo público (pantalla "verifica tu centro"). Devuelve string vacío si
 * todavía no fue configurado por un admin.
 */
export class GetSupportPhone {
  constructor(private readonly settings: SettingRepository) {}

  async execute(): Promise<PublicSupportContact> {
    const setting = await this.settings.findByKey("support_phone");
    if (!setting) {
      return { phone: "", updatedAt: null };
    }
    return {
      phone: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
