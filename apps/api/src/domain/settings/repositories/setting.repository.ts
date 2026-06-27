import type { SettingKey } from "@sos/shared";
import type { Setting } from "../entities/setting";

/**
 * Puerto del repositorio de settings. La implementación vive en infra.
 */
export interface SettingRepository {
  findByKey(key: SettingKey): Promise<Setting | null>;
  save(setting: Setting): Promise<void>;
}
