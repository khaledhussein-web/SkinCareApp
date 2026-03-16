const { pool } = require("../db");

async function main() {
  const basic = await pool.query(
    "SELECT current_database() AS database_name, current_user AS database_user, NOW() AS server_time",
  );

  const tables = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name`,
  );

  console.log("Database check passed.");
  console.log(`Database: ${basic.rows[0].database_name}`);
  console.log(`User: ${basic.rows[0].database_user}`);
  console.log(`Server time: ${basic.rows[0].server_time}`);
  console.log(`Public tables found: ${tables.rowCount}`);
}

main()
  .catch((error) => {
    console.error("Database check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
