import type { CreateConvoyRequest, HubStatus, HubType, RoleName } from "@sos/shared";
import { beforeEach, describe, expect, test } from "bun:test";
import { PlanConvoy } from "./plan-convoy";
import { ConvoyError } from "../../domain/convoys/errors";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { Hub } from "../../domain/resources/entities/hub";
import { InMemoryConvoyRepository } from "../../infrastructure/persistence/in-memory-convoy.repository";
import { InMemoryHubRepository } from "../../infrastructure/persistence/in-memory-hub.repository";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";

describe("PlanConvoy", () => {
  let convoys: InMemoryConvoyRepository;
  let hubs: InMemoryHubRepository;
  let plan: PlanConvoy;

  beforeEach(() => {
    convoys = new InMemoryConvoyRepository();
    hubs = new InMemoryHubRepository();
    plan = new PlanConvoy(convoys, hubs);
  });

  test("planifica un convoy cuando origen y destino son válidos", async () => {
    const command = await seedValidPlanningContext();

    const convoy = await plan.execute(command);

    expect(convoy.id).toBeTruthy();
    expect(convoy.origenId).toBe(command.origenId);
    expect(convoy.destinoId).toBe(command.destinoId);
    expect(convoy.escoltaNombre).toBe(command.escoltaNombre);
    expect(convoy.escoltaCedula).toBe(command.escoltaCedula);
    expect(convoy.vehicleIds).toEqual(command.vehicleIds);
    expect(convoy.status).toBe("PLANIFICADO");
    expect(await convoys.findById(convoy.id)).not.toBeNull();
  });

  test("rechaza planificar si no existe el hub de origen", async () => {
    const command = await seedValidPlanningContext();
    await hubs.delete(command.origenId);

    await expectConvoyError(plan.execute(command), "ORIGIN_HUB_NOT_FOUND");
  });

  test("rechaza planificar si el origen no es DISPATCH", async () => {
    const command = await seedValidPlanningContext({ originType: "COLLECTION" });

    await expectConvoyError(plan.execute(command), "ORIGIN_NOT_DISPATCH");
  });

  test("rechaza planificar si no existe el hub de destino", async () => {
    const command = await seedValidPlanningContext();
    await hubs.delete(command.destinoId);

    await expectConvoyError(plan.execute(command), "DESTINATION_HUB_NOT_FOUND");
  });

  test("rechaza planificar si el destino no es DESTINATION", async () => {
    const command = await seedValidPlanningContext({ destinationType: "DISPATCH" });

    await expectConvoyError(plan.execute(command), "DESTINATION_NOT_DESTINATION");
  });

  test("rechaza planificar si el hub de origen está INACTIVO", async () => {
    const command = await seedValidPlanningContext({ originStatus: "INACTIVO" });

    await expectConvoyError(plan.execute(command), "ORIGIN_HUB_INACTIVE");
  });

  test("rechaza planificar si el hub de destino está INACTIVO", async () => {
    const command = await seedValidPlanningContext({ destinationStatus: "INACTIVO" });

    await expectConvoyError(plan.execute(command), "DESTINATION_HUB_INACTIVE");
  });

  async function seedValidPlanningContext(overrides: {
    originType?: HubType;
    destinationType?: HubType;
    originStatus?: HubStatus;
    destinationStatus?: HubStatus;
  } = {}): Promise<CreateConvoyRequest> {
    const origin = buildHub({
      type: overrides.originType ?? "DISPATCH",
      status: overrides.originStatus,
    });
    const destination = buildHub({
      type: overrides.destinationType ?? "DESTINATION",
      status: overrides.destinationStatus,
    });

    await hubs.save(origin);
    await hubs.save(destination);

    return {
      origenId: origin.id,
      destinoId: destination.id,
      escoltaNombre: "Juan Perez",
      escoltaCedula: "V-12345678",
      vehicleIds: [crypto.randomUUID()],
    };
  }
});

function buildHub(input: { type: HubType; status?: HubStatus }): Hub {
  return Hub.register({
    id: crypto.randomUUID(),
    name: `Hub ${input.type}`,
    address: "Av. Principal",
    contact: "0212-555",
    type: input.type,
    status: input.status ?? "ACTIVO",
    latitude: 10.5,
    longitude: -66.9,
  });
}

function buildUser(input: { role: RoleName }): User {
  return User.register({
    id: crypto.randomUUID(),
    username: `user-${crypto.randomUUID()}`,
    credential: Credential.fromHash("hash"),
    role: Role.create(input.role),
    email: "zodi@example.com",
  });
}

async function expectConvoyError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Se esperaba ConvoyError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ConvoyError);
    expect((error as ConvoyError).code).toBe(code);
  }
}
