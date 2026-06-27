ALTER TYPE "public"."hub_type" ADD VALUE 'ZODI_BASE';--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_batches" integer NOT NULL,
	"source_hub_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipos_vehiculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_vehiculo_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "lote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"cantidad" integer NOT NULL,
	"peso_kg" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lote_traspasos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"vehiculo_origen_id" uuid,
	"vehiculo_destino_id" uuid NOT NULL,
	"motivo" text DEFAULT '' NOT NULL,
	"autorizado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_origen_id" uuid NOT NULL,
	"hub_destino_id" uuid,
	"vehiculo_id" uuid,
	"estado" "estado_lote" DEFAULT 'EMBALADO' NOT NULL,
	"nota" text,
	"peso_total_kg" double precision DEFAULT 0 NOT NULL,
	"creado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "needs" DROP CONSTRAINT "needs_hub_id_hubs_id_fk";
--> statement-breakpoint
ALTER TABLE "choferes" DROP CONSTRAINT "choferes_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "needs" ALTER COLUMN "hub_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "choferes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cedula" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telefono" varchar(20);--> statement-breakpoint
ALTER TABLE "hubs" ADD COLUMN "coordinator_id" uuid;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "choferes" ADD COLUMN "nombre" varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE "choferes" ADD COLUMN "apellido" varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE "choferes" ADD COLUMN "cedula" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD COLUMN "tipo_vehiculo_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_source_hub_id_hubs_id_fk" FOREIGN KEY ("source_hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_items" ADD CONSTRAINT "lote_items_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_items" ADD CONSTRAINT "lote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_vehiculo_origen_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_origen_id") REFERENCES "public"."vehiculos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_vehiculo_destino_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_destino_id") REFERENCES "public"."vehiculos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_autorizado_por_id_users_id_fk" FOREIGN KEY ("autorizado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_hub_origen_id_hubs_id_fk" FOREIGN KEY ("hub_origen_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_hub_destino_id_hubs_id_fk" FOREIGN KEY ("hub_destino_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_creado_por_id_users_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cedula_unique" UNIQUE("cedula");--> statement-breakpoint
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_cedula_unique" UNIQUE("cedula");