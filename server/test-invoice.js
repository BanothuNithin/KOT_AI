import fetch from 'node-fetch';

async function testInvoice() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.token) {
      console.error('No token received');
      return;
    }

    // Test invoice creation
    const invoiceResponse = await fetch('http://localhost:3001/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + loginData.token
      },
      body: JSON.stringify({
        kotId: 'test-kot-123',
        items: [{ dish: { id: 'dish1', name: 'Test Dish', price: 10 }, quantity: 2 }],
        deliveryAddress: '123 Test Street'
      })
    });

    console.log('Invoice Status:', invoiceResponse.status);
    if (invoiceResponse.status !== 200) {
      const errorText = await invoiceResponse.text();
      console.log('Response:', errorText);
    } else {
      console.log('Success: Invoice created');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testInvoice();

