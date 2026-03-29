import { initMysql, initSqlite } from './database';

export async function migrateData(from: string, to: string) {
  const sqliteDb = await initSqlite();
  const mysqlDb = await initMysql();

  const sourceDb = from === 'sqlite' ? sqliteDb : mysqlDb;
  const targetDb = to === 'sqlite' ? sqliteDb : mysqlDb;

  const tables = ['users', 'config', '\`groups\`', 'history', 'system_settings', 'payments'];

  for (const table of tables) {
    // Clear target table
    if (to === 'mysql') {
      await targetDb.exec(`SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE ${table}; SET FOREIGN_KEY_CHECKS = 1;`);
    } else {
      await targetDb.exec(`DELETE FROM ${table}`);
    }

    const rows = await sourceDb.all(`SELECT * FROM ${table}`);
    if (rows && rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map(col => {
          let val = row[col];
          
          // If the value is a Date object (e.g. from MySQL), convert it to string
          if (val instanceof Date) {
            val = val.toISOString().slice(0, 19).replace('T', ' ');
          }
          
          // Fix datetime format for MySQL if it's a string from SQLite
          if (to === 'mysql' && typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            val = val.replace('T', ' ').replace('Z', '').split('.')[0];
          }
          return val;
        });
        await (targetDb as any).run(sql, values);
      }
    }
  }

  await (mysqlDb as any).close();
  await sqliteDb.close();
}
