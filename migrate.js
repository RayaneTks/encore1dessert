import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

// Read .env.local
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const match = envLocal.match(/encore1dessert_POSTGRES_URL="([^"]+)"/);
if (!match) {
  console.error("No POSTGRES_URL found");
  process.exit(1);
}

const connectionString = match[1];

async function run() {
const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  try {
    const queries = [
      "ALTER TABLE raw_ingredients ALTER COLUMN user_id DROP NOT NULL;",
      "ALTER TABLE bases ALTER COLUMN user_id DROP NOT NULL;",
      "ALTER TABLE desserts ALTER COLUMN user_id DROP NOT NULL;",
      "ALTER TABLE history_entries ALTER COLUMN user_id DROP NOT NULL;"
    ];
    for (const q of queries) {
      console.log('Executing:', q);
      await client.query(q);
    }
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
