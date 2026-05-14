const generateEmailBody = (data) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    
    body {
      font-family: 'Poppins', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f7f7f7;
      margin: 0;
      padding: 0;
    }
    
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    
    .logo {
      max-width: 180px;
      margin-bottom: 15px;
    }
    
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .divider {
      border-top: 1px solid #eeeeee;
      margin: 20px 0;
    }
    
    .content {
      padding: 25px;
    }
    
    h2 {
      color: #1e3c72;
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 12px;
    }
    
    .info-label {
      font-weight: 500;
      color: #555555;
      width: 160px;
      flex-shrink: 0;
    }
    
    .info-value {
      flex-grow: 1;
    }
    
    .car-image-container {
      text-align: center;
      margin: 20px 0;
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
    }
    
    .car-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .highlight-box {
      background: #f8f9fa;
      border-left: 4px solid #1e3c72;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    
    .price {
      font-size: 22px;
      font-weight: 700;
      color: #1e3c72;
    }
    
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777777;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #28a745;
      color: white;
      border-radius: 20px;
      font-weight: 500;
      font-size: 14px;
    }
    
    @media only screen and (max-width: 600px) {
      .info-row {
        flex-direction: column;
      }
      
      .info-label {
        width: 100%;
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Replace with actual Al Ras logo URL -->
      <img src="https://res.cloudinary.com/dt7qppfbh/image/upload/v1746604473/al_ras_logo_f06xxu.jpg" alt="Al Ras Car and Bus Rental" class="logo">
      <h1>Booking Confirmation</h1>
    </div>
    
    <div class="content">
      <div class="highlight-box">
        <div style="text-align: center; margin-bottom: 10px;">
          <span class="status-badge">${data.status || "Pending"}</span>
        </div>
        <p style="text-align: center; margin: 0;">Thank you for booking with Al Ras Car and Bus Rental! Your reservation for the <strong>${data.carName || "Vehicle"}</strong> is confirmed.</p>
      </div>
      
      <h2>📌 Booking Summary</h2>
      <div class="info-row">
        <div class="info-label">Booking Reference:</div>
        <div class="info-value">${data.bookingId || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Total Amount:</div>
        <div class="info-value price">${typeof data.totalPrice === "number" ? data.totalPrice : data.totalPrice || 0} AED</div>
      </div>
      <div class="info-row">
        <div class="info-label">Payment Method:</div>
        <div class="info-value">${data.paymentMethod || "N/A"}</div>
      </div>
      
      <div class="divider"></div>
      
      <h2>🚗 Vehicle Details</h2>
      <div class="car-image-container">
        <img src="${data.carSingleImage || ""}" alt="${data.carName || ""}" class="car-image">
      </div>
      <div class="info-row">
        <div class="info-label">Vehicle:</div>
        <div class="info-value"><strong>${data.carName || "N/A"}</strong></div>
      </div>
      
      <div class="info-row">
        <div class="info-label">CDW:</div>
        <div class="info-value">${data.cdwSunny ? "✅ Selected" : "❌ Not selected"}</div>
      </div>
      
      <div class="divider"></div>
      
      <h2>📅 Rental Period</h2>
      <div class="info-row">
        <div class="info-label">Pickup Date:</div>
        <div class="info-value">${data.pickupDate ? new Date(data.pickupDate).toLocaleString() : "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Return Date:</div>
        <div class="info-value">${data.returnDate ? new Date(data.returnDate).toLocaleString() : "N/A"}</div>
      </div>

      <!-- Pickup location block (now includes sublocation name & delivery fee if available) -->
      <div class="info-row">
        <div class="info-label">Pickup Location:</div>
        <div class="info-value">
          ${data.pickupLocationName || data.pickupLocation || "N/A"}
          ${data.pickupSublocationName ? ` — <em>${data.pickupSublocationName}</em>` : ""}
          ${typeof data.pickupDeliveryCost === "number" ? ` ${data.pickupDeliveryCost > 0 ? `(Delivery: ${data.pickupDeliveryCost} AED)` : `(Free)`}` : ""}
        </div>
      </div>

      <!-- Return location block (now includes sublocation name & delivery fee if available) -->
      <div class="info-row">
        <div class="info-label">Return Location:</div>
        <div class="info-value">
          ${data.returnLocationName || data.returnLocation || "N/A"}
          ${data.returnSublocationName ? ` — <em>${data.returnSublocationName}</em>` : ""}
          ${typeof data.returnDeliveryCost === "number" ? ` ${data.returnDeliveryCost > 0 ? `(Delivery: ${data.returnDeliveryCost} AED)` : `(Free)`}` : ""}
        </div>
      </div>
      
      <div class="divider"></div>
      
      <h2>👤 Renter Information</h2>
      <div class="info-row">
        <div class="info-label">Full Name:</div>
        <div class="info-value">${data.userName || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Email:</div>
        <div class="info-value">${data.userEmail || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Mobile:</div>
        <div class="info-value">${data.userMobile || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">UAE Resident:</div>
        <div class="info-value">${data.isUaeResident ? "Yes" : "No"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">License Number:</div>
        <div class="info-value">${data.drivingLicenseNumber || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">License Status:</div>
        <div class="info-value">${data.licenseStatus || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Additional Driver:</div>
        <div class="info-value">${data.additionalDriver ? "Yes" : "No"}</div>
      </div>
      
    ${
      data.deliveryAddress
        ? `
  <div class="divider"></div>

  <h2>🏠 Delivery Address</h2>
  <p>${[
    data.deliveryAddress.street,
    data.deliveryAddress.city,
    data.deliveryAddress.zip,
    data.deliveryAddress.country
  ].filter(Boolean).join(", ")}</p>
  `
        : ""
    }

      <div class="divider"></div>
      
      <h2>💳 Payment Details</h2>
      <div class="info-row">
        <div class="info-label">Payment Status:</div>
        <div class="info-value">${data.paymentStatus || "Pending"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Payment Gateway:</div>
        <div class="info-value">${data.paymentGateway || data.paymentMethod || "N/A"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Total Rental Fee:</div>
        <div class="info-value">${typeof data.totalPrice === "number" ? data.totalPrice : data.totalPrice || 0} AED</div>
      </div>
      <div class="info-row">
        <div class="info-label">Addon Charges:</div>
        <div class="info-value">${typeof data.addOnCharges === "number" ? data.addOnCharges : data.addOnCharges || 0} AED</div>
      </div>
      
      <div class="highlight-box">
        <p style="margin: 0;">Need to modify your booking? Contact our customer service at <a href="mailto:info@alrasrentcar.com">info@alrasrentcar.com</a> or call +97167475354‬</p>
      </div>
    </div>
    
   
  <div class="footer" style="font-size: 14px; color: #555; text-align: center; margin-top: 30px;">
    <p>This is an automated message. Please do not reply directly to this email.</p>
    <p>© ${new Date().getFullYear()} Al Ras Car and Bus Rental LLC. All rights reserved.</p>
    <p>
      <a href="${process.env.FRONTEND_URL || "#"}" style="color: #1e3c72; text-decoration: none;">Website</a> | 
      <a href="${(process.env.FRONTEND_URL || "#") + "/terms-conditions"}" style="color: #1e3c72; text-decoration: none;">Terms</a> | 
      <a href="${(process.env.FRONTEND_URL || "#") + "/privacy-policy"}" style="color: #1e3c72; text-decoration: none;">Privacy Policy</a>
    </p>
  </div>
  </div>
</body>
</html>
`;

module.exports = { generateEmailBody };
