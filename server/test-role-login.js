import fetch from 'node-fetch';

const testLogin = async (email, password, role) => {
  try {
    console.log(`Testing login for ${role}: ${email}`);
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      }),
    });

    const data = await response.json();
    console.log(`${role} login response:`, response.status, data);

    if (response.ok && data.token) {
      console.log(`${role} login successful! Token received.`);
    } else {
      console.log(`${role} login failed.`);
    }
    console.log('---');
  } catch (error) {
    console.error(`Error testing ${role} login:`, error);
  }
};

const runTests = async () => {
  await testLogin('admin@smartkot.com', 'admin123', 'Admin');
  await testLogin('chef@smartkot.com', 'chef123', 'Chef');
  await testLogin('user@smartkot.com', 'user123', 'User');
};

runTests();

