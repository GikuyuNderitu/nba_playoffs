const { db, setupSchema, get } = require('./db');
const { seedData } = require('./seed');

async function main() {
  console.log('[Database Setup] Verifying database schema...');
  await setupSchema();
  
  const tournamentExists = await get('SELECT id FROM tournaments LIMIT 1');
  if (!tournamentExists) {
    console.log('[Database Setup] Database is empty. Seeding initial playoffs data...');
    await seedData();
  } else {
    console.log('[Database Setup] Database already contains data. Skipping seeding.');
  }
}

main()
  .then(() => {
    db.close((err) => {
      if (err) {
        console.error('[Database Setup] Error closing database:', err.message);
        process.exit(1);
      }
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('[Database Setup] Setup failed:', err);
    db.close(() => {
      process.exit(1);
    });
  });
