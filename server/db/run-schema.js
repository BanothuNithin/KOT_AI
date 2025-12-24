import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSchema = async () => {
  let connection;
  try {
    console.log('Running database schema...');

    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    // Create users table if it doesn't exist
    console.log('Creating users table...');
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('USER', 'ADMIN', 'CHEF', 'ASSEMBLER') NOT NULL DEFAULT 'USER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_role (role)
      );
    `;

    await connection.query(createUsersTable);
    console.log('Users table created or already exists.');

    // Check if admin user exists
    const [adminCheck] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE name = ?',
      ['admin']
    );

    if (adminCheck[0].count === 0) {
      console.log('Creating default admin user...');
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const passwordHash = await bcrypt.default.hash('admin123', saltRounds);

      await connection.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@smartkot.com', passwordHash, 'ADMIN']
      );
      console.log('Default admin user created!');
    } else {
      console.log('Admin user already exists.');
    }

    console.log('✅ Schema setup completed successfully!');
  } catch (error) {
    console.error('❌ Schema setup failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit();
  }
};

runSchema();

