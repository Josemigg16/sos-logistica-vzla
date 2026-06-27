import type { SettingKey } from "@sos/shared";
import type { SettingRepository } from "../../domain/settings/repositories/setting.repository";
import type { Setting } from "../../domain/settings/entities/setting";

/**
 * Adapter in-memory del puerto SettingRepository. Para tests y para correr la
 * API sin Postgres. Misma interfaz que el adapter de Drizzle.
 */
export class InMemorySettingRepository implements SettingRepository {
  private readonly byKey = new Map<SettingKey, Setting>();

  async findByKey(key: SettingKey): Promise<Setting | null> {
    return this.byKey.get(key) ?? null;
  }

  async save(setting: Setting): Promise<void> {
    this.byKey.set(setting.key, setting);
  }
}
