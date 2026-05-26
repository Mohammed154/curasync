import postgres from 'postgres';

// Try pooler first, then direct
const pooler = process.env.DATABASE_URL;
const direct = process.env.DATABASE_URL_DIRECT;

for (const [label, url] of [['POOLER (6543)', pooler], ['DIRECT (5432)', direct]]) {
  console.log(`\nTrying ${label}:`, url?.replace(/:[^@]+@/, ':***@'));
  try {
    const sql = postgres(url, { connect_timeout: 10, idle_timeout: 5 });
    const result = await sql`SELECT 1 as test`;
    console.log(`  ✅ Connected! Result:`, JSON.stringify(result));
    
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log(`  📋 Tables:`, tables.map(t => t.table_name).join(', ') || '(none)');
    
    await sql.end();
  } catch (e) {
    console.error(`  ❌ Failed:`, e.message);
  }
}
