import type { PublicSupportContact } from "@sos/shared";
import type { SettingRepository } from "../../domain/settings/repositories/setting.repository";
import { Setting } from "../../domain/settings/entities/setting";

export interface UpdateSupportPhoneCommand {
  phone: string;
}

/**
 * Use case: actualizar el número de contacto de soporte. Solo lo invocan
 * ADMIN/MANAGER desde el panel. Si la key no existe, la crea; si existe, la
 * sobrescribe y refresca `updatedAt`.
 */
export class UpdateSupportPhone {
  constructor(private readonly settings: SettingRepository) {}

  async execute(command: UpdateSupportPhoneCommand): Promise<PublicSupportContact> {
    const value = command.phone.trim();
    const existing = await this.settings.findByKey("support_phone");
    const setting = existing ?? Setting.create({ key: "support_phone", value });
    if (existing) {
      existing.changeValue(value);
    }
    await this.settings.save(setting);
    return {
      phone: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
