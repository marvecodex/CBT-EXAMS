import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = fs.readFileSync(path.join(__dirname, '../../sql/001_init.sql'), 'utf8');

(async () => {
  try {
    await pool.query(sql);
    console.log('Migration completed');
  } finally {
    await pool.end();
  }
})();
