import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- Hospitals ---
  const hospitals = await prisma.hospital.createMany({
    data: [
      { name: "Lagos University Teaching Hospital (LUTH)", address: "Idi-Araba, Lagos", phone: "+234-1-234-5678", email: "info@luth.gov.ng" },
      { name: "University College Hospital Ibadan", address: "Queen Elizabeth Road, Ibadan, Oyo", phone: "+234-803-123-4567", email: "inquiries@uch-ibadan.com" },
      { name: "National Hospital Abuja", address: "Plot 132 Central District, Abuja", phone: "+234-703-987-6543", email: "contact@nationalhospital.gov.ng" },
      { name: "Reddington Hospital", address: "12 Idowu Martins St, VI, Lagos", phone: "+234-1-271-5342", email: "support@reddingtonhospital.com" },
      { name: "Evercare Hospital Lekki", address: "Lekki Phase 1, Lagos", phone: "+234-1-700-5522", email: "hello@evercare.ng" },
      { name: "St. Nicholas Hospital", address: "57 Campbell St, Lagos Island", phone: "+234-1-262-0540", email: "admin@stnicholashospital.com" }
    ],
  });

  // --- Labs ---
  const labs = await prisma.lab.createMany({
    data: [
      { name: "SynLab Nigeria", services: "Blood tests, wellness panels, hormone tests", address: "Victoria Island, Lagos", phone: "+234-1-271-3444", email: "contact@synlab.ng" },
      { name: "Clina-Lancet Laboratories", services: "Pathology, hematology, microbiology", address: "Garki, Abuja", phone: "+234-708-066-0000", email: "info@clinalancet.ng" },
      { name: "MeCure Healthcare", services: "Radiology, CT, MRI, x-ray screening", address: "Oshodi, Lagos", phone: "+234-815-989-5555", email: "support@mecure.com" },
      { name: "365Lab Diagnostics", services: "Routine tests, HIV, malaria, blood chemistry", address: "Port Harcourt, Rivers", phone: "+234-901-222-8888", email: "hello@365lab.ng" },
      { name: "TruScan Diagnostics", services: "Ultrasound and imaging services", address: "Wuse II, Abuja", phone: "+234-813-144-4444", email: "info@truscanhealth.com" },
      { name: "HealthTrack Labs", services: "Corporate health tests & medical screenings", address: "Yaba, Lagos", phone: "+234-810-920-1111", email: "office@healthtrack.ng" }
    ],
  });

  // --- Doctors ---
  const doctors = await prisma.doctor.createMany({
    data: [
      {
        name: "Dr. Adaeze Okafor",
        specialty: ["Pediatrics", "Family Medicine"],
        rating: 4.7,
        bio: "Compassionate pediatrician with 8 years of experience.",
        availableHours: ["09:00-12:00", "14:00-17:00"],
        fee: 3500
      },
      {
        name: "Dr. Ibrahim Musa",
        specialty: ["General Medicine"],
        rating: 4.3,
        bio: "GP focused on lifestyle-based care and prevention.",
        availableHours: ["10:00-14:00"],
        fee: 2500
      },
      {
        name: "Dr. Chiamaka Eze",
        specialty: ["Dermatology"],
        rating: 4.8,
        bio: "Expert in acne, hyperpigmentation & cosmetic dermatology.",
        availableHours: ["08:00-11:00", "16:00-19:00"],
        fee: 5000
      },
      {
        name: "Dr. Femi Adeyemi",
        specialty: ["Mental Health", "Psychiatry"],
        rating: 4.9,
        bio: "Tele-psychiatrist specializing in anxiety and trauma therapy.",
        availableHours: ["12:00-18:00"],
        fee: 6000
      },
      {
        name: "Dr. Grace Nnaji",
        specialty: ["Gynecology", "Women's Health"],
        rating: 4.6,
        bio: "Supports reproductive and menstrual health for women.",
        availableHours: ["09:00-13:00"],
        fee: 4500
      },
      {
        name: "Dr. Daniel Olatunji",
        specialty: ["Cardiology"],
        rating: 4.4,
        bio: "Helps patients manage hypertension and heart disease.",
        availableHours: ["15:00-20:00"],
        fee: 7000
      }
    ],
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
