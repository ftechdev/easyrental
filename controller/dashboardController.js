const pool = require("../config/DB");

exports.getQuickStats = async (req, res) => {
  try {
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);

    // 1. Total Revenue (from paid bookings)
    const [revenueResult] = await pool.query(
      "SELECT SUM(total_price) as total FROM bookings WHERE payment_status = 'paid' OR payment_status = 'completed'"
    );
    const totalRevenue = revenueResult[0].total || 0;

    // 2. New Bookings (last 7 days)
    const [newBookingsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE created_at >= ?",
      [lastWeek]
    );
    const newBookings = newBookingsResult[0].count || 0;

    // 3. Rented Cars (active bookings)
    const [rentedCarsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'approved' AND return_date >= ?",
      [now]
    );
    const rentedCars = rentedCarsResult[0].count || 0;

    // 4. Available Cars
    const [totalCarsResult] = await pool.query(
      "SELECT SUM(units_available) as total FROM cars"
    );
    const totalCars = totalCarsResult[0].total || 0;
    const availableCars = Math.max(0, totalCars - rentedCars);

    // 5. Earnings Data (last 6 months)
    const [earningsResult] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        SUM(total_price) as amount
      FROM bookings
      WHERE (payment_status = 'paid' OR payment_status = 'completed')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), month
      ORDER BY MIN(created_at) ASC
    `);

    // 6. Bookings Data (last 6 months)
    const [bookingsResult] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as count
      FROM bookings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), month
      ORDER BY MIN(created_at) ASC
    `);

    // 7. Car Type Distribution
    const [carTypesResult] = await pool.query(`
      SELECT 
        category_name as type,
        COUNT(*) as count
      FROM cars
      GROUP BY category_name
    `);
    
    const totalCarTypes = carTypesResult.reduce((sum, item) => sum + item.count, 0);
    const carTypes = carTypesResult.map(item => ({
      type: item.type || 'Other',
      percentage: totalCarTypes > 0 ? Math.round((item.count / totalCarTypes) * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue,
          newBookings,
          rentedCars,
          availableCars,
        },
        earningsData: earningsResult,
        bookingsData: bookingsResult.map(b => ({ month: b.month, bookings: b.count })),
        carTypes,
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
