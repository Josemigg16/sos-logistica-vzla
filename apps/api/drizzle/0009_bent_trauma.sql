ALTER TYPE "public"."convoy_status" ADD VALUE 'RECIBIDO' BEFORE 'CANCELADO';--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "convoy_id" uuid;