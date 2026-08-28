-- AlterTable: make doctorId optional, add hospital/lab support to Appointment
ALTER TABLE "Appointment" ALTER COLUMN "doctorId" DROP NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "videoCallUrl" DROP NOT NULL;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "hospitalId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "labId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'DOCTOR';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "service" TEXT;

-- AlterTable Hospital: add fee and schedule fields
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "availableHours" JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "workDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable Lab: add fee and schedule fields
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 8000;
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "availableHours" JSONB;
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "workDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Foreign keys
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
