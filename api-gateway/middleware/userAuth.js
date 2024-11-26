import jwt from "jsonwebtoken";

const EXCLUDED_ROUTES = [
  { route: "/login", method: "POST" },
  { route: "/signup", method: "POST" },
];

const verifyToken = (requiredRole) => (req, res, next) => {
  const isExcluded = EXCLUDED_ROUTES.some(
    (excluded) =>
      excluded.route === req.path &&
      (!excluded.method || excluded.method === req.method)
  );

  if (isExcluded) {
    return next();
  }

  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACC_SECRET);

    const currentTime = Math.floor(Date.now() / 1000);

    if (decoded.exp < currentTime) {
      res.status(403).json({ message: "Token has expired" });
      return;
    }

    if (decoded.role !== requiredRole) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    req.headers['x-user-payload'] = JSON.stringify(decoded);
    next();
  } catch (err) {
    console.log(err);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};


export default verifyToken;
