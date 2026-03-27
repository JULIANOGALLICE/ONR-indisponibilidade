import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
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

  async close() {
    await this.pool.end();
  }
}

export async function initDb() {
  const configPath = path.join(process.cwd(), 'server', 'db-config.json');
  let dbType = 'sqlite';
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.type === 'mysql') dbType = 'mysql';
    } catch (e) {}
  }

  if (dbType === 'mysql') {
    return await initMysql();
  } else {
    return await initSqlite();
  }
}

export async function initMysql() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'usuario',
    password: '@Cartorio18441@@',
    database: 'bdIndisponibilidade',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });

  const db = new MySQLWrapper(pool);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      cpf TEXT,
      role VARCHAR(50) NOT NULL CHECK(role IN ('superadmin', 'admin', 'user')),
      is_confirmed BOOLEAN DEFAULT 0,
      confirmation_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      group_id INT
    );

    CREATE TABLE IF NOT EXISTS config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id TEXT,
      client_secret TEXT,
      environment VARCHAR(50) DEFAULT 'stg',
      cpf_usuario TEXT
    );

    CREATE TABLE IF NOT EXISTS \`groups\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT NOT NULL,
      client_id TEXT,
      client_secret TEXT,
      environment VARCHAR(50) DEFAULT 'stg',
      cpf_usuario TEXT,
      template_positive TEXT,
      template_negative TEXT,
      expiration_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      group_id INT NOT NULL,
      documento TEXT,
      nome_razao TEXT,
      indisponivel BOOLEAN,
      qtd_ordens INT,
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
      id INT AUTO_INCREMENT PRIMARY KEY,
      mp_access_token TEXT,
      mp_public_key TEXT,
      price_30 DOUBLE DEFAULT 0,
      price_90 DOUBLE DEFAULT 0,
      price_180 DOUBLE DEFAULT 0,
      price_365 DOUBLE DEFAULT 0,
      trial_days INT DEFAULT 0,
      smtp_host TEXT,
      smtp_port INT,
      smtp_user TEXT,
      smtp_pass TEXT,
      smtp_secure BOOLEAN DEFAULT 0,
      smtp_from_email TEXT,
      smtp_from_name TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT,
      mp_payment_id TEXT,
      mp_preference_id TEXT,
      external_reference TEXT,
      status VARCHAR(50),
      days INT,
      amount DOUBLE,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const defaultGroup = await db.get('SELECT * FROM \`groups\` WHERE id = 1');
  if (!defaultGroup) {
    await db.run('INSERT INTO \`groups\` (id, name, environment) VALUES (1, "Grupo Padrão", "stg")');
  }

  await db.run('UPDATE users SET group_id = 1 WHERE group_id IS NULL');

  const superadmin = await db.get('SELECT * FROM users WHERE role = "superadmin"');
  if (!superadmin) {
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    await db.run(
      'INSERT INTO users (email, password, role, group_id) VALUES (?, ?, ?, ?)',
      ['superadmin@admin.com', hashedPassword, 'superadmin', 1]
    );
  }

  const settings = await db.get('SELECT * FROM system_settings LIMIT 1');
  if (!settings) {
    await db.run('INSERT INTO system_settings (price_30, price_90, price_180, price_365) VALUES (0, 0, 0, 0)');
  }

  return db;
}

export async function initSqlite() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA journal_mode = WAL;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      cpf TEXT,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'user')),
      is_confirmed BOOLEAN DEFAULT 0,
      confirmation_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT,
      client_secret TEXT,
      environment TEXT DEFAULT 'stg',
      cpf_usuario TEXT
    );

    CREATE TABLE IF NOT EXISTS \`groups\` (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_id TEXT,
      client_secret TEXT,
      environment TEXT DEFAULT 'stg',
      cpf_usuario TEXT,
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

  try {
    await db.exec('ALTER TABLE users ADD COLUMN name TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE users ADD COLUMN cpf TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE users ADD COLUMN is_confirmed BOOLEAN DEFAULT 0');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE users ADD COLUMN confirmation_token TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN trial_days INTEGER DEFAULT 0');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_host TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_port INTEGER');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_user TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_pass TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_secure BOOLEAN DEFAULT 0');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_from_email TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE system_settings ADD COLUMN smtp_from_name TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE users ADD COLUMN group_id INTEGER REFERENCES \`groups\`(id)');
  } catch (e) {
    // Column might already exist
  }

  try {
    await db.exec('ALTER TABLE \`groups\` ADD COLUMN template_positive TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE \`groups\` ADD COLUMN template_negative TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE \`groups\` ADD COLUMN expiration_date DATETIME');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE payments ADD COLUMN payment_method TEXT');
  } catch (e) {}

  // Create default group if none exists
  const defaultGroup = await db.get('SELECT * FROM \`groups\` WHERE id = 1');
  if (!defaultGroup) {
    await db.run('INSERT INTO \`groups\` (id, name, environment) VALUES (1, "Grupo Padrão", "stg")');
    // Migrate config if exists
    try {
      const config = await db.get('SELECT * FROM config LIMIT 1');
      if (config) {
        await db.run(
          'UPDATE \`groups\` SET client_id = ?, client_secret = ?, environment = ?, cpf_usuario = ? WHERE id = 1',
          [config.client_id, config.client_secret, config.environment, config.cpf_usuario]
        );
      }
    } catch (e) {}
  }

  // Assign existing users to default group
  await db.run('UPDATE users SET group_id = 1 WHERE group_id IS NULL');

  // Check if superadmin exists
  const superadmin = await db.get('SELECT * FROM users WHERE role = "superadmin"');
  if (!superadmin) {
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    await db.run(
      'INSERT INTO users (email, password, role, group_id) VALUES (?, ?, ?, ?)',
      ['superadmin@admin.com', hashedPassword, 'superadmin', 1]
    );
  }

  // Insert default system settings if not exists
  const settings = await db.get('SELECT * FROM system_settings LIMIT 1');
  if (!settings) {
    await db.run('INSERT INTO system_settings (price_30, price_90, price_180, price_365) VALUES (0, 0, 0, 0)');
  }

  return db;
}
