import { GetSupportPhone } from "../application/settings/get-support-phone";
import { UpdateSupportPhone } from "../application/settings/update-support-phone";
import { DrizzleSettingRepository } from "./persistence/drizzle-setting.repository";
import { createSettingsRoutes } from "./http/settings.routes";

/**
 * Composition root del bounded context `settings`.
 */
export function createSettingsModule() {
  const settings = new DrizzleSettingRepository();

  const useCases = {
    getSupportPhone: new GetSupportPhone(settings),
    updateSupportPhone: new UpdateSupportPhone(settings),
  };

  return {
    useCases,
    routes: createSettingsRoutes(useCases),
  };
}
