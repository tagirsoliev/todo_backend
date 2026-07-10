import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit config: schema location, migrations output, DB credentials.
// Points at the same Neon database and the same ./drizzle migration history
// as the TODO_bot project — schemas must stay in sync across both apps.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
