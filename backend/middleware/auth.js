// backend/middleware/auth.js
import jwt from "jsonwebtoken";

/**
 * Middleware to verify JWT token
 * Protects routes that require authentication
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        error: "Access denied. No token provided." 
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // Token is invalid or expired
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: "Token has expired. Please login again." 
          });
        }
        return res.status(403).json({ 
          error: "Invalid token." 
        });
      }

      // Attach user info to request object
      req.user = user;
      next();
    });

  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ 
      error: "Authentication failed." 
    });
  }
};

/**
 * Middleware to check if user has required role
 * Use after authenticateToken
 * 
 * @param {Array|String} roles - Allowed roles (e.g., ['owner'] or 'owner')
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    // Ensure roles is an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access denied. Insufficient permissions.",
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Optional authentication
 * If token is provided, verify it, but don't reject if missing
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token, but that's okay
      req.user = null;
      return next();
    }

    // Verify token if provided
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // Invalid token, treat as unauthenticated
        req.user = null;
      } else {
        // Valid token
        req.user = user;
      }
      next();
    });

  } catch (error) {
    console.error("Optional auth error:", error);
    req.user = null;
    next();
  }
};