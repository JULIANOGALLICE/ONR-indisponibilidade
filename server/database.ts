import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

export async function initDb() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'user')),
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
  `);

  try {
    await db.exec('ALTER TABLE users ADD COLUMN group_id INTEGER REFERENCES groups(id)');
  } catch (e) {
    // Column might already exist
  }

  // Create default group if none exists
  const defaultGroup = await db.get('SELECT * FROM groups WHERE id = 1');
  if (!defaultGroup) {
    await db.run('INSERT INTO groups (id, name, environment) VALUES (1, "Grupo Padrão", "stg")');
    // Migrate config if exists
    try {
      const config = await db.get('SELECT * FROM config LIMIT 1');
      if (config) {
        await db.run(
          'UPDATE groups SET client_id = ?, client_secret = ?, environment = ?, cpf_usuario = ? WHERE id = 1',
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

  return db;
}
