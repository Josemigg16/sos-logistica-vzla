CREATE TABLE "tipos_vehiculo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nombre" varchar(80) NOT NULL,
  "descripcion" text NOT NULL DEFAULT '',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tipos_vehiculo_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "vehiculos" ADD COLUMN "tipo_vehiculo_id" uuid REFERENCES "tipos_vehiculo"("id") ON DELETE set null;
