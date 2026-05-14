const checkAdmin = (req, res, next) => {
  console.log("Response in userdetails by token :", req.user);
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      Code: 403,

      success: false,
      message: "Access denied ,only  admin can access.",
    });
  }
};

module.exports = checkAdmin;
