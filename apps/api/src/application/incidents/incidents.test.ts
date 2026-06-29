import { describe, test, expect, beforeEach } from "bun:test";
import type { CreateIncidentRequest } from "@sos/shared";
import { CreateIncident } from "./create-incident";
import { ListIncidents } from "./list-incidents";
import { UpdateIncident } from "./update-incident";
import { InMemoryIncidentRepository } from "../../infrastructure/persistence/in-memory-incident.repository";
import { IncidentNotFoundError } from "../../domain/incidents/errors";

const sample: CreateIncidentRequest = {
  title: "Inundación en El Valle",
  description: "Desbordamiento del río, viviendas afectadas",
  type: "Inundación",
  priority: "HIGH",
  zone: "El Valle",
  latitude: 10.45,
  longitude: -66.92,
};

describe("Incident use cases", () => {
  let repo: InMemoryIncidentRepository;
  let create: CreateIncident;
  let list: ListIncidents;
  let update: UpdateIncident;

  beforeEach(() => {
    repo = new InMemoryIncidentRepository();
    create = new CreateIncident(repo);
    list = new ListIncidents(repo);
    update = new UpdateIncident(repo);
  });

  test("crea una emergencia (status ACTIVE, id truthy, reportedById asignado)", async () => {
    const result = await create.execute(sample, "user-1");
    expect(result.id).toBeTruthy();
    expect(result.status).toBe("ACTIVE");
    expect(result.title).toBe(sample.title);
    expect(result.reportedById).toBe("user-1");
  });

  test("crea una emergencia sin reporter (reportedById null)", async () => {
    const result = await create.execute(sample, null);
    expect(result.reportedById).toBeNull();
  });

  test("lista emergencias", async () => {
    await create.execute(sample, "user-1");
    await create.execute(sample, "user-2");
    const all = await list.execute();
    expect(all).toHaveLength(2);
  });

  test("actualiza campos de una emergencia", async () => {
    const created = await create.execute(sample, "user-1");
    const updated = await update.execute(created.id, {
      title: "Inundación severa",
      priority: "CRITICAL",
    });
    expect(updated.title).toBe("Inundación severa");
    expect(updated.priority).toBe("CRITICAL");
  });

  test("cierra una emergencia cambiando status a CLOSED vía update", async () => {
    const created = await create.execute(sample, "user-1");
    const updated = await update.execute(created.id, { status: "CLOSED" });
    expect(updated.status).toBe("CLOSED");
  });

  test("lanza IncidentNotFoundError al actualizar id inexistente", async () => {
    await expect(
      update.execute("bad-id", { status: "CLOSED" }),
    ).rejects.toBeInstanceOf(IncidentNotFoundError);
  });
});
