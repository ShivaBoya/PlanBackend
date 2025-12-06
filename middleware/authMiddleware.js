const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // console.log("🔒 Auth Middleware Hit:", req.originalUrl); // Debug Log
    // console.log("   Cookies:", req.cookies); // Debug Log

    const token = req.cookies.jwt; // FIXED: Matches 'jwt' set in authRoutes.js

    if (!token)
      return res.status(401).json({ message: "Unauthorized - No Token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };

    next();
  } catch (error) {
    // console.error("❌ Auth Error:", error.message);
    res.status(401).json({ message: "Unauthorized - Invalid Token" });
  }
};
