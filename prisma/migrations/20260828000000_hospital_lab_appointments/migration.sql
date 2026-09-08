-- Make doctorId optional (hospital/lab appointments have no doctor)
ALTER TABLE "Appointment" ALTER COLUMN "doctorId" DROP NOT NULL;

-- videoCallUrl only needed for doctor video consults
ALTER TABLE "Appointment" ALTER COLUMN "videoCallUrl" DROP NOT NULL;

-- Appointment type + facility links + service
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'DOCTOR';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "service" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "hospitalId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "labId" INTEGER;

-- Hospital booking fields
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "availableHours" JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "workDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Lab booking fields
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 8000;
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "availableHours" JSONB;
ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS "workDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Foreign keys (ignore if already present)
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
