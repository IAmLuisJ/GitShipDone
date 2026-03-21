CREATE TABLE "parking_lot_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "description" text,
  "ai_pathway" text,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "parking_lot_items_project_id_idx" ON "parking_lot_items" USING btree ("project_id");
