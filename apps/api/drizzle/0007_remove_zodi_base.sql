-- Estado operativo del hub: ACTIVO / INACTIVO. Un hub inactivo no puede usarse
-- como origen ni destino de caravanas. Default ACTIVO backfillea filas existentes.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_status') THEN
    CREATE TYPE "public"."hub_status" AS ENUM('ACTIVO', 'INACTIVO');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "hubs" ADD COLUMN IF NOT EXISTS "status" "hub_status" DEFAULT 'ACTIVO' NOT NULL;
--> statement-breakpoint
-- Elimina el valor muerto ZODI_BASE del enum hub_type. Postgres no soporta
-- DROP VALUE en un enum, así que hay que recrear el tipo. Las filas que aún usen
-- ZODI_BASE se remapean a DESTINATION (su mapeo histórico en el ACL de /centros).
-- Todo dentro de un guard para que sea idempotente si se corre más de una vez.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'hub_type' AND e.enumlabel = 'ZODI_BASE'
  ) THEN
    UPDATE "hubs" SET "type" = 'DESTINATION' WHERE "type" = 'ZODI_BASE';
    ALTER TYPE "public"."hub_type" RENAME TO "hub_type_old";
    CREATE TYPE "public"."hub_type" AS ENUM('COLLECTION', 'DISPATCH', 'DESTINATION');
    ALTER TABLE "hubs" ALTER COLUMN "type" TYPE "public"."hub_type" USING "type"::text::"public"."hub_type";
    DROP TYPE "public"."hub_type_old";
  END IF;
END $$;
