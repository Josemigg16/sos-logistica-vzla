import { describe, expect, test } from "bun:test";
import { Resource } from "./resource";
import { InventoryCategory } from "../value-objects/inventory-category";
import { InsufficientStockError } from "../errors";

function buildResource(quantity = 100) {
  return Resource.create({
    id: "res-1",
    hubId: "hub-1",
    category: InventoryCategory.create("Víveres"),
    quantity,
    unit: "kg",
  });
}

describe("Resource", () => {
  test("se crea con la cantidad inicial", () => {
    expect(buildResource(50).quantity).toBe(50);
  });

  test("addStock incrementa la cantidad disponible", () => {
    const resource = buildResource(10);
    resource.addStock(5);
    expect(resource.quantity).toBe(15);
  });

  test("removeStock descuenta cuando hay disponibilidad", () => {
    const resource = buildResource(10);
    resource.removeStock(4);
    expect(resource.quantity).toBe(6);
  });

  test("removeStock rechaza descontar más de lo disponible", () => {
    const resource = buildResource(3);
    expect(() => resource.removeStock(5)).toThrow(InsufficientStockError);
  });

  test("no admite cantidades negativas al mover stock", () => {
    const resource = buildResource(10);
    expect(() => resource.addStock(-1)).toThrow();
    expect(() => resource.removeStock(-1)).toThrow();
  });
});
