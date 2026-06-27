CREATE TYPE "public"."hub_status" AS ENUM('ACTIVO', 'INACTIVO');--> statement-breakpoint
CREATE TYPE "public"."convoy_status" AS ENUM('PLANIFICADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO');--> statement-breakpoint
ALTER TYPE "public"."estado_lote" ADD VALUE 'RECIBIDO';--> statement-breakpoint
CREATE TABLE "convoy_vehicles" (
	"convoy_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	CONSTRAINT "convoy_vehicles_convoy_id_vehicle_id_pk" PRIMARY KEY("convoy_id","vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "convoys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origen_id" uuid NOT NULL,
	"destino_id" uuid NOT NULL,
	"escolta_id" uuid NOT NULL,
	"status" "convoy_status" DEFAULT 'PLANIFICADO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hubs" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."hub_type";--> statement-breakpoint
CREATE TYPE "public"."hub_type" AS ENUM('COLLECTION', 'DISPATCH', 'DESTINATION');--> statement-breakpoint
ALTER TABLE "hubs" ALTER COLUMN "type" SET DATA TYPE "public"."hub_type" USING "type"::"public"."hub_type";--> statement-breakpoint
ALTER TABLE "hubs" ADD COLUMN "status" "hub_status" DEFAULT 'ACTIVO' NOT NULL;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "confirmado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "confirmado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "convoy_vehicles" ADD CONSTRAINT "convoy_vehicles_convoy_id_convoys_id_fk" FOREIGN KEY ("convoy_id") REFERENCES "public"."convoys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convoy_vehicles" ADD CONSTRAINT "convoy_vehicles_vehicle_id_vehiculos_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehiculos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_origen_id_hubs_id_fk" FOREIGN KEY ("origen_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_destino_id_hubs_id_fk" FOREIGN KEY ("destino_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_escolta_id_users_id_fk" FOREIGN KEY ("escolta_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_confirmado_por_id_users_id_fk" FOREIGN KEY ("confirmado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;