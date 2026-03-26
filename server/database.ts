import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_CONFIG_FILE = path.join(process.cwd(), 'db-config.json');

export function getDbConfig() {
  if (fs.existsSync(DB_CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_CONFIG_FILE, 'utf-8'));
    } catch (e) {
      return { type: 'sqlite' };
    }
  }
  return { type: 'sqlite' };
}

export function setDbConfig(config: any) {
  fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(config, null, 2));
}

const mysqlConfig = {
  host: 'localhost',
  user: 'usuario',
  password: '@Cartorio18441@@',
  database: 'bdIndisponibilidade'
};

class DbWrapper {
  private sqliteDb: any = null;
  private mysqlPool: any = null;
  public type: 'sqlite' | 'mysql' = 'sqlite';

  constructor() {
    this.type = getDbConfig().type;
  }

  async init() {
    // Always init SQLite as fallback/source
    this.sqliteDb = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    if (this.type === 'mysql') {
      try {
        this.mysqlPool = mysql.createPool(mysqlConfig);
        await this.mysqlPool.getConnection(); // Test connection
      } catch (e) {
        console.error('Failed to connect to MySQL, falling back to SQLite', e);
        this.type = 'sqlite';
      }
    }

    await this.runMigrations();
  }

  async switchDb(newType: 'sqlite' | 'mysql') {
    if (newType === 'mysql' && !this.mysqlPool) {
      this.mysqlPool = mysql.createPool(mysqlConfig);
    }
    this.type = newType;
    setDbConfig({ type: newType });
    await this.runMigrations();
  }

  private convertQuery(sql: string): string {
    if (this.type === 'mysql') {
      // Convert SQLite AUTOINCREMENT to MySQL AUTO_INCREMENT
      let converted = sql.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
      // Convert SQLite DATETIME DEFAULT CURRENT_TIMESTAMP to MySQL DATETIME DEFAULT CURRENT_TIMESTAMP
      // Convert SQLite BOOLEAN to MySQL BOOLEAN (TINYINT)
      return converted;
    }
    return sql;
  }

  async get(sql: string, params: any[] = []) {
    if (this.type === 'mysql') {
      const safeParams = params.map(p => p === undefined ? null : p);
      const [rows] = await this.mysqlPool.execute(this.convertQuery(sql), safeParams);
      return (rows as any[])[0] || undefined;
    }
    return this.sqliteDb.get(sql, params);
  }

  async all(sql: string, params: any[] = []) {
    if (this.type === 'mysql') {
      const safeParams = params.map(p => p === undefined ? null : p);
      const [rows] = await this.mysqlPool.execute(this.convertQuery(sql), safeParams);
      return rows;
    }
    return this.sqliteDb.all(sql, params);
  }

  async run(sql: string, params: any[] = []) {
    if (this.type === 'mysql') {
      const safeParams = params.map(p => p === undefined ? null : p);
      const [result] = await this.mysqlPool.execute(this.convertQuery(sql), safeParams);
      return { lastID: (result as any).insertId, changes: (result as any).affectedRows };
    }
    return this.sqliteDb.run(sql, params);
  }

  async exec(sql: string) {
    if (this.type === 'mysql') {
      // MySQL doesn't support multiple statements in execute by default unless configured.
      // We will split by ';' and run individually.
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await this.mysqlPool.query(this.convertQuery(stmt));
        } catch (e: any) {
          // Ignore duplicate column errors etc for migrations
          if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
            throw e;
          }
        }
      }
      return;
    }
    return this.sqliteDb.exec(sql);
  }

  // Expose raw instances for migration
  getSqlite() { return this.sqliteDb; }
  getMysql() { return this.mysqlPool; }

  private async runMigrations() {
    await this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        cpf TEXT,
        role TEXT NOT NULL,
        is_confirmed BOOLEAN DEFAULT 0,
        confirmation_token TEXT,
        group_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        client_secret TEXT,
        environment TEXT DEFAULT 'stg',
        cpf_usuario TEXT
      );

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client_id TEXT,
        client_secret TEXT,
        environment TEXT DEFAULT 'stg',
        cpf_usuario TEXT,
        template_positive TEXT,
        template_negative TEXT,
        expiration_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        documento TEXT,
        nome_razao TEXT,
        indisponivel BOOLEAN,
        qtd_ordens INTEGER,
        protocolos TEXT,
        hash TEXT,
        data TEXT,
        nome TEXT,
        documento_usuario TEXT,
        organizacao TEXT,
        filtros TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mp_access_token TEXT,
        mp_public_key TEXT,
        price_30 REAL DEFAULT 0,
        price_90 REAL DEFAULT 0,
        price_180 REAL DEFAULT 0,
        price_365 REAL DEFAULT 0,
        trial_days INTEGER DEFAULT 0,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        smtp_secure BOOLEAN DEFAULT 0,
        smtp_from_email TEXT,
        smtp_from_name TEXT
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        mp_payment_id TEXT,
        mp_preference_id TEXT,
        external_reference TEXT,
        status TEXT,
        days INTEGER,
        amount REAL,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try { await this.exec('ALTER TABLE users ADD COLUMN name TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE users ADD COLUMN cpf TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE users ADD COLUMN is_confirmed BOOLEAN DEFAULT 0'); } catch (e) {}
    try { await this.exec('ALTER TABLE users ADD COLUMN confirmation_token TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN trial_days INTEGER DEFAULT 0'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_host TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_port INTEGER'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_user TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_pass TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_secure BOOLEAN DEFAULT 0'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_from_email TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE system_settings ADD COLUMN smtp_from_name TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE users ADD COLUMN group_id INTEGER REFERENCES groups(id)'); } catch (e) {}
    try { await this.exec('ALTER TABLE groups ADD COLUMN template_positive TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE groups ADD COLUMN template_negative TEXT'); } catch (e) {}
    try { await this.exec('ALTER TABLE groups ADD COLUMN expiration_date DATETIME'); } catch (e) {}
    try { await this.exec('ALTER TABLE payments ADD COLUMN payment_method TEXT'); } catch (e) {}

    // Create default group if none exists
    const defaultGroup = await this.get('SELECT * FROM groups WHERE id = 1');
    if (!defaultGroup) {
      await this.run('INSERT INTO groups (id, name, environment) VALUES (1, "Grupo Padrão", "stg")');
      // Migrate config if exists
      try {
        const config = await this.get('SELECT * FROM config LIMIT 1');
        if (config) {
          await this.run(
            'UPDATE groups SET client_id = ?, client_secret = ?, environment = ?, cpf_usuario = ? WHERE id = 1',
            [config.client_id, config.client_secret, config.environment, config.cpf_usuario]
          );
        }
      } catch (e) {}
    }

    // Assign existing users to default group
    await this.run('UPDATE users SET group_id = 1 WHERE group_id IS NULL');

    // Check if superadmin exists
    const superadmin = await this.get('SELECT * FROM users WHERE role = "superadmin"');
    if (!superadmin) {
      const hashedPassword = await bcrypt.hash('superadmin123', 10);
      await this.run(
        'INSERT INTO users (email, password, role, group_id) VALUES (?, ?, ?, ?)',
        ['superadmin@admin.com', hashedPassword, 'superadmin', 1]
      );
    }

    // Insert default system settings if not exists
    const settings = await this.get('SELECT * FROM system_settings LIMIT 1');
    if (!settings) {
      await this.run('INSERT INTO system_settings (price_30, price_90, price_180, price_365) VALUES (0, 0, 0, 0)');
    }
  }
}

export const dbWrapper = new DbWrapper();

export async function initDb() {
  await dbWrapper.init();
  return dbWrapper;
}
