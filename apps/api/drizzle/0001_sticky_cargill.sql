CREATE TYPE "public"."incident_status" AS ENUM('ACTIVE', 'CONTAINED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."accion_carga" AS ENUM('RECEPCION', 'EMBALAJE', 'DESPACHO', 'ENTREGA', 'TRASPASO');--> statement-breakpoint
CREATE TYPE "public"."estado_lote" AS ENUM('EMBALADO', 'EN_TRANSITO', 'ENTREGADO');--> statement-breakpoint
CREATE TYPE "public"."hub_type" AS ENUM('COLLECTION', 'DISPATCH', 'DESTINATION');--> statement-breakpoint
CREATE TYPE "public"."inventory_category" AS ENUM('Víveres', 'Medicamentos', 'Higiene personal', 'Abrigo y refugio', 'Herramientas', 'Productos de limpieza', 'Artículos para bebés y grupos vulnerables');--> statement-breakpoint
CREATE TYPE "public"."estado_vehiculo" AS ENUM('DISPONIBLE', 'EN_RUTA', 'FUERA_DE_SERVICIO');--> statement-breakpoint
CREATE TYPE "public"."estado_viaje" AS ENUM('PLANIFICADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('PLANNED', 'EN_ROUTE', 'COMPLETED', 'CANCELED');--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(80) NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "incident_status" DEFAULT 'ACTIVE' NOT NULL,
	"zone" varchar(120) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"reported_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_carga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"centro_id" uuid,
	"lote_carga_id" uuid,
	"accion" "accion_carga" NOT NULL,
	"cantidad" integer NOT NULL,
	"descripcion" text,
	"realizado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "lotes_carga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viaje_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"cantidad" integer NOT NULL,
	"estado" "estado_lote" DEFAULT 'EMBALADO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "traspasos_carga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_carga_id" uuid NOT NULL,
	"viaje_origen_id" uuid NOT NULL,
	"viaje_destino_id" uuid NOT NULL,
	"autorizado_por_id" uuid,
	"motivo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "choferes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"licencia" text NOT NULL,
	"telefono" text NOT NULL,
	"disponible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "operation_status" DEFAULT 'PLANNED' NOT NULL,
	"incident_id" uuid NOT NULL,
	"zone" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehiculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placa" text NOT NULL,
	"modelo" text NOT NULL,
	"capacidad_carga_kg" double precision NOT NULL,
	"estado" "estado_vehiculo" DEFAULT 'DISPONIBLE' NOT NULL,
	"chofer_id" uuid,
	"centro_origen_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehiculos_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
CREATE TABLE "viajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"vehiculo_id" uuid NOT NULL,
	"estado" "estado_viaje" DEFAULT 'PLANIFICADO' NOT NULL,
	"destino_id" uuid NOT NULL,
	"fecha_salida" timestamp with time zone,
	"fecha_estimada_arribo" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_carga" ADD CONSTRAINT "historial_carga_centro_id_hubs_id_fk" FOREIGN KEY ("centro_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_carga" ADD CONSTRAINT "historial_carga_lote_carga_id_lotes_carga_id_fk" FOREIGN KEY ("lote_carga_id") REFERENCES "public"."lotes_carga"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_carga" ADD CONSTRAINT "historial_carga_realizado_por_id_users_id_fk" FOREIGN KEY ("realizado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_carga" ADD CONSTRAINT "lotes_carga_viaje_id_viajes_id_fk" FOREIGN KEY ("viaje_id") REFERENCES "public"."viajes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traspasos_carga" ADD CONSTRAINT "traspasos_carga_lote_carga_id_lotes_carga_id_fk" FOREIGN KEY ("lote_carga_id") REFERENCES "public"."lotes_carga"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traspasos_carga" ADD CONSTRAINT "traspasos_carga_viaje_origen_id_viajes_id_fk" FOREIGN KEY ("viaje_origen_id") REFERENCES "public"."viajes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traspasos_carga" ADD CONSTRAINT "traspasos_carga_viaje_destino_id_viajes_id_fk" FOREIGN KEY ("viaje_destino_id") REFERENCES "public"."viajes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traspasos_carga" ADD CONSTRAINT "traspasos_carga_autorizado_por_id_users_id_fk" FOREIGN KEY ("autorizado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choferes" ADD CONSTRAINT "choferes_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_chofer_id_choferes_id_fk" FOREIGN KEY ("chofer_id") REFERENCES "public"."choferes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_centro_origen_id_hubs_id_fk" FOREIGN KEY ("centro_origen_id") REFERENCES "public"."hubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_destino_id_hubs_id_fk" FOREIGN KEY ("destino_id") REFERENCES "public"."hubs"("id") ON DELETE restrict ON UPDATE no action;