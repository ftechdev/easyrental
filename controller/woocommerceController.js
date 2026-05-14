// WooCommerce proxy controller
const WC_API_URL = process.env.WOOCOMMERCE_API_URL || 'https://www.alrasrentcar.com/wp-json/wc/v3';
const WC_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || 'ck_179bb76ce38a5f77016a55d0dc4b643dc8d202bc';
const WC_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || 'cs_ee360f4e41d656f072491ac694413d42dd0729ef';

// Create basic auth header
const basicAuth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

// WooCommerce proxy controller
export const getWooCommerceOrders = async (req, res) => {
  try {
    const { page = 1, per_page = 20, status, search } = req.query;
    
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (status && status !== 'all') {
      params.append('status', status);
    }
    
    if (search) {
      params.append('search', search);
    }

    // Make request to WooCommerce API
    const response = await fetch(`${WC_API_URL}/orders?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const orders = await response.json();
    
    // Get total count from headers
    const totalCount = response.headers.get('X-WP-Total') || '0';
    const totalPages = response.headers.get('X-WP-TotalPages') || '1';

    res.json({
      success: true,
      orders,
      total: parseInt(totalCount),
      totalPages: parseInt(totalPages),
    });
  } catch (error) {
    console.error('WooCommerce proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getWooCommerceOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(`${WC_API_URL}/orders/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const order = await response.json();
    
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('WooCommerce proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updateWooCommerceOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const response = await fetch(`${WC_API_URL}/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
      }),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const order = await response.json();
    
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('WooCommerce proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteWooCommerceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await fetch(`${WC_API_URL}/orders/${id}?force=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    const order = await response.json();
    
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('WooCommerce proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getWooCommerceOrderStats = async (req, res) => {
  try {
    // Get orders with different statuses to calculate stats
    const [allOrders, pendingOrders, processingOrders, completedOrders, cancelledOrders] = await Promise.all([
      fetch(`${WC_API_URL}/orders?per_page=1`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      }),
      fetch(`${WC_API_URL}/orders?status=pending&per_page=1`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      }),
      fetch(`${WC_API_URL}/orders?status=processing&per_page=1`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      }),
      fetch(`${WC_API_URL}/orders?status=completed&per_page=1`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      }),
      fetch(`${WC_API_URL}/orders?status=cancelled&per_page=1`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      }),
    ]);

    const totalOrders = parseInt(allOrders.headers.get('X-WP-Total') || '0');
    const pendingCount = parseInt(pendingOrders.headers.get('X-WP-Total') || '0');
    const processingCount = parseInt(processingOrders.headers.get('X-WP-Total') || '0');
    const completedCount = parseInt(completedOrders.headers.get('X-WP-Total') || '0');
    const cancelledCount = parseInt(cancelledOrders.headers.get('X-WP-Total') || '0');

    // Calculate total revenue from completed orders
    let totalRevenue = 0;
    if (completedCount > 0) {
      const completedOrdersResponse = await fetch(`${WC_API_URL}/orders?status=completed&per_page=100`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      });
      const completedOrdersData = await completedOrdersResponse.json();
      totalRevenue = completedOrdersData.reduce((sum, order) => {
        return sum + parseFloat(order.total || '0');
      }, 0);
    }

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders: pendingCount,
        processingOrders: processingCount,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error('WooCommerce stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
