// scripts/seedSuperAdmin.js
//
// Promotes an existing user (they must have already signed up normally,
// via /auth/signup or Google login) to SUPER_ADMIN. Run once to bootstrap
// the first admin dashboard user:
//
//   node scripts/seedSuperAdmin.js someone@example.com
import prisma from '../src/prismaClient.js';

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/seedSuperAdmin.js <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found with email ${email} — they need to sign up first.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log(`✅ ${updated.email} is now SUPER_ADMIN`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
