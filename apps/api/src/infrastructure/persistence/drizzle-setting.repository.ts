import { eq } from "drizzle-orm";
import type { SettingKey } from "@sos/shared";
import { db } from "./db";
import { appSettings } from "./schema";
import type { SettingRepository } from "../../domain/settings/repositories/setting.repository";
import { Setting } from "../../domain/settings/entities/setting";

type SettingRow = typeof appSettings.$inferSelect;

function toDomain(row: SettingRow): Setting {
  return Setting.rehydrate({
    key: row.key as SettingKey,
    value: row.value,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleSettingRepository implements SettingRepository {
  async findByKey(key: SettingKey): Promise<Setting | null> {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async save(setting: Setting): Promise<void> {
    const values = {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
    };
    await db
      .insert(appSettings)
      .values(values)
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: values.value, updatedAt: values.updatedAt },
      });
  }
}
