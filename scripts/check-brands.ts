import prisma from '../src/lib/prisma';

async function check() {
  const brands = await prisma.brand.findMany({
    select: {
      id: true,
      name: true,
      verbalDNA: true,
      visualDNA: true,
    }
  });

  for (const brand of brands) {
    console.log('Brand:', brand.name);
    console.log('Has Visual DNA:', brand.visualDNA ? 'YES' : 'NO');
    console.log('Has Verbal DNA:', brand.verbalDNA ? 'YES' : 'NO');
    if (brand.verbalDNA) {
      const vdna = brand.verbalDNA as any;
      console.log('  - tone:', vdna.tone);
      console.log('  - primary_language:', vdna.primary_language);
      console.log('  - exemplars count:', vdna.exemplars?.length || 0);
    }
    console.log('---');
  }

  await prisma.$disconnect();
}

check();
