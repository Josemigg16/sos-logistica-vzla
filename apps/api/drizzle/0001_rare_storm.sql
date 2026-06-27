CREATE TYPE "public"."hub_type" AS ENUM('COLLECTION', 'DISPATCH', 'DESTINATION');--> statement-breakpoint
CREATE TYPE "public"."inventory_category" AS ENUM('Víveres', 'Medicamentos', 'Higiene personal', 'Abrigo y refugio', 'Herramientas', 'Productos de limpieza', 'Artículos para bebés y grupos vulnerables');--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"address" varchar(255) NOT NULL,
	"contact" varchar(120) NOT NULL,
	"type" "hub_type" NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"category" "inventory_category" NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" varchar(40) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;