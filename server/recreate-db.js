import pool from './db/connection.js';

const recreateTables = async () => {
  try {
    console.log('Dropping existing tables...');

    // Drop tables in reverse order due to foreign keys
    await pool.execute('DROP TABLE IF EXISTS invoice_items');
    await pool.execute('DROP TABLE IF EXISTS invoices');
    await pool.execute('DROP TABLE IF EXISTS users');

    console.log('Recreating tables...');

    // Create users table
    await pool.execute(`
      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('USER', 'ADMIN', 'CHEF', 'ASSEMBLER') NOT NULL DEFAULT 'USER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_role (role)
      )
    `);

    // Create invoices table
    await pool.execute(`
      CREATE TABLE invoices (
        id VARCHAR(36) PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        user_id VARCHAR(36) NOT NULL,
        kot_id VARCHAR(50) NOT NULL,
        delivery_address TEXT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total DECIMAL(10,2) NOT NULL,
        payment_status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_kot_id (kot_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create invoice_items table
    await pool.execute(`
      CREATE TABLE invoice_items (
        id VARCHAR(36) PRIMARY KEY,
        invoice_id VARCHAR(36) NOT NULL,
        dish_id VARCHAR(50) NOT NULL,
        dish_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        INDEX idx_invoice_id (invoice_id)
      )
    `);

    console.log('✅ Tables recreated successfully!');
  } catch (error) {
    console.error('❌ Failed to recreate tables:', error);
  } finally {
    process.exit();
  }
};

recreateTables();