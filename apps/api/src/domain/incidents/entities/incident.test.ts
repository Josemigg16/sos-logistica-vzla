import { describe, expect, test } from "bun:test";
import { Incident } from "./incident";
import { Priority } from "../value-objects/priority";
import { IncidentAlreadyClosedError } from "../errors";

function buildIncident() {
  return Incident.report({
    id: "inc-1",
    title: "Inundación en La Guaira",
    description: "Desborde del río, viviendas afectadas",
    type: "Inundación",
    priority: Priority.create("CRITICAL"),
    zone: "La Guaira",
    latitude: 10.6,
    longitude: -66.9,
    reportedById: "u-1",
  });
}

describe("Incident", () => {
  test("se reporta ACTIVE por defecto", () => {
    const incident = buildIncident();
    expect(incident.status).toBe("ACTIVE");
    expect(incident.isOpen).toBe(true);
  });

  test("contain pasa de ACTIVE a CONTAINED", () => {
    const incident = buildIncident();
    incident.contain();
    expect(incident.status).toBe("CONTAINED");
    expect(incident.isOpen).toBe(true);
  });

  test("close cierra el incidente y lo vuelve terminal", () => {
    const incident = buildIncident();
    incident.close();
    expect(incident.status).toBe("CLOSED");
    expect(incident.isOpen).toBe(false);
  });

  test("no se puede cerrar dos veces", () => {
    const incident = buildIncident();
    incident.close();
    expect(() => incident.close()).toThrow(IncidentAlreadyClosedError);
  });

  test("no se puede contener un incidente cerrado", () => {
    const incident = buildIncident();
    incident.close();
    expect(() => incident.contain()).toThrow(IncidentAlreadyClosedError);
  });

  test("toPublic serializa la forma del boundary con fechas ISO", () => {
    const pub = buildIncident().toPublic();
    expect(pub.id).toBe("inc-1");
    expect(pub.priority).toBe("CRITICAL");
    expect(pub.status).toBe("ACTIVE");
    expect(pub.zone).toBe("La Guaira");
    expect(typeof pub.createdAt).toBe("string");
    expect(() => new Date(pub.createdAt).toISOString()).not.toThrow();
  });
});
