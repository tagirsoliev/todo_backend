import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './client.js';

// Applies SQL migrations from ./drizzle to the Neon database (npm run db:migrate).
async function main() {
  console.log('⏳ Применяю миграции...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Миграции применены.');
}

main().catch((err) => {
  console.error('❌ Ошибка миграции:', err);
  process.exit(1);
});
