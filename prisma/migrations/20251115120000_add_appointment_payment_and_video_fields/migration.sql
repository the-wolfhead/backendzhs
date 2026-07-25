-- AlterTable
ALTER TABLE "Appointment"
ADD COLUMN     "patientName" TEXT NOT NULL DEFAULT 'Self',
ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "callStartedAt" TIMESTAMP(3),
ADD COLUMN     "callEndedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_paymentReference_key" ON "Appointment"("paymentReference");
