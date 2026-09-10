ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT DEFAULT 'UNVERIFIED';

CREATE TABLE IF NOT EXISTS "DoctorCredential" (
  "id" TEXT NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "licenseNumber" TEXT,
  "licenseBody" TEXT,
  "licenseExpiry" TIMESTAMP(3),
  "medicalSchool" TEXT,
  "graduationYear" INTEGER,
  "specialtyClaim" TEXT,
  "documents" JSONB,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DoctorCredential_doctorId_idx" ON "DoctorCredential"("doctorId");
CREATE INDEX IF NOT EXISTS "DoctorCredential_status_idx" ON "DoctorCredential"("status");

DO $$ BEGIN
  ALTER TABLE "DoctorCredential" ADD CONSTRAINT "DoctorCredential_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
