import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import mysql from 'mysql2/promise';

class MySQLWrapper {
  pool: mysql.Pool;

  constructor(pool: mysql.Pool) {
    this.pool = pool;
  }

  async get(sql: string, params: any[] = []) {
    const [rows] = await this.pool.execute(sql, params);
    return (rows as any[])[0];
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as any[];
  }

  async run(sql: string, params: any[] = []) {
    const [result] = await this.pool.execute(sql, params);
    return {
      lastID: (result as any).insertId,
      changes: (result as any).affectedRows
    };
  }

  async exec(sql: string) {
    await this.pool.query(sql);
  }
}

export async function migrateData(from: string, to: string) {
  const sqliteDb = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const mysqlPool = mysql.createPool({
    host: 'localhost',
    user: 'usuario',
    password: '@Cartorio18441@@',
    database: 'bdIndisponibilidade',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });
  const mysqlDb = new MySQLWrapper(mysqlPool);

  const sourceDb = from === 'sqlite' ? sqliteDb : mysqlDb;
  const targetDb = to === 'sqlite' ? sqliteDb : mysqlDb;

  const tables = ['users', 'config', 'groups', 'history', 'system_settings', 'payments'];

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
        const values = columns.map(col => row[col]);
        if (to === 'sqlite') {
          await (targetDb as any).run(sql, values);
        } else {
          await (targetDb as any).run(sql, values);
        }
      }
    }
  }

  await mysqlPool.end();
  await sqliteDb.close();
}
