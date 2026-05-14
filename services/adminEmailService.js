// Backend admin email service for user registration notifications
const fetch = require('node-fetch');

const ADMIN_EMAILS = [
  'amirhost007@gmail.com',
  'bookings@easyrental.com',
  'easyrentalbooking@gmail.com',
  'info@easyrental.com',
  'dreamsweaver1@gmail.com',
  'easyrentalllc@gmail.com'
];

const FROM_EMAIL = 'easyrentalbooking@gmail.com';

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
  }).format(amount);
};

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function to create user-friendly ID
const createUserFriendlyId = (id) => {
  if (!id) return 'N/A';
  // Take first 8 characters of UUID and add a prefix
  return `USR-${id.substring(0, 8).toUpperCase()}`;
};

// Helper function to create user-friendly booking ID
const createFriendlyBookingId = (id) => {
  if (!id) return 'N/A';
  // Take first 8 characters of UUID and add a prefix
  return `BK-${id.substring(0, 8).toUpperCase()}`;
};

// Helper function to create user-friendly location ID
const createFriendlyLocationId = (id) => {
  if (!id) return 'N/A';
  // Take first 8 characters of UUID and add a prefix
  return `LOC-${id.substring(0, 8).toUpperCase()}`;
};

// Generate user registration email HTML template
const generateUserRegistrationEmailTemplate = (user) => {
  const registrationDate = formatDate(user.created_at);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration - Easy Rental</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #28a745; margin-bottom: 15px; border-bottom: 2px solid #28a745; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .info-label { font-weight: bold; color: #555; margin-bottom: 5px; }
        .info-value { color: #333; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
        .role-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .role-user { background: #d1ecf1; color: #0c5460; }
        .role-guest { background: #fff3cd; color: #856404; }
        .role-admin { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👤 New User Registration</h1>
          <p>A new user has registered on Easy Rental</p>
        </div>
        
        <div class="content">
          <!-- User Overview -->
          <div class="section">
            <h3>📋 User Overview</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">User ID</div>
                <div class="info-value">#${user.id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Registration Date</div>
                <div class="info-value">${registrationDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">User Role</div>
                <div class="info-value">
                  <span class="role-badge role-${user.role}">${user.role}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Verification Status</div>
                <div class="info-value">${user.is_verified ? '✅ Verified' : '⏳ Pending'}</div>
              </div>
            </div>
          </div>

          <!-- Personal Information -->
          <div class="section">
            <h3>👤 Personal Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Full Name</div>
                <div class="info-value">${user.first_name} ${user.last_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${user.email}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${user.phone || 'Not provided'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Alternative Phone</div>
                <div class="info-value">${user.alternative_phone || 'Not provided'}</div>
              </div>
            </div>
            
            ${user.driving_license_number ? `
            <div class="info-item" style="margin-top: 15px;">
              <div class="info-label">Driving License Number</div>
              <div class="info-value">${user.driving_license_number}</div>
            </div>
            ` : ''}
            
            ${user.date_of_birth ? `
            <div class="info-item" style="margin-top: 15px;">
              <div class="info-label">Date of Birth</div>
              <div class="info-value">${formatDate(user.date_of_birth)}</div>
            </div>
            ` : ''}
          </div>

          <!-- Additional Information -->
          <div class="section">
            <h3>📍 Additional Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">UAE Resident</div>
                <div class="info-value">${user.is_uae_resident ? 'Yes' : 'No'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">License Status</div>
                <div class="info-value">${user.license_older_than_6_months ? 'Valid (6+ months)' : 'New (< 6 months)'}</div>
              </div>
              ${user.google_id ? `
              <div class="info-item">
                <div class="info-label">Registration Method</div>
                <div class="info-value">Google OAuth</div>
              </div>
              ` : `
              <div class="info-item">
                <div class="info-label">Registration Method</div>
                <div class="info-value">Email & Password</div>
              </div>
              `}
            </div>
          </div>

          <!-- Profile Information -->
          ${user.address_id ? `
          <div class="section">
            <h3>🏠 Address Information</h3>
            <div class="info-item">
              <div class="info-label">Address ID</div>
              <div class="info-value">#${user.address_id}</div>
            </div>
          </div>
          ` : ''}

          <!-- Documents Status -->
          ${(user.emirates_id_front || user.emirates_id_back || user.license_front || user.license_back || user.passport_front || user.passport_back) ? `
          <div class="section">
            <h3>📄 Documents Uploaded</h3>
            <div class="info-grid">
              ${user.emirates_id_front ? '<div class="info-item">✅ Emirates ID Front</div>' : ''}
              ${user.emirates_id_back ? '<div class="info-item">✅ Emirates ID Back</div>' : ''}
              ${user.license_front ? '<div class="info-item">✅ License Front</div>' : ''}
              ${user.license_back ? '<div class="info-item">✅ License Back</div>' : ''}
              ${user.passport_front ? '<div class="info-item">✅ Passport Front</div>' : ''}
              ${user.passport_back ? '<div class="info-item">✅ Passport Back</div>' : ''}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This is an automated notification from Easy Rental Registration System.</p>
            <p>Please review the user information in your admin panel.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate booking email HTML template
const generateBookingEmailTemplate = (booking) => {
  const bookingDate = formatDate(booking.createdAt);
  const pickupDate = formatDate(booking.pickupDate);
  const returnDate = formatDate(booking.returnDate);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking - Easy Rental</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .section { margin-bottom: 25px; }
        .section h3 { color: #007bff; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .info-label { font-weight: bold; color: #666; margin-bottom: 5px; }
        .info-value { color: #333; }
        .status { padding: 5px 10px; border-radius: 5px; font-weight: bold; text-transform: uppercase; }
        .status.approved { background: #28a745; color: white; }
        .status.pending { background: #ffc107; color: #212529; }
        .status.cancelled { background: #dc3545; color: white; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 New Booking Received</h1>
          <p>A new booking has been created in the system</p>
        </div>
        
        <div class="content">
          <!-- Booking Information -->
          <div class="section">
            <h3>📋 Booking Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Booking ID</div>
                <div class="info-value"><strong>${createFriendlyBookingId(booking.bookingId)}</strong></div>
              </div>
              <div class="info-item">
                <div class="info-label">Booking Date</div>
                <div class="info-value">${bookingDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="status ${booking.status}">${booking.status}</span></div>
              </div>
              <div class="info-item">
                <div class="info-label">Total Amount</div>
                <div class="info-value"><strong>${formatCurrency(booking.totalAmount || 0)}</strong></div>
              </div>
            </div>
          </div>

          <!-- Car Information -->
          <div class="section">
            <h3>🚙 Car Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Car Name</div>
                <div class="info-value">${booking.carName || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value">${booking.categoryName || 'N/A'}</div>
              </div>
            </div>
          </div>

          <!-- Rental Period -->
          <div class="section">
            <h3>📅 Rental Period</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Pickup Date</div>
                <div class="info-value">${pickupDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Return Date</div>
                <div class="info-value">${returnDate}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Pickup Location</div>
                <div class="info-value">${booking.pickupLocationName || 'N/A'} ${booking.pickupLocation ? `(${createFriendlyLocationId(booking.pickupLocation)})` : ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Return Location</div>
                <div class="info-value">${booking.returnLocationName || 'N/A'} ${booking.returnLocation ? `(${createFriendlyLocationId(booking.returnLocation)})` : ''}</div>
              </div>
            </div>
          </div>

          <!-- Customer Information -->
          <div class="section">
            <h3>👤 Customer Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${booking.userName || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${booking.userEmail || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${booking.userMobile || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">User ID</div>
                <div class="info-value">${createUserFriendlyId(booking.userId)}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated notification from Easy Rental Booking System.</p>
            <p>Please review the booking details in your admin panel.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send booking details email to admins
const sendBookingToAdmins = async (booking) => {
  try {
    // Validate environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP configuration is missing');
      return { success: false, message: 'Email service not configured: SMTP settings missing' };
    }

    console.log('Sending booking email to admins via SMTP...');
    console.log('Booking data:', {
      bookingId: booking.bookingId,
      userName: booking.userName,
      carName: booking.carName,
      totalAmount: booking.totalAmount
    });

    const emailHtml = generateBookingEmailTemplate(booking);
    const { sendEmail } = require('./Mail/nodemailer');
    
    const result = await sendEmail(
      ADMIN_EMAILS,
      `New Booking: ${booking.carName || 'Unknown Car'} - ${booking.userName || 'Unknown Customer'}`,
      emailHtml
    );

    console.log('Booking notification sent to admins successfully via SMTP:', result.messageId);
    return { success: true, message: 'Booking notification sent successfully', data: result };
  } catch (error) {
    console.error('Error sending booking notification via SMTP:', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, message: error.message };
  }
};

// Send user registration details email to admins
const sendUserRegistrationToAdmins = async (user) => {
  try {
    // Validate environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP configuration is missing');
      return { success: false, message: 'Email service not configured: SMTP settings missing' };
    }

    const emailHtml = generateUserRegistrationEmailTemplate(user);
    const { sendEmail } = require('./Mail/nodemailer');
    
    const result = await sendEmail(
      ADMIN_EMAILS,
      `New User Registration: ${user.first_name} ${user.last_name}`,
      emailHtml
    );

    console.log('User registration email sent successfully via SMTP:', result.messageId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send user registration email via SMTP:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendUserRegistrationToAdmins,
  sendBookingToAdmins,
  ADMIN_EMAILS,
  FROM_EMAIL
};
