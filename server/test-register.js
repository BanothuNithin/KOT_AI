import fetch from 'node-fetch';

const testRegister = async () => {
  try {
    console.log('Testing registration endpoint...');

    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test2@example.com',
        phone: '+1234567891',
        password: 'password123'
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);

  } catch (error) {
    console.error('Error:', error);
  }
};

testRegister();

