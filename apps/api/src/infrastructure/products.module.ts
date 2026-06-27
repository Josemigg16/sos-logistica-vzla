import { CreateProduct } from "../application/resources/create-product";
import { ListProducts } from "../application/resources/list-products";
import { UpdateProduct } from "../application/resources/update-product";
import { DeleteProduct } from "../application/resources/delete-product";
import { DrizzleProductRepository } from "./persistence/drizzle-product.repository";
import { createProductRoutes } from "./http/products.routes";

/**
 * Composition root del slice `products` (bounded context `resources`).
 */
export function createProductsModule() {
  const products = new DrizzleProductRepository();

  const useCases = {
    createProduct: new CreateProduct(products),
    listProducts: new ListProducts(products),
    updateProduct: new UpdateProduct(products),
    deleteProduct: new DeleteProduct(products),
  };

  return {
    useCases,
    routes: createProductRoutes(useCases),
  };
}
