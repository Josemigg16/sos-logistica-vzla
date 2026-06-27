import { describe, it, expect, beforeEach } from "bun:test";
import { ChangeHubStatus } from "./change-hub-status";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { Hub } from "../../domain/resources/entities/hub";
import { HubNotFoundError } from "../../domain/resources/errors";

describe("ChangeHubStatus", () => {
  let hubs: InMemoryHubRepository;
  let useCase: ChangeHubStatus;

  beforeEach(() => {
    hubs = new InMemoryHubRepository();
    useCase = new ChangeHubStatus(hubs);
  });

  it("activa un hub que estaba inactivo", async () => {
    const hub = Hub.register({
      id: "hub-1",
      name: "Centro Test",
      address: "Av. 1",
      contact: "+58 412 0000000",
      type: "COLLECTION",
      status: "INACTIVO",
      latitude: 9.5,
      longitude: -69.2,
    });
    await hubs.save(hub);

    const result = await useCase.execute({ hubId: "hub-1", status: "ACTIVO" });

    expect(result.status).toBe("ACTIVO");
    const reloaded = await hubs.findById("hub-1");
    expect(reloaded?.isActive).toBe(true);
  });

  it("desactiva un hub que estaba activo", async () => {
    const hub = Hub.register({
      id: "hub-2",
      name: "Centro Test",
      address: "Av. 1",
      contact: "+58 412 0000000",
      type: "COLLECTION",
      latitude: 9.5,
      longitude: -69.2,
    });
    await hubs.save(hub);

    const result = await useCase.execute({ hubId: "hub-2", status: "INACTIVO" });

    expect(result.status).toBe("INACTIVO");
    const reloaded = await hubs.findById("hub-2");
    expect(reloaded?.isActive).toBe(false);
  });

  it("lanza HubNotFoundError si el hub no existe", async () => {
    await expect(
      useCase.execute({ hubId: "missing", status: "ACTIVO" }),
    ).rejects.toBeInstanceOf(HubNotFoundError);
  });
});
