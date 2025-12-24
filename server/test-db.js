import pool from './db/connection.js';

const testDB = async () => {
  try {
    console.log('Testing database tables...');

    // Check users table
    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log('Users table exists, count:', users[0].count);

    // Check invoices table
    const [invoices] = await pool.execute('SELECT COUNT(*) as count FROM invoices');
    console.log('Invoices table exists, count:', invoices[0].count);

    // Check invoice_items table
    const [items] = await pool.execute('SELECT COUNT(*) as count FROM invoice_items');
    console.log('Invoice_items table exists, count:', items[0].count);

    console.log('✅ All tables exist!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    process.exit();
  }
};

testDB();