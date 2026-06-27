CREATE TYPE "convoy_status" AS ENUM('PLANIFICADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO');
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
CREATE TABLE "convoy_vehicles" (
	"convoy_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	CONSTRAINT "convoy_vehicles_convoy_id_vehicle_id_pk" PRIMARY KEY("convoy_id","vehicle_id")
);
--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_origen_id_hubs_id_fk"
	FOREIGN KEY ("origen_id") REFERENCES "hubs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_destino_id_hubs_id_fk"
	FOREIGN KEY ("destino_id") REFERENCES "hubs"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "convoys" ADD CONSTRAINT "convoys_escolta_id_users_id_fk"
	FOREIGN KEY ("escolta_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "convoy_vehicles" ADD CONSTRAINT "convoy_vehicles_convoy_id_convoys_id_fk"
	FOREIGN KEY ("convoy_id") REFERENCES "convoys"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "convoy_vehicles" ADD CONSTRAINT "convoy_vehicles_vehicle_id_vehiculos_id_fk"
	FOREIGN KEY ("vehicle_id") REFERENCES "vehiculos"("id") ON DELETE restrict ON UPDATE no action;
