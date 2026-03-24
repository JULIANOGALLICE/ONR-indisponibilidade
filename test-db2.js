import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function main() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  const settings = await db.all('SELECT * FROM system_settings');
  console.log(settings);
}
main();
