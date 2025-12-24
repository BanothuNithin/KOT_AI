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

    // Split SQL commands properly handling multi-line statements
    const commands = [];
    let currentCommand = '';
    const lines = schemaSQL.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('--')) {
        currentCommand += line + '\n';
        if (trimmedLine.endsWith(';')) {
          const cleanCommand = currentCommand.trim();
          if (cleanCommand && !cleanCommand.toUpperCase().includes('CREATE DATABASE')) {
            commands.push(cleanCommand);
          }
          currentCommand = '';
        }
      }
    }

    console.log(`Found ${commands.length} SQL commands to execute`);

    for (const command of commands) {
      if (command.trim()) {
        console.log('Executing:', command.substring(0, 80) + '...');
        try {
          await pool.execute(command);
          console.log('✅ Command executed successfully');
        } catch (error) {
          console.error('❌ Error executing command:', error.message);
          console.error('Command was:', command);
        }
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