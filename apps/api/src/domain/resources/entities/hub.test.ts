import { describe, expect, test } from "bun:test";
import { Hub } from "./hub";

describe("Hub.register", () => {
  const base = {
    id: "hub-1",
    name: "Centro Plaza",
    address: "Av. Bolívar",
    contact: "Juan",
    type: "COLLECTION" as const,
    latitude: 10.4806,
    longitude: -66.9036,
  };

  test("defaults needs to empty array", () => {
    const hub = Hub.register(base);
    expect(hub.toPublic().needs).toEqual([]);
  });

  test("preserves needs when supplied", () => {
    const hub = Hub.register({
      ...base,
      needs: [
        { type: "TRANSPORT", note: "Camión 350" },
        { type: "LABOR" },
      ],
    });
    const pub = hub.toPublic();
    expect(pub.needs).toHaveLength(2);
    expect(pub.needs[0]).toEqual({ type: "TRANSPORT", note: "Camión 350" });
    expect(pub.needs[1]).toEqual({ type: "LABOR" });
  });
});

describe("Hub.rehydrate", () => {
  test("round-trips needs through rehydrate → toPublic", () => {
    const hub = Hub.rehydrate({
      id: "hub-2",
      name: "Centro",
      address: "Av.",
      contact: "Ana",
      type: "DISPATCH",
      status: "ACTIVO",
      latitude: 10,
      longitude: -66,
      coordinatorId: null,
      createdAt: new Date(),
      isInformal: false,
      needs: [{ type: "FUEL", note: "Diesel" }],
    });
    expect(hub.toPublic().needs).toEqual([{ type: "FUEL", note: "Diesel" }]);
  });
});
