import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL commands and execute them
    const commands = schemaSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command.trim()) {
        console.log('Executing:', command.substring(0, 50) + '...');
        await pool.execute(command);
      }
    }

    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    process.exit();
  }
};

initDatabase();