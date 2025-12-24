import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Validate Razorpay configuration
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

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

    // Generate order ID and signature (simulating Razorpay SDK)
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

    // Here you would typically:
    // 1. Update order status in database
    // 2. Process the order (update inventory, create invoice, etc.)
    // 3. Send confirmation email/SMS

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

// Get payment status (optional utility endpoint)
router.get('/payment-status/:payment_id', authenticateToken, async (req, res) => {
  try {
    const { payment_id } = req.params;

    // In a real implementation, you would call Razorpay API to get payment status
    // For now, we'll return a mock response
    res.json({
      success: true,
      payment_id,
      status: 'captured', // captured, failed, pending, etc.
      amount: 10000, // in paisa
      currency: 'INR',
      method: 'card', // card, netbanking, wallet, upi
      created_at: Date.now()
    });

  } catch (error) {
    console.error('❌ Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

export default router;

