const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

// Explains what `main` does in the backend API flow.
async function main() {
  const schemaPath = path.resolve(__dirname, "..", "..", "sqlFile.sql");

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, "utf8");
  if (!sql.trim()) {
    throw new Error("Schema file is empty");
  }

  await pool.query(sql);
  console.log("Database schema initialized successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to initialize database schema:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
