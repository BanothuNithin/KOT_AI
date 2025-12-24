-- SmartKOT Database Schema
-- Run this SQL to create the database and tables

CREATE DATABASE IF NOT EXISTS smartkot_db;

-- Users table for authentication and profile data
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
);

-- Invoices table (linked to users, not separate customers)
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
);

-- Invoice items table
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
);

-- Insert default admin user (password: admin123)
INSERT INTO users (id, name, email, phone, password_hash, role)
VALUES (
  'admin-user-uuid-12345',
  'Admin User',
  'admin@smartkot.com',
  '+1234567890',
  '$2b$10$KBE0p.UJ5ABZRAXH2B15P.T3Zqo7qodsdL.EJEUKBT/C.27gyOLU6',
  'ADMIN'
);
