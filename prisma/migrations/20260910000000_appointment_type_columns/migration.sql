-- Ensure appointment type / facility columns exist (safe if already applied)
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'DOCTOR';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "hospitalId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "labId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "service" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "resultUrl" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "resultNotes" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "resultUploadedAt" TIMESTAMP(3);

UPDATE "Appointment" SET "type" = 'DOCTOR' WHERE "type" IS NULL AND "doctorId" IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_labId_fkey"
    FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
