-- 1. Drop FK from vehiculos → choferes (to allow dropping the table)
ALTER TABLE "vehiculos" DROP CONSTRAINT "vehiculos_chofer_id_choferes_id_fk";
--> statement-breakpoint

-- 2. Drop old choferes table (was linked to users.id)
DROP TABLE "choferes";
--> statement-breakpoint

-- 3. Recreate choferes as standalone record (not tied to a user account)
CREATE TABLE "choferes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"apellido" varchar(80) NOT NULL,
	"cedula" varchar(20) NOT NULL,
	"licencia" text NOT NULL,
	"telefono" text NOT NULL,
	"disponible" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "choferes_cedula_unique" UNIQUE("cedula")
);
--> statement-breakpoint

-- 4. Re-add FK from vehiculos → new choferes
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_chofer_id_choferes_id_fk"
	FOREIGN KEY ("chofer_id") REFERENCES "choferes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 5. Extend users with profile fields for coordinators
ALTER TABLE "users" ADD COLUMN "cedula" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telefono" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cedula_unique" UNIQUE("cedula");
--> statement-breakpoint

-- 6. Link hubs to their coordinator user
ALTER TABLE "hubs" ADD COLUMN "coordinator_id" uuid;
--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_coordinator_id_users_id_fk"
	FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 7. Lotes (batches of cargo, vehicle-centric)
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_origen_id" uuid NOT NULL,
	"hub_destino_id" uuid,
	"vehiculo_id" uuid,
	"estado" "estado_lote" NOT NULL DEFAULT 'EMBALADO',
	"nota" text,
	"peso_total_kg" double precision NOT NULL DEFAULT 0,
	"creado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_hub_origen_id_hubs_id_fk"
	FOREIGN KEY ("hub_origen_id") REFERENCES "hubs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_hub_destino_id_hubs_id_fk"
	FOREIGN KEY ("hub_destino_id") REFERENCES "hubs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_vehiculo_id_vehiculos_id_fk"
	FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_creado_por_id_users_id_fk"
	FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 8. Lote items (products inside a batch)
CREATE TABLE "lote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"cantidad" integer NOT NULL,
	"peso_kg" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lote_items" ADD CONSTRAINT "lote_items_lote_id_lotes_id_fk"
	FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lote_items" ADD CONSTRAINT "lote_items_product_id_products_id_fk"
	FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- 9. Lote transfers (between vehicles)
CREATE TABLE "lote_traspasos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"vehiculo_origen_id" uuid,
	"vehiculo_destino_id" uuid NOT NULL,
	"motivo" text NOT NULL DEFAULT '',
	"autorizado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_lote_id_lotes_id_fk"
	FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_vehiculo_origen_id_vehiculos_id_fk"
	FOREIGN KEY ("vehiculo_origen_id") REFERENCES "vehiculos"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_vehiculo_destino_id_vehiculos_id_fk"
	FOREIGN KEY ("vehiculo_destino_id") REFERENCES "vehiculos"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lote_traspasos" ADD CONSTRAINT "lote_traspasos_autorizado_por_id_users_id_fk"
	FOREIGN KEY ("autorizado_por_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
