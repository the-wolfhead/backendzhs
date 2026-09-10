ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "staffUserId" TEXT;
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "staffUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Hospital_staffUserId_key" ON "Hospital"("staffUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Lab_staffUserId_key" ON "Lab"("staffUserId");

DO $$ BEGIN
  ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_staffUserId_fkey"
    FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lab" ADD CONSTRAINT "Lab_staffUserId_fkey"
    FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
