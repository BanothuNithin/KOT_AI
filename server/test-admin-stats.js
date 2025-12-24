import fetch from 'node-fetch';

async function testAdminDeliveryStats() {
  try {
    console.log('Testing admin login and delivery stats...');

    // Login as admin
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@smartkot.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Admin login response:', loginData);

    if (!loginData.token) {
      console.error('❌ Admin login failed');
      return;
    }

    console.log('✅ Admin login successful');

    // Test delivery stats
    const statsResponse = await fetch('http://localhost:3001/api/delivery-stats', {
      headers: {
        'Authorization': 'Bearer ' + loginData.token
      }
    });

    console.log('Delivery stats status:', statsResponse.status);
    if (statsResponse.status === 200) {
      const stats = await statsResponse.json();
      console.log('✅ Delivery stats retrieved:', stats);
    } else {
      const error = await statsResponse.text();
      console.log('❌ Error getting stats:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAdminDeliveryStats();