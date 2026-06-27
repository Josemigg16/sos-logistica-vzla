import { describe, expect, test } from "bun:test";
import { createConvoySchema, addVehicleSchema, CONVOY_STATUSES } from "./convoys";

/**
 * T01 (RED) / T02 (GREEN): Shared types for the convoys bounded context.
 * REQ-11: S11.1 + S11.2
 */

describe("createConvoySchema", () => {
  const validInput = {
    origenId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    destinoId: "b2c3d4e5-f6a7-8901-bcde-f01234567891",
    escoltaId: "c3d4e5f6-a7b8-9012-cdef-012345678912",
    vehicleIds: ["d4e5f6a7-b8c9-0123-defa-123456789013"],
  };

  test("S11.1 — rejects empty vehicleIds", () => {
    const result = createConvoySchema.safeParse({
      ...validInput,
      vehicleIds: [],
    });
    expect(result.success).toBe(false);
  });

  test("S11.2 — rejects non-UUID origenId", () => {
    const result = createConvoySchema.safeParse({
      ...validInput,
      origenId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  test("accepts valid input with one vehicle", () => {
    const result = createConvoySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe("CONVOY_STATUSES", () => {
  test("contains exactly the five FSM states", () => {
    expect(CONVOY_STATUSES).toEqual([
      "PLANIFICADO",
      "EN_RUTA",
      "ENTREGADO",
      "RECIBIDO",
      "CANCELADO",
    ]);
  });
});

describe("addVehicleSchema", () => {
  test("rejects non-UUID vehicleId", () => {
    const result = addVehicleSchema.safeParse({ vehicleId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  test("accepts valid UUID vehicleId", () => {
    const result = addVehicleSchema.safeParse({
      vehicleId: "d4e5f6a7-b8c9-0123-defa-123456789013",
    });
    expect(result.success).toBe(true);
  });
});
