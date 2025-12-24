import pool from './db/connection.js';

const checkUsers = async () => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log('Users count:', rows[0].count);

    if (rows[0].count === 0) {
      console.log('No users found, inserting default admin...');
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const passwordHash = await bcrypt.default.hash('admin123', saltRounds);

      await pool.execute(
        'INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin-user-uuid-12345', 'Admin User', 'admin@smartkot.com', '+1234567890', passwordHash, 'ADMIN']
      );
      console.log('Default admin user created!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
};

checkUsers();

