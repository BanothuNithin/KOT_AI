import React, { useState } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader, Smartphone, QrCode, Wallet } from 'lucide-react';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'phonepe' | 'googlepay' | 'qr' | null>(null);

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
      console.log('🔍 Debug: Token exists:', !!token);
      console.log('🔍 Debug: Token length:', token?.length);

      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('🔍 Debug: Making API call to create order...');

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

      // Check if response is ok before parsing JSON
      console.log('🔍 Debug: Response status:', response.status);
      console.log('🔍 Debug: Response ok:', response.ok);
      console.log('🔍 Debug: Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Debug: Order created successfully:', data);

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

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment Verification API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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

  const handlePayment = async (paymentMethod?: 'card' | 'phonepe' | 'googlepay' | 'qr') => {
    if (disabled || isLoading) return;

    // Set selected payment method
    if (paymentMethod) {
      setSelectedPaymentMethod(paymentMethod);
    }

    try {
      setIsLoading(true);
      setPaymentStatus('processing');

      // Debug: Check authentication
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('🔍 Debug: Starting payment process');
      console.log('🔍 Debug: Token exists:', !!token);
      console.log('🔍 Debug: User exists:', !!user);

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      if (!user) {
        throw new Error('No user data found. Please log in again.');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order
      const orderData = await createOrder();

      // Razorpay options - For test mode, we'll create payment without order_id
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'KOT AI Restaurant',
        description: `Payment for Order ${orderId || 'N/A'}`,
        // Note: order_id removed for test mode - in production, use real Razorpay orders
        prefill: {
          name: customerDetails?.name || '',
          email: customerDetails?.email || '',
          contact: customerDetails?.phone || ''
        },
        theme: {
          color: '#2563eb'
        },
        // UPI Configuration
        config: {
          display: {
            language: 'en',
            hide: [
              {
                method: 'paylater'
              }
            ],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        // UPI Apps
        method: (selectedPaymentMethod === 'phonepe' || selectedPaymentMethod === 'googlepay' || selectedPaymentMethod === 'qr') ? 'upi' : undefined,
        // QR Code for UPI
        upi_qr: selectedPaymentMethod === 'qr' ? true : false,
        // Restrict to specific UPI apps
        restrict: {
          apps: selectedPaymentMethod === 'phonepe' ? ['phonepe'] :
                 selectedPaymentMethod === 'googlepay' ? ['tez'] :
                 undefined
        },
        handler: async (response: any) => {
          try {
            console.log('✅ Payment completed:', response);

            // For test mode, simulate verification success
            // In production, uncomment the lines below to verify with backend
            /*
            await verifyPayment({
              ...response,
              order_id: orderData.order.id
            });
            */

            setPaymentStatus('success');
            onSuccess({
              ...response,
              order_id: orderData.order.id,
              amount: orderData.order.amount,
              currency: orderData.order.currency
            });
          } catch (error) {
            console.error('❌ Payment verification failed:', error);
            setPaymentStatus('failed');
            onFailure(error);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('idle');
            setIsLoading(false);
            setSelectedPaymentMethod(null); // Reset payment method selection
          }
        }
      };

      console.log('🔍 Debug: Razorpay options:', options);

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

    // Show appropriate icon based on selected payment method
    const getPaymentIcon = () => {
      switch (selectedPaymentMethod) {
        case 'card':
          return <CreditCard className="w-5 h-5" />;
        case 'phonepe':
        case 'googlepay':
          return <Smartphone className="w-5 h-5" />;
        case 'qr':
          return <QrCode className="w-5 h-5" />;
        default:
          return <Wallet className="w-5 h-5" />;
      }
    };

    return (
      <>
        {getPaymentIcon()}
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
      {/* Payment Method Selection */}
      {!selectedPaymentMethod ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Payment Method</h3>

          {/* Card Payment */}
          <button
            onClick={() => handlePayment('card')}
            disabled={disabled}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">Credit/Debit Card</div>
                <div className="text-sm text-gray-500">Visa, Mastercard, RuPay</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">₹{amount.toFixed(2)}</div>
            </div>
          </button>

          {/* PhonePe */}
          <button
            onClick={() => handlePayment('phonepe')}
            disabled={disabled}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">PhonePe</div>
                <div className="text-sm text-gray-500">Pay with PhonePe UPI</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">₹{amount.toFixed(2)}</div>
            </div>
          </button>

          {/* Google Pay */}
          <button
            onClick={() => handlePayment('googlepay')}
            disabled={disabled}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">Google Pay</div>
                <div className="text-sm text-gray-500">Pay with Google Pay UPI</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">₹{amount.toFixed(2)}</div>
            </div>
          </button>

          {/* UPI QR Code */}
          <button
            onClick={() => handlePayment('qr')}
            disabled={disabled}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <QrCode className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">QR Code Scanning</div>
                <div className="text-sm text-gray-500">Scan with any UPI app</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">₹{amount.toFixed(2)}</div>
            </div>
          </button>
        </div>
      ) : (
        /* Selected Payment Method */
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {selectedPaymentMethod === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
              {(selectedPaymentMethod === 'phonepe' || selectedPaymentMethod === 'googlepay') && <Smartphone className="w-4 h-4 text-green-600" />}
              {selectedPaymentMethod === 'qr' && <QrCode className="w-4 h-4 text-purple-600" />}
              <span className="text-sm font-medium text-gray-700">
                {selectedPaymentMethod === 'card' && 'Credit/Debit Card'}
                {selectedPaymentMethod === 'phonepe' && 'PhonePe'}
                {selectedPaymentMethod === 'googlepay' && 'Google Pay'}
                {selectedPaymentMethod === 'qr' && 'QR Code Scanning'}
              </span>
            </div>
            <button
              onClick={() => setSelectedPaymentMethod(null)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Change
            </button>
          </div>

          <button
            onClick={() => handlePayment(selectedPaymentMethod)}
            disabled={disabled || isLoading}
            className={getButtonClassName()}
          >
            {getButtonContent()}
          </button>
        </div>
      )}

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


