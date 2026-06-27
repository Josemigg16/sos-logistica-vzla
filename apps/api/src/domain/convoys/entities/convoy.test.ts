import { describe, expect, test, beforeEach } from "bun:test";
import { Convoy } from "./convoy";
import { ConvoyDomainError, InvalidConvoyTransitionError } from "../errors";

/**
 * T03 (RED) / T04 (GREEN): Convoy aggregate + FSM tests.
 * REQ-01 (S01.1–S01.5): entity creation invariants
 * REQ-02 (S02.1–S02.4): valid FSM transitions
 * REQ-03 (S03.1–S03.9): invalid FSM transitions must throw
 */

const VALID_INPUT = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  origenId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  destinoId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  escoltaId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  vehicleIds: ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"],
};

function makePlanificado(): Convoy {
  return Convoy.create(VALID_INPUT);
}

function makeEnRuta(): Convoy {
  const c = makePlanificado();
  c.dispatch();
  return c;
}

function makeEntregado(): Convoy {
  const c = makeEnRuta();
  c.deliver();
  return c;
}

function makeRecibido(): Convoy {
  const c = makeEntregado();
  c.confirmArrival();
  return c;
}

function makeCancelado(): Convoy {
  const c = makePlanificado();
  c.cancel();
  return c;
}

// ────────────────────────────────────────────────────────────────────────────
// REQ-01: Convoy aggregate creation invariants
// ────────────────────────────────────────────────────────────────────────────

describe("Convoy.create — REQ-01", () => {
  test("S01.1 — creates with status PLANIFICADO and timestamps", () => {
    const before = new Date();
    const c = makePlanificado();
    const after = new Date();

    expect(c.status).toBe("PLANIFICADO");
    expect(c.id).toBe(VALID_INPUT.id);
    expect(c.origenId).toBe(VALID_INPUT.origenId);
    expect(c.destinoId).toBe(VALID_INPUT.destinoId);
    expect(c.escoltaId).toBe(VALID_INPUT.escoltaId);
    expect(c.vehicleIds).toEqual(VALID_INPUT.vehicleIds);
    expect(c.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(c.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test("S01.2 — throws SAME_ORIGIN_DESTINATION when origenId === destinoId", () => {
    expect(() =>
      Convoy.create({ ...VALID_INPUT, destinoId: VALID_INPUT.origenId }),
    ).toThrow(ConvoyDomainError);

    try {
      Convoy.create({ ...VALID_INPUT, destinoId: VALID_INPUT.origenId });
    } catch (e) {
      expect((e as ConvoyDomainError).code).toBe("SAME_ORIGIN_DESTINATION");
    }
  });

  test("S01.3 — throws NO_VEHICLES when vehicleIds is empty", () => {
    expect(() =>
      Convoy.create({ ...VALID_INPUT, vehicleIds: [] }),
    ).toThrow(ConvoyDomainError);

    try {
      Convoy.create({ ...VALID_INPUT, vehicleIds: [] });
    } catch (e) {
      expect((e as ConvoyDomainError).code).toBe("NO_VEHICLES");
    }
  });

  test("S01.4 — throws DUPLICATE_VEHICLE when vehicleIds contains duplicates", () => {
    const dupId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    expect(() =>
      Convoy.create({ ...VALID_INPUT, vehicleIds: [dupId, dupId] }),
    ).toThrow(ConvoyDomainError);

    try {
      Convoy.create({ ...VALID_INPUT, vehicleIds: [dupId, dupId] });
    } catch (e) {
      expect((e as ConvoyDomainError).code).toBe("DUPLICATE_VEHICLE");
    }
  });

  test("S01.5 — status can only be changed via FSM methods", () => {
    const c = makePlanificado();
    // Status getter exists and returns correct value
    expect(c.status).toBe("PLANIFICADO");
    // After FSM method, status changes
    c.dispatch();
    expect(c.status).toBe("EN_RUTA");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-02: Valid FSM transitions
// ────────────────────────────────────────────────────────────────────────────

describe("Convoy FSM valid transitions — REQ-02", () => {
  test("S02.1 — dispatch(): PLANIFICADO → EN_RUTA, updatedAt refreshed", () => {
    const c = makePlanificado();
    const beforeUpdate = c.updatedAt;
    c.dispatch();
    expect(c.status).toBe("EN_RUTA");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  test("S02.2 — deliver(): EN_RUTA → ENTREGADO, updatedAt refreshed", () => {
    const c = makeEnRuta();
    const beforeUpdate = c.updatedAt;
    c.deliver();
    expect(c.status).toBe("ENTREGADO");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  test("S02.3 — cancel(): PLANIFICADO → CANCELADO, updatedAt refreshed", () => {
    const c = makePlanificado();
    const beforeUpdate = c.updatedAt;
    c.cancel();
    expect(c.status).toBe("CANCELADO");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  test("S02.4 — cancel(): EN_RUTA → CANCELADO, updatedAt refreshed", () => {
    const c = makeEnRuta();
    const beforeUpdate = c.updatedAt;
    c.cancel();
    expect(c.status).toBe("CANCELADO");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  test("S02.5 — confirmArrival(): ENTREGADO → RECIBIDO, updatedAt refreshed", () => {
    const c = makeEntregado();
    const beforeUpdate = c.updatedAt;
    c.confirmArrival();
    expect(c.status).toBe("RECIBIDO");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });
});

// ────────────────────────────────────────────────────────────────────────────
// REQ-03: Invalid FSM transitions must throw InvalidConvoyTransitionError
// ────────────────────────────────────────────────────────────────────────────

describe("Convoy FSM invalid transitions — REQ-03", () => {
  test("S03.1 — cannot dispatch() an EN_RUTA convoy", () => {
    expect(() => makeEnRuta().dispatch()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.2 — cannot dispatch() an ENTREGADO convoy", () => {
    expect(() => makeEntregado().dispatch()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.3 — cannot dispatch() a CANCELADO convoy", () => {
    expect(() => makeCancelado().dispatch()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.4 — cannot deliver() a PLANIFICADO convoy", () => {
    expect(() => makePlanificado().deliver()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.5 — cannot deliver() an ENTREGADO convoy", () => {
    expect(() => makeEntregado().deliver()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.6 — cannot deliver() a CANCELADO convoy", () => {
    expect(() => makeCancelado().deliver()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.7 — cannot cancel() an ENTREGADO convoy", () => {
    expect(() => makeEntregado().cancel()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.8 — cannot cancel() a CANCELADO convoy", () => {
    expect(() => makeCancelado().cancel()).toThrow(InvalidConvoyTransitionError);
  });

  test("S03.9 — FSM exhaustiveness: full 5×4 status×method matrix asserted programmatically", () => {
    // For each (status, method) cell we declare the expected outcome:
    // "valid" → method must NOT throw (transition succeeds)
    // "throws" → method MUST throw InvalidConvoyTransitionError

    type MethodName = "dispatch" | "deliver" | "confirmArrival" | "cancel";

    const matrix: Array<{
      factory: () => Convoy;
      method: MethodName;
      expected: "valid" | "throws";
      label: string;
    }> = [
      // dispatch()
      { factory: makePlanificado, method: "dispatch", expected: "valid",  label: "dispatch(PLANIFICADO) → EN_RUTA" },
      { factory: makeEnRuta,      method: "dispatch", expected: "throws", label: "dispatch(EN_RUTA) → throws" },
      { factory: makeEntregado,   method: "dispatch", expected: "throws", label: "dispatch(ENTREGADO) → throws" },
      { factory: makeRecibido,    method: "dispatch", expected: "throws", label: "dispatch(RECIBIDO) → throws" },
      { factory: makeCancelado,   method: "dispatch", expected: "throws", label: "dispatch(CANCELADO) → throws" },
      // deliver()
      { factory: makeEnRuta,      method: "deliver", expected: "valid",  label: "deliver(EN_RUTA) → ENTREGADO" },
      { factory: makePlanificado, method: "deliver", expected: "throws", label: "deliver(PLANIFICADO) → throws" },
      { factory: makeEntregado,   method: "deliver", expected: "throws", label: "deliver(ENTREGADO) → throws" },
      { factory: makeRecibido,    method: "deliver", expected: "throws", label: "deliver(RECIBIDO) → throws" },
      { factory: makeCancelado,   method: "deliver", expected: "throws", label: "deliver(CANCELADO) → throws" },
      // confirmArrival()
      { factory: makeEntregado,   method: "confirmArrival", expected: "valid",  label: "confirmArrival(ENTREGADO) → RECIBIDO" },
      { factory: makePlanificado, method: "confirmArrival", expected: "throws", label: "confirmArrival(PLANIFICADO) → throws" },
      { factory: makeEnRuta,      method: "confirmArrival", expected: "throws", label: "confirmArrival(EN_RUTA) → throws" },
      { factory: makeRecibido,    method: "confirmArrival", expected: "throws", label: "confirmArrival(RECIBIDO) → throws" },
      { factory: makeCancelado,   method: "confirmArrival", expected: "throws", label: "confirmArrival(CANCELADO) → throws" },
      // cancel()
      { factory: makePlanificado, method: "cancel", expected: "valid",  label: "cancel(PLANIFICADO) → CANCELADO" },
      { factory: makeEnRuta,      method: "cancel", expected: "valid",  label: "cancel(EN_RUTA) → CANCELADO" },
      { factory: makeEntregado,   method: "cancel", expected: "throws", label: "cancel(ENTREGADO) → throws" },
      { factory: makeRecibido,    method: "cancel", expected: "throws", label: "cancel(RECIBIDO) → throws" },
      { factory: makeCancelado,   method: "cancel", expected: "throws", label: "cancel(CANCELADO) → throws" },
    ];

    // Exactly 20 cells — every status × every method
    expect(matrix).toHaveLength(20);

    for (const { factory, method, expected, label } of matrix) {
      const convoy = factory();
      if (expected === "valid") {
        expect(() => convoy[method](), label).not.toThrow();
      } else {
        expect(() => convoy[method](), label).toThrow(InvalidConvoyTransitionError);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// addVehicle — only allowed in PLANIFICADO (per design risk note in T04)
// ────────────────────────────────────────────────────────────────────────────

describe("Convoy.addVehicle", () => {
  test("adds a new vehicleId when PLANIFICADO", () => {
    const c = makePlanificado();
    const newVehicle = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    c.addVehicle(newVehicle);
    expect(c.vehicleIds).toContain(newVehicle);
  });

  test("throws DUPLICATE_VEHICLE if vehicleId already exists", () => {
    const c = makePlanificado();
    const existing = VALID_INPUT.vehicleIds[0]!;
    expect(() => c.addVehicle(existing)).toThrow(ConvoyDomainError);
    try {
      c.addVehicle(existing);
    } catch (e) {
      expect((e as ConvoyDomainError).code).toBe("DUPLICATE_VEHICLE");
    }
  });

  test("throws CONVOY_NOT_PLANIFICADO if not in PLANIFICADO state", () => {
    const c = makeEnRuta();
    expect(() => c.addVehicle("ffffffff-ffff-ffff-ffff-ffffffffffff")).toThrow(
      ConvoyDomainError,
    );
    try {
      c.addVehicle("ffffffff-ffff-ffff-ffff-ffffffffffff");
    } catch (e) {
      expect((e as ConvoyDomainError).code).toBe("CONVOY_NOT_PLANIFICADO");
    }
  });
});
