import { describe, it, expect, beforeEach } from "bun:test";
import { GetSupportPhone } from "./get-support-phone";
import { UpdateSupportPhone } from "./update-support-phone";
import { InMemorySettingRepository } from "../../infrastructure/persistence/in-memory-setting.repository";

describe("Support phone setting", () => {
  let repo: InMemorySettingRepository;
  let get: GetSupportPhone;
  let update: UpdateSupportPhone;

  beforeEach(() => {
    repo = new InMemorySettingRepository();
    get = new GetSupportPhone(repo);
    update = new UpdateSupportPhone(repo);
  });

  it("devuelve phone vacío y updatedAt null cuando aún no fue configurado", async () => {
    const result = await get.execute();
    expect(result).toEqual({ phone: "", updatedAt: null });
  });

  it("crea el valor cuando no existe", async () => {
    const result = await update.execute({ phone: "+58 412 1234567" });
    expect(result.phone).toBe("+58 412 1234567");
    expect(result.updatedAt).not.toBeNull();

    const reloaded = await get.execute();
    expect(reloaded.phone).toBe("+58 412 1234567");
  });

  it("sobreescribe el valor existente y refresca updatedAt", async () => {
    await update.execute({ phone: "+58 412 1111111" });
    const first = await get.execute();

    // Avanzamos un tick mínimo para asegurar que updatedAt cambia.
    await new Promise((resolve) => setTimeout(resolve, 5));

    await update.execute({ phone: "+58 414 2222222" });
    const second = await get.execute();

    expect(second.phone).toBe("+58 414 2222222");
    expect(second.updatedAt).not.toBe(first.updatedAt);
  });

  it("trimea el phone al guardar", async () => {
    await update.execute({ phone: "   +58 412 9999999   " });
    const result = await get.execute();
    expect(result.phone).toBe("+58 412 9999999");
  });

  it("permite vaciar el valor (string vacío) para 'limpiar' el setting", async () => {
    await update.execute({ phone: "+58 412 1111111" });
    await update.execute({ phone: "" });
    const result = await get.execute();
    expect(result.phone).toBe("");
  });
});
