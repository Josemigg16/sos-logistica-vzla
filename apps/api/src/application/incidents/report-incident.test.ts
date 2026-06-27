import { beforeEach, describe, expect, test } from "bun:test";
import { ReportIncident } from "./report-incident";
import { ListIncidents } from "./list-incidents";
import { InMemoryIncidentRepository } from "../../infrastructure/persistence/in-memory-incident.repository";

describe("ReportIncident", () => {
  let incidents: InMemoryIncidentRepository;
  let report: ReportIncident;

  beforeEach(() => {
    incidents = new InMemoryIncidentRepository();
    report = new ReportIncident(incidents);
  });

  test("registra un incidente ACTIVE y devuelve su forma pública", async () => {
    const result = await report.execute({
      title: "Deslizamiento en El Junquito",
      description: "Vía bloqueada, casas en riesgo",
      type: "Deslizamiento",
      priority: "HIGH",
      zone: "El Junquito",
      latitude: 10.5,
      longitude: -67.1,
      reportedById: "u-7",
    });

    expect(result.status).toBe("ACTIVE");
    expect(result.priority).toBe("HIGH");
    expect(result.reportedById).toBe("u-7");
    expect(await incidents.findById(result.id)).not.toBeNull();
  });

  test("reportedById es opcional (reporte anónimo)", async () => {
    const result = await report.execute({
      title: "Corte de agua zona alta",
      description: "Sin servicio hace 3 días",
      type: "Servicios",
      priority: "MEDIUM",
      zone: "Petare",
      latitude: 10.4,
      longitude: -66.8,
    });
    expect(result.reportedById).toBeNull();
  });
});

describe("ListIncidents", () => {
  test("lista los incidentes registrados", async () => {
    const incidents = new InMemoryIncidentRepository();
    const report = new ReportIncident(incidents);
    const list = new ListIncidents(incidents);

    await report.execute({
      title: "Incendio forestal",
      description: "Avanza hacia zona poblada",
      type: "Incendio",
      priority: "CRITICAL",
      zone: "Ávila",
      latitude: 10.5,
      longitude: -66.9,
    });

    const all = await list.execute();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe("Incendio forestal");
  });
});
