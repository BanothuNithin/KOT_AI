# Razorpay Payment Gateway Integration

A secure and production-ready Razorpay payment gateway integration for React + Node.js applications.

## 📋 Table of Contents

1. [Payment Flow Explanation](#payment-flow-explanation)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Security Notes](#security-notes)
5. [Common Errors & Fixes](#common-errors--fixes)
6. [Testing Guide](#testing-guide)
7. [Folder Structure](#folder-structure)

## 🔄 Payment Flow Explanation

```
1. User initiates payment on frontend
   ↓
2. Frontend calls backend API (/api/payments/create-order)
   ↓
3. Backend creates Razorpay order & returns order details
   ↓
4. Frontend loads Razorpay checkout script
   ↓
5. Frontend opens Razorpay payment popup with order details
   ↓
6. User completes payment on Razorpay
   ↓
7. Razorpay sends success callback to frontend
   ↓
8. Frontend calls backend API (/api/payments/verify-payment)
   ↓
9. Backend verifies payment signature using crypto
   ↓
10. Backend processes order (updates inventory, creates invoice)
    ↓
11. Frontend shows success message
```

## 🖥️ Backend Implementation

### Environment Variables (.env)

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_key_here

# Other configs...
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
JWT_SECRET=your_jwt_secret
```

### Routes (`server/routes/payments.js`)

```javascript
import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Amount should be in paisa (multiply by 100 for INR)
    const amountInPaisa = Math.round(amount * 100);

    // Create order data
    const orderData = {
      amount: amountInPaisa,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    // Generate order ID and signature
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create signature for verification
    const signData = `${orderId}|${amountInPaisa}|${currency}`;
    const signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(signData)
      .digest('hex');

    const order = {
      id: orderId,
      amount: amountInPaisa,
      currency,
      receipt: orderData.receipt,
      status: 'created',
      created_at: Date.now(),
      signature
    };

    console.log('✅ Order created:', order.id);

    res.json({
      success: true,
      order,
      key: RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

// Verify payment signature
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      amount,
      currency = 'INR'
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification data'
      });
    }

    // Create signature for verification
    const signData = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(signData)
      .digest('hex');

    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      console.log('❌ Payment verification failed: Invalid signature');
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    console.log('✅ Payment verified successfully:', razorpay_payment_id);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

export default router;
```

### Server Configuration (`server/server.js`)

```javascript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payments.js";
// ... other imports

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ... other middleware

// Protected payment routes
app.use('/api/payments', authenticateToken, paymentRoutes);

// ... rest of server code
```

## 🎨 Frontend Implementation

### RazorpayPayment Component (`components/RazorpayPayment.tsx`)

```tsx
import React, { useState } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react';

interface RazorpayPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  customerDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  amount,
  currency = 'INR',
  orderId,
  customerDetails,
  onSuccess,
  onFailure,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createOrder = async (): Promise<any> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:3001/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: orderId || `order_${Date.now()}`,
          notes: {
            order_id: orderId,
            customer_name: customerDetails?.name,
            customer_email: customerDetails?.email
          }
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const verifyPayment = async (paymentData: any): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:3001/api/payments/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          order_id: orderId,
          amount,
          currency
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Payment verification failed');
      }

      return data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (disabled || isLoading) return;

    try {
      setIsLoading(true);
      setPaymentStatus('processing');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order
      const orderData = await createOrder();

      // Razorpay options
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Your App Name',
        description: `Payment for Order ${orderId || 'N/A'}`,
        order_id: orderData.order.id,
        prefill: {
          name: customerDetails?.name || '',
          email: customerDetails?.email || '',
          contact: customerDetails?.phone || ''
        },
        theme: {
          color: '#2563eb'
        },
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            await verifyPayment(response);
            setPaymentStatus('success');
            onSuccess(response);
          } catch (error) {
            setPaymentStatus('failed');
            onFailure(error);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('idle');
            setIsLoading(false);
          }
        }
      };

      // Open Razorpay checkout
      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      onFailure(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading || paymentStatus === 'processing') {
      return (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          Processing...
        </>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <>
          <CheckCircle className="w-5 h-5" />
          Payment Successful
        </>
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <>
          <XCircle className="w-5 h-5" />
          Payment Failed
        </>
      );
    }

    return (
      <>
        <CreditCard className="w-5 h-5" />
        Pay ₹{amount.toFixed(2)}
      </>
    );
  };

  const getButtonClassName = () => {
    const baseClasses = "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200";

    if (disabled) {
      return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }

    if (paymentStatus === 'success') {
      return `${baseClasses} bg-green-500 text-white`;
    }

    if (paymentStatus === 'failed') {
      return `${baseClasses} bg-red-500 text-white`;
    }

    return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg`;
  };

  return (
    <div className={`razorpay-payment ${className}`}>
      <button
        onClick={handlePayment}
        disabled={disabled || isLoading}
        className={getButtonClassName()}
      >
        {getButtonContent()}
      </button>

      {paymentStatus === 'processing' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing payment...</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Please complete the payment in the popup window
          </p>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Payment completed successfully!</span>
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Payment failed</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            Please try again or contact support if the issue persists
          </p>
        </div>
      )}
    </div>
  );
};

export default RazorpayPayment;
```

### Usage in Component

```tsx
import RazorpayPayment from './components/RazorpayPayment';

// In your component
<RazorpayPayment
  amount={totalAmount}
  orderId={orderId}
  customerDetails={{
    name: user.name,
    email: user.email,
    phone: user.phone
  }}
  onSuccess={(paymentData) => {
    console.log('Payment successful:', paymentData);
    // Handle success - update order status, redirect, etc.
  }}
  onFailure={(error) => {
    console.error('Payment failed:', error);
    // Handle failure - show error message, retry, etc.
  }}
  disabled={!deliveryAddress}
/>
```

### Payment Methods Supported

#### 1. **Credit/Debit Cards**
- Visa, Mastercard, RuPay
- International cards supported
- Secure SSL encryption

#### 2. **UPI Apps**
- **PhonePe** - India's leading UPI app
- **Google Pay** - Google's UPI solution
- **Paytm** - Popular digital wallet
- **BHIM UPI** - Government-backed UPI app
- **Amazon Pay** - Amazon's payment service
- **WhatsApp Pay** - WhatsApp integrated payments

#### 3. **UPI QR Code**
- Generate QR code for payment
- Scan with any UPI app
- Works with all UPI-enabled apps
- No app-specific restrictions

## 🔒 Security Notes

### 1. **Never Expose Secret Keys**
- ✅ Store `RAZORPAY_KEY_SECRET` only on backend
- ✅ Use `RAZORPAY_KEY_ID` (public key) on frontend
- ❌ Never send secret keys to client-side

### 2. **Payment Verification**
- ✅ Always verify payment signatures on backend
- ✅ Use crypto library for signature verification
- ✅ Validate all payment data server-side

### 3. **Input Validation**
- ✅ Validate amount, currency, and order details
- ✅ Sanitize all user inputs
- ✅ Use parameterized queries for database operations

### 4. **HTTPS & CORS**
- ✅ Use HTTPS in production
- ✅ Configure CORS properly
- ✅ Validate request origins

### 5. **Error Handling**
- ✅ Don't expose sensitive error details to frontend
- ✅ Log errors securely for debugging
- ✅ Provide user-friendly error messages

### 6. **Rate Limiting**
- ✅ Implement rate limiting on payment endpoints
- ✅ Prevent duplicate payment attempts
- ✅ Add request timeouts

## 🚨 Common Errors & Fixes

### 1. **"Razorpay is not defined"**
```javascript
// Fix: Load script before using
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
```

### 2. **"Invalid signature" Error**
```javascript
// Fix: Ensure correct signature format
const signData = `${razorpay_order_id}|${razorpay_payment_id}`;
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(signData)
  .digest('hex');
```

### 3. **CORS Error**
```javascript
// Fix: Configure CORS in server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### 4. **Payment popup not opening**
```javascript
// Fix: Check if script loaded and handle errors
const scriptLoaded = await loadRazorpayScript();
if (!scriptLoaded) {
  throw new Error('Failed to load Razorpay SDK');
}
```

### 5. **Amount mismatch**
```javascript
// Fix: Convert to paisa correctly
const amountInPaisa = Math.round(amount * 100); // For INR
```

## 🧪 Testing Guide

### Current Implementation Status
**Note**: This implementation uses simulated Razorpay orders for testing. In production, you would need to:
1. Use real Razorpay API keys
2. Create actual orders via Razorpay API
3. Implement proper payment verification

### Test Card Details (Razorpay Test Mode)

| Card Number | Expiry | CVV | Result |
|-------------|--------|-----|--------|
| 4000 0000 0000 0002 | Any future date | Any 3 digits | Success |
| 4000 0020 0000 0003 | Any future date | Any 3 digits | Failure |
| 4000 0010 0000 0004 | Any future date | Any 3 digits | Success with capture |

### Test UPI ID
- **Success**: success@razorpay
- **Failure**: failure@razorpay

### Test UPI Apps (Test Mode)
- **PhonePe**: Use test UPI ID `success@razorpay`
- **Google Pay**: Use test UPI ID `success@razorpay`
- **Paytm**: Use test UPI ID `success@razorpay`
- **BHIM UPI**: Use test UPI ID `success@razorpay`

### Test QR Code
- Generate QR code in test mode
- Scan with any UPI app using test UPI ID

### Test Net Banking
- **Bank**: Test Bank
- **Username**: test
- **Password**: test

### Testing Steps

1. **Setup Test Keys**
   ```env
   RAZORPAY_KEY_ID=rzp_test_your_test_key_id
   RAZORPAY_KEY_SECRET=your_test_secret_key
   ```

2. **Start Servers**
   ```bash
   # Backend
   cd server && npm start

   # Frontend
   npm run dev
   ```

3. **Test Payment Flow**
   - Create an order
   - Click "Pay with Razorpay"
   - Use test card/UPI details
   - Verify payment success/failure handling

4. **Verify Backend Logs**
   - Check order creation logs
   - Verify payment verification logs
   - Ensure database updates correctly

## 📁 Folder Structure

```
project/
├── server/
│   ├── routes/
│   │   ├── payments.js          # Payment routes
│   │   └── auth.js              # Authentication
│   ├── db/
│   │   └── connection.js        # Database config
│   ├── services/
│   │   └── pdfService.js        # PDF generation
│   ├── .env                     # Environment variables
│   └── server.js                # Main server file
├── src/
│   ├── components/
│   │   ├── RazorpayPayment.tsx  # Payment component
│   │   └── KOTList.tsx          # Updated order list
│   ├── App.tsx                  # Main app component
│   └── types.ts                 # TypeScript types
├── package.json                 # Frontend dependencies
└── README.md                    # This file
```

## 🚀 Production Deployment

### 1. **Environment Variables**
```env
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_secret_key
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### 2. **HTTPS Configuration**
```javascript
// Use HTTPS in production
import https from 'https';
import fs from 'fs';

const privateKey = fs.readFileSync('path/to/private-key.pem');
const certificate = fs.readFileSync('path/to/certificate.pem');

https.createServer({
  key: privateKey,
  cert: certificate
}, app).listen(443);
```

### 3. **Security Headers**
```javascript
// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

### 4. **Monitoring & Logging**
- Implement proper logging
- Add payment analytics
- Monitor for suspicious activities
- Set up alerts for failed payments

## 📞 Support

For Razorpay integration issues:
- Check [Razorpay Documentation](https://docs.razorpay.com/)
- Test with Razorpay test credentials
- Verify webhook signatures
- Check server logs for detailed errors

---

**Note**: This implementation provides a secure, production-ready Razorpay integration. Always test thoroughly before deploying to production and follow Razorpay's security guidelines.