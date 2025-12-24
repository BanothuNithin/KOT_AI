import fetch from 'node-fetch';

const testAuth = async () => {
  try {
    console.log('Testing registration...');
    const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'password123'
      }),
    });

    const registerData = await registerResponse.json();
    console.log('Register response:', registerResponse.status, registerData);

    if (registerResponse.ok) {
      console.log('Testing login...');
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
      });

      const loginData = await loginResponse.json();
      console.log('Login response:', loginResponse.status, loginData);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testAuth();