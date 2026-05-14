const jwt = require("jsonwebtoken");
require("dotenv").config();

function checkAuthMiddle(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token not provided",
    });
  }

  const accessToken = authHeader.split(" ")[1];

  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      console.log("Unauthorized user, error is:", error.message);
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or expired token",
      });
    }

    req.user = decoded;
    next();
  });
}

module.exports = checkAuthMiddle;
