ALTER TABLE "Pharmacy" ADD COLUMN IF NOT EXISTS "staffUserId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Pharmacy_staffUserId_key" ON "Pharmacy"("staffUserId");
DO $$ BEGIN
  ALTER TABLE "Pharmacy" ADD CONSTRAINT "Pharmacy_staffUserId_fkey"
    FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
