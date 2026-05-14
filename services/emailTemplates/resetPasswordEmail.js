module.exports = (data) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
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
    
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #1e3c72;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    
    .button:hover {
      background-color: #2a5298;
    }
    
    .highlight-box {
      background: #f8f9fa;
      border-left: 4px solid #1e3c72;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777777;
    }
    
    .info-text {
      margin-bottom: 20px;
      color: #555555;
    }
    
    .expiry-notice {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
      font-size: 14px;
    }
    
    @media only screen and (max-width: 600px) {
      .button {
        display: block;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <!-- Replace with actual Al Ras logo URL -->
      <img src="https://res.cloudinary.com/dt7qppfbh/image/upload/v1746604473/al_ras_logo_f06xxu.jpg" alt="Al Ras Car and Bus Rental" class="logo">
      <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
      <div class="highlight-box">
        <p style="text-align: center; margin: 0;">We received a request to reset your password for your Al Ras Car and Bus Rental account.</p>
      </div>
      
      <p class="info-text">Hello ${data.userName || "Customer"},</p>
      <p class="info-text">You recently requested to reset your password for your Al Ras Car and Bus Rental account. Click the button below to proceed.</p>
      
      <div class="button-container">
        <a href="${data.resetLink}" class="button">Reset Your Password</a>
      </div>
      
      <div class="expiry-notice">
        <strong>⚠ This link will expire in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.
      </div>
      
      <p class="info-text">If you're having trouble with the button above, copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #555555; background: #f5f5f5; padding: 10px; border-radius: 4px;">
        ${data.resetLink}
      </p>
      
      <div class="divider"></div>
      
      <h2>Need Help?</h2>
      <p class="info-text">If you didn't request this password reset or need additional assistance, please contact our support team immediately:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="mailto:support@alrasrentcar.com" style="color: #1e3c72; text-decoration: none;">support@alrasrentcar.com</a><br>
        <span style="color: #555555;">+971 55 925 4955</span>
      </p>
    </div>
    

  <div class="footer" style="font-size: 14px; color: #555; text-align: center; margin-top: 30px;">
    <p>This is an automated message. Please do not reply directly to this email.</p>
    <p>© ${new Date().getFullYear()} Al Ras Car and Bus Rental LLC. All rights reserved.</p>
    <p>
      <a href="${process.env.FRONTEND_URL
  }" style="color: #1e3c72; text-decoration: none;">Website</a> | 
      <a href="${process.env.FRONTEND_URL
  }/terms-conditions" style="color: #1e3c72; text-decoration: none;">Terms</a> | 
      <a href="${process.env.FRONTEND_URL
  }/privacy-policy" style="color: #1e3c72; text-decoration: none;">Privacy Policy</a>
    </p>
  </div>

  </div>
</body>
</html>
`;