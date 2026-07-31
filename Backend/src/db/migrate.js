const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('../config/config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Errors that only mean "this exact schema object is already there" — safe to
// skip. Needed because a couple of statements (e.g. an ALTER TABLE ADD
// CONSTRAINT for a circular FK) have no MySQL "IF NOT EXISTS" form, so on a
// database that was already provisioned before migrations existed, re-running
// the baseline hits these once per object. Any other error still aborts.
const ALREADY_EXISTS_CODES = new Set([
  'ER_TABLE_EXISTS_ERROR',
  'ER_FK_DUP_NAME',
  'ER_DUP_KEYNAME',
  'ER_DUP_FIELDNAME',
]);

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrate() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // numeric filename prefixes (0001_, 0002_, ...) sort in apply order

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  try {
    // Tracks which migrations have already run so re-running this script is
    // always safe — it only ever applies new files, never re-runs or reverts
    // old ones, and it never drops existing tables/data.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`SchemaMigration\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL UNIQUE,
        \`appliedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const [appliedRows] = await connection.query('SELECT `name` FROM `SchemaMigration`');
    const applied = new Set(appliedRows.map((r) => r.name));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`در حال اجرای مایگریشن: ${file}`);
      for (const statement of splitStatements(sql)) {
        try {
          await connection.query(statement);
        } catch (err) {
          if (!ALREADY_EXISTS_CODES.has(err.code)) throw err;
          console.log(`  (رد شد — از قبل وجود دارد: ${err.sqlMessage})`);
        }
      }
      await connection.query('INSERT INTO `SchemaMigration` (`name`) VALUES (?)', [file]);
      ran += 1;
    }

    console.log(ran > 0 ? `${ran} مایگریشن جدید اجرا شد.` : 'همه مایگریشن‌ها قبلاً اجرا شده‌اند — چیزی برای اجرا نبود.');
  } finally {
    await connection.end();
  }
}

migrate().catch((err) => {
  console.error('اجرای مایگریشن با خطا مواجه شد:', err);
  process.exit(1);
});
