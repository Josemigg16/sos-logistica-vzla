import { describe, expect, test, beforeEach } from "bun:test";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { Hub } from "../../domain/resources/entities/hub";
import { UpdateHubNeeds } from "./update-hub-needs";
import { ResourceError } from "../../domain/resources/errors";

describe("UpdateHubNeeds", () => {
  let hubs: InMemoryHubRepository;
  let useCase: UpdateHubNeeds;

  beforeEach(() => {
    hubs = new InMemoryHubRepository();
    useCase = new UpdateHubNeeds(hubs);
  });

  test("replaces the needs of an existing hub", async () => {
    const hub = Hub.register({
      id: "hub-1",
      name: "Centro",
      address: "Av.",
      contact: "x",
      type: "COLLECTION",
      latitude: 10,
      longitude: -66,
      needs: [{ type: "TRANSPORT" }],
    });
    await hubs.save(hub);

    const result = await useCase.execute({
      hubId: "hub-1",
      needs: [{ type: "FUEL", note: "diesel" }],
    });

    expect(result.needs).toEqual([{ type: "FUEL", note: "diesel" }]);
    const stored = await hubs.findById("hub-1");
    expect(stored?.toPublic().needs).toEqual([{ type: "FUEL", note: "diesel" }]);
  });

  test("throws HUB_NOT_FOUND for an unknown id", async () => {
    expect(
      useCase.execute({ hubId: "missing", needs: [] }),
    ).rejects.toBeInstanceOf(ResourceError);
  });
});
