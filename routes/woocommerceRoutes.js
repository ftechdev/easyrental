const express = require('express');
const {
  getWooCommerceOrders,
  getWooCommerceOrderById,
  updateWooCommerceOrderStatus,
  deleteWooCommerceOrder,
  getWooCommerceOrderStats,
} = require('../controller/woocommerceController');

const router = express.Router();

// GET /api/woocommerce/orders - Get all orders with optional filters
router.get('/orders', getWooCommerceOrders);

// GET /api/woocommerce/orders/:id - Get specific order
router.get('/orders/:id', getWooCommerceOrderById);

// PUT /api/woocommerce/orders/:id/status - Update order status
router.put('/orders/:id/status', updateWooCommerceOrderStatus);

// DELETE /api/woocommerce/orders/:id - Delete order
router.delete('/orders/:id', deleteWooCommerceOrder);

// GET /api/woocommerce/stats - Get order statistics
router.get('/stats', getWooCommerceOrderStats);

module.exports = router;
