-- Inventario a nivel de producto: cada fila de stock referencia un producto del
-- catálogo. La categoría/unidad se derivan del producto. Nullable para no romper
-- filas históricas agregadas por categoría.
ALTER TABLE "resources" ADD COLUMN "product_id" uuid;
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
