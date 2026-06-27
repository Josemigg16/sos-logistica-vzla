import { describe, expect, test } from "bun:test";
import { HUB_NEED_TYPES, hubNeedSchema, createHubSchema } from "./resources";

describe("HUB_NEED_TYPES", () => {
  test("contains the four supported categories", () => {
    expect(HUB_NEED_TYPES).toEqual(["TRANSPORT", "LABOR", "FUEL", "OTHER"]);
  });
});

describe("hubNeedSchema", () => {
  test("accepts a need with only type", () => {
    const result = hubNeedSchema.safeParse({ type: "TRANSPORT" });
    expect(result.success).toBe(true);
  });

  test("accepts a need with type and note", () => {
    const result = hubNeedSchema.safeParse({
      type: "FUEL",
      note: "Diesel, 200 lts",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an unknown need type", () => {
    const result = hubNeedSchema.safeParse({ type: "WATER" });
    expect(result.success).toBe(false);
  });

  test("trims note and rejects notes over 280 chars", () => {
    const result = hubNeedSchema.safeParse({
      type: "OTHER",
      note: "x".repeat(281),
    });
    expect(result.success).toBe(false);
  });
});

describe("createHubSchema with needs", () => {
  const base = {
    name: "Centro Plaza Bolívar",
    address: "Av. principal",
    contact: "Juan Pérez",
    type: "COLLECTION" as const,
    latitude: 10.4806,
    longitude: -66.9036,
  };

  test("defaults needs to empty array when omitted", () => {
    const result = createHubSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.needs).toEqual([]);
    }
  });

  test("accepts hub with needs array", () => {
    const result = createHubSchema.safeParse({
      ...base,
      needs: [
        { type: "TRANSPORT", note: "Camión 350" },
        { type: "LABOR" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects duplicate need types", () => {
    const result = createHubSchema.safeParse({
      ...base,
      needs: [
        { type: "TRANSPORT" },
        { type: "TRANSPORT", note: "otro" },
      ],
    });
    expect(result.success).toBe(false);
  });
});
