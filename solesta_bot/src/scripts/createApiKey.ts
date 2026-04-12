import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
  
  const key = await prisma.apiKey.create({
    data: { key: apiKey, name: 'Next.js Web App' }
  });

  console.log('API Key created:');
  console.log('Key:', apiKey);
  console.log('ID:', key.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());