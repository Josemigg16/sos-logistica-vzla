import { beforeEach, describe, expect, test } from "bun:test";
import type { RoleName } from "@sos/shared";
import { ListEscorts } from "./list-escorts";
import { User } from "../../domain/identity/entities/user";
import { Credential } from "../../domain/identity/value-objects/credential";
import { Role } from "../../domain/identity/value-objects/role";
import { InMemoryUserRepository } from "../../infrastructure/persistence/in-memory-user.repository";

function makeUser(id: string, username: string, role: RoleName): User {
  return User.register({
    id,
    username,
    credential: Credential.fromHash("hash"),
    role: Role.create(role),
    email: `${username}@example.com`,
  });
}

describe("ListEscorts", () => {
  let users: InMemoryUserRepository;
  let listEscorts: ListEscorts;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    listEscorts = new ListEscorts(users);
  });

  test("returns only ZODI_SENDER users mapped to id + username", async () => {
    await users.save(makeUser("11111111-1111-1111-1111-111111111111", "escolta-uno", "ZODI_SENDER"));
    await users.save(makeUser("22222222-2222-2222-2222-222222222222", "admin", "ADMIN"));
    await users.save(makeUser("33333333-3333-3333-3333-333333333333", "escolta-dos", "ZODI_SENDER"));

    const result = await listEscorts.execute();

    expect(result).toEqual([
      { id: "11111111-1111-1111-1111-111111111111", username: "escolta-uno" },
      { id: "33333333-3333-3333-3333-333333333333", username: "escolta-dos" },
    ]);
  });

  test("returns an empty list when no ZODI_SENDER exists", async () => {
    await users.save(makeUser("22222222-2222-2222-2222-222222222222", "admin", "ADMIN"));

    const result = await listEscorts.execute();

    expect(result).toEqual([]);
  });
});
