const { sendEmail } = require("./nodemailer");

const customMail = async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await sendEmail(to, subject, message);
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      response,
    });
  } catch (error) {
    console.error('Email sending failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = customMail;
