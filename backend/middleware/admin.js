/**
 * Admin Middleware
 * 
 * Role-Based Middleware Logic:
 * - This middleware runs AFTER the auth middleware, so req.user is already set
 * - It checks if the authenticated user has the 'Admin' role
 * - If yes, the request proceeds to the route handler
 * - If no, a 403 Forbidden response is returned
 * 
 * Usage: router.post('/', auth, admin, controllerFunction)
 * This ensures the route is both authenticated AND admin-only
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = admin;
