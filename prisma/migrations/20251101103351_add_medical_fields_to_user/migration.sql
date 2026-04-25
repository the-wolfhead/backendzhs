-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alcoholUse" TEXT,
ADD COLUMN     "allergies" TEXT[],
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "drugUse" BOOLEAN DEFAULT false,
ADD COLUMN     "genotype" TEXT,
ADD COLUMN     "medicalHistory" TEXT[],
ADD COLUMN     "smoker" BOOLEAN DEFAULT false;
