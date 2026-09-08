const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Accept token from header OR query param (needed for <iframe>/<img>/download
  // sources, which cannot attach an Authorization header)
  const token =
    req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json("Not authorized");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json("Not authorized");
  }
};