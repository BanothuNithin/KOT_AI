import express from 'express';
import pool from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { generateInvoicePDF } from '../services/pdfService.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Generate invoice number (format: INV-YYYYMMDD-XXXX)
const generateInvoiceNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${dateStr}-${random}`;
};

// Create invoice after successful payment
// User data comes from JWT, only delivery address is required during checkout
router.post('/invoices', async (req, res) => {
  console.log('INVOICE ROUTE: Request received');
  console.log('INVOICE REQUEST BODY:', req.body);
  console.log('USER FROM JWT:', req.user);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { kotId, items, deliveryAddress } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!kotId || !items || !deliveryAddress || !Array.isArray(items)) {
      return res.status(400).json({ error: 'KOT ID, items, and delivery address are required' });
    }

    // Fetch user data from database (security: never trust client data)
    const [users] = await connection.execute(
      'SELECT name, email, phone FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Calculate totals server-side (never trust client calculations)
    const subtotal = items.reduce((sum, item) => {
      const price = item.dish ? item.dish.price : item.price;
      const quantity = item.quantity;
      return sum + (price * quantity);
    }, 0);
    const taxRate = 0.18; // 18% GST
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    const invoiceId = uuidv4();

    // Create invoice record - links to user, not separate customer
    await connection.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, kot_id, delivery_address, subtotal, tax, total, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
      [invoiceId, invoiceNumber, userId, kotId, deliveryAddress, subtotal, tax, total]
    );

    // Create invoice items
    for (const item of items) {
      const itemId = uuidv4();
      const dishId = item.dish ? item.dish.id : item.dishId;
      const dishName = item.dish ? item.dish.name : item.name;
      const unitPrice = item.dish ? item.dish.price : item.price;
      await connection.execute(
        `INSERT INTO invoice_items (id, invoice_id, dish_id, dish_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, invoiceId, dishId, dishName, item.quantity, unitPrice, unitPrice * item.quantity]
      );
    }

    await connection.commit();

    // Generate PDF with complete user data from database
    const invoiceData = {
      invoiceNumber,
      kotId,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      deliveryAddress,
      items,
      subtotal,
      tax,
      total,
      createdAt: new Date()
    };

    const pdfBuffer = await generateInvoicePDF(invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    await connection.rollback();
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    connection.release();
  }
});

// Get delivery statistics (admin only)
router.get('/delivery-stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Total deliveries (paid invoices)
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as total_deliveries FROM invoices WHERE payment_status = "paid"'
    );

    // Today's deliveries
    const today = new Date().toISOString().split('T')[0];
    const [todayResult] = await pool.execute(
      'SELECT COUNT(*) as today_deliveries FROM invoices WHERE payment_status = "paid" AND DATE(created_at) = ?',
      [today]
    );

    // This week's deliveries
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const [weekResult] = await pool.execute(
      'SELECT COUNT(*) as week_deliveries FROM invoices WHERE payment_status = "paid" AND DATE(created_at) >= ?',
      [weekStartStr]
    );

    // This month's deliveries
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const [monthResult] = await pool.execute(
      'SELECT COUNT(*) as month_deliveries FROM invoices WHERE payment_status = "paid" AND DATE(created_at) >= ?',
      [monthStartStr]
    );

    // Total revenue
    const [revenueResult] = await pool.execute(
      'SELECT SUM(total) as total_revenue FROM invoices WHERE payment_status = "paid"'
    );

    // Average order value
    const [avgResult] = await pool.execute(
      'SELECT AVG(total) as avg_order_value FROM invoices WHERE payment_status = "paid"'
    );

    res.json({
      totalDeliveries: totalResult[0].total_deliveries || 0,
      todayDeliveries: todayResult[0].today_deliveries || 0,
      weekDeliveries: weekResult[0].week_deliveries || 0,
      monthDeliveries: monthResult[0].month_deliveries || 0,
      totalRevenue: revenueResult[0].total_revenue || 0,
      avgOrderValue: avgResult[0].avg_order_value || 0
    });

  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ error: 'Failed to fetch delivery statistics' });
  }
});

// Get user's invoices (only their own)
router.get('/invoices', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [invoices] = await pool.execute(
      `SELECT i.id, i.invoice_number, i.delivery_address, i.subtotal, i.tax, i.total,
              i.payment_status, i.created_at, u.name, u.email, u.phone
       FROM invoices i
       JOIN users u ON i.user_id = u.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Download specific invoice PDF (only user's own invoices)
router.get('/invoices/:invoiceId/download', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.userId;

    // Verify invoice belongs to user (security: prevent access to other users' invoices)
    const [invoices] = await pool.execute(
      `SELECT i.*, u.name, u.email, u.phone
       FROM invoices i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ? AND i.user_id = ?`,
      [invoiceId, userId]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [items] = await pool.execute(
      'SELECT dish_name, quantity, unit_price, total_price FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );

    // Generate PDF
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      user: {
        name: invoice.name,
        email: invoice.email,
        phone: invoice.phone
      },
      deliveryAddress: invoice.delivery_address,
      items: items.map(item => ({
        name: item.dish_name,
        quantity: item.quantity,
        price: item.unit_price
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      createdAt: invoice.created_at
    };

    const pdfBuffer = await generateInvoicePDF(invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// Get invoice details (only user's own)
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.userId;

    // Verify invoice belongs to user
    const [invoices] = await pool.execute(
      `SELECT i.*, u.name, u.email, u.phone
       FROM invoices i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ? AND i.user_id = ?`,
      [invoiceId, userId]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Get invoice items
    const [items] = await pool.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );

    res.json({
      invoice: {
        ...invoice,
        items
      }
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice
    const [invoiceRows] = await pool.execute(
      'SELECT i.*, c.name as customer_name, c.phone, c.email, c.address FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?',
      [id]
    );

    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get invoice items
    const [itemRows] = await pool.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY dish_name',
      [id]
    );

    const invoice = invoiceRows[0];
    invoice.items = itemRows;

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoices by customer
router.get('/customers/:customerId/invoices', async (req, res) => {
  try {
    const { customerId } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice by KOT ID
router.get('/invoices/by-kot/:kotId', async (req, res) => {
  try {
    const { kotId } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM invoices WHERE kot_id = ?',
      [kotId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching invoice by KOT ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download invoice PDF
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    console.log('PDF download requested for invoice:', req.params.id);
    const { id } = req.params;

    const pdfBuffer = await generateInvoicePDF(id);

    console.log('PDF generated successfully, sending response...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error in PDF route:', error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

