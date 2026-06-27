import { describe, expect, test } from "bun:test";
import { Lote } from "./lote";
import { LoteNotInTransitError } from "../errors";

describe("Lote.assignToConvoy", () => {
  const createLoteInState = (estado: "EMBALADO" | "EN_TRANSITO" | "ENTREGADO" | "RECIBIDO") => {
    return Lote.rehydrate({
      id: "lote-1",
      hubOrigenId: "hub-1",
      hubOrigenNombre: "Hub 1",
      hubDestinoId: "hub-2",
      hubDestinoNombre: "Hub 2",
      vehiculoId: "veh-1",
      vehiculoPlaca: "ABC-123",
      convoyId: null,
      estado,
      nota: null,
      pesoTotalKg: 100,
      creadoPorId: "user-1",
      confirmadoPorId: null,
      confirmadoEn: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  test("assigns convoyId successfully when EN_TRANSITO", () => {
    const lote = createLoteInState("EN_TRANSITO");
    lote.assignToConvoy("convoy-123");
    expect(lote.convoyId).toBe("convoy-123");
  });

  test("throws LoteNotInTransitError when EMBALADO", () => {
    const lote = createLoteInState("EMBALADO");
    expect(() => lote.assignToConvoy("convoy-123")).toThrow(LoteNotInTransitError);
  });

  test("throws LoteNotInTransitError when ENTREGADO", () => {
    const lote = createLoteInState("ENTREGADO");
    expect(() => lote.assignToConvoy("convoy-123")).toThrow(LoteNotInTransitError);
  });

  test("throws LoteNotInTransitError when RECIBIDO", () => {
    const lote = createLoteInState("RECIBIDO");
    expect(() => lote.assignToConvoy("convoy-123")).toThrow(LoteNotInTransitError);
  });
});
