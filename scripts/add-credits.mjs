import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find user and their workspaces
  const user = await prisma.user.findFirst({
    where: { email: 'albad.mail@gmail.com' },
    include: {
      memberships: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', user.email);

  for (const m of user.memberships) {
    console.log(`\nWorkspace: ${m.workspace.name} (${m.workspace.slug})`);
    console.log(`  Current creditUnits: ${m.workspace.creditUnits}`);

    // Add 100 credits = 10000 units (100 units per credit)
    const newUnits = m.workspace.creditUnits + 10000;

    await prisma.workspace.update({
      where: { id: m.workspace.id },
      data: { creditUnits: newUnits }
    });

    // Log the credit addition in ledger
    await prisma.creditLedger.create({
      data: {
        workspaceId: m.workspace.id,
        delta: 10000,
        balanceAfter: newUnits,
        reason: 'Admin credit grant - 100 credits',
        refType: 'admin_grant',
      }
    });

    console.log(`  NEW creditUnits: ${newUnits} (+10000 = +100 credits)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
