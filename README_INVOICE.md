# Setup Instructions for SmartKOT Invoice System

## Prerequisites
1. Install MySQL Server (https://dev.mysql.com/downloads/mysql/)
2. Create a database user with privileges

## Database Setup
1. Start MySQL service
2. Run the SQL script in `server/db/schema.sql` to create the database and tables

## Environment Variables
Update the `.env` file with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=smartkot_db
DB_PORT=3306
```

## Installation
```bash
npm install
```

## Running the Application
1. Start the backend server:
```bash
npm run dev
```

2. In another terminal, start the frontend:
```bash
npm run dev
```

## API Endpoints
- POST /api/customers - Create customer
- GET /api/customers/:phone - Get customer by phone
- POST /api/invoices - Create invoice
- GET /api/invoices/:id - Get invoice by ID
- GET /api/invoices/by-kot/:kotId - Get invoice by KOT ID
- GET /api/invoices/:id/pdf - Download invoice PDF

## Database Schema
- customers: id (UUID), name, phone, email, address, created_at
- invoices: id (UUID), invoice_number, customer_id, kot_id, subtotal, tax, total, status, created_at
- invoice_items: id (UUID), invoice_id, dish_id, dish_name, quantity, unit_price, total_price