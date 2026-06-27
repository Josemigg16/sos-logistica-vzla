CREATE TABLE "needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"meta" integer DEFAULT 0 NOT NULL,
	"recibido" integer DEFAULT 0 NOT NULL,
	"prioridad" varchar(20) DEFAULT 'ALTA' NOT NULL,
	"descripcion" text DEFAULT '',
	"fecha_necesidad" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" "inventory_category" NOT NULL,
	"unit" varchar(40) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_reported_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "operations" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "operations" ALTER COLUMN "status" SET DEFAULT 'PLANNED'::text;--> statement-breakpoint
DROP TYPE "public"."operation_status";--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "operations" ALTER COLUMN "status" SET DEFAULT 'PLANNED'::"public"."operation_status";--> statement-breakpoint
ALTER TABLE "operations" ALTER COLUMN "status" SET DATA TYPE "public"."operation_status" USING "status"::"public"."operation_status";--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;