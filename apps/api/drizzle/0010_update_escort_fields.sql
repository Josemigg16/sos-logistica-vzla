ALTER TABLE "convoys" DROP CONSTRAINT "convoys_escolta_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "convoys" DROP COLUMN "escolta_id";--> statement-breakpoint
ALTER TABLE "convoys" ADD COLUMN "escolta_nombre" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "convoys" ADD COLUMN "escolta_cedula" varchar(20) NOT NULL;