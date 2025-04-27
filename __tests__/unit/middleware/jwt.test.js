const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../../middleware/auth');

describe('JWT Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRE = '30d';
    req = {
      headers: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('protect middleware', () => {
    it('should return 401 if no token provided', async () => {
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
    });

    it('should verify Bearer token', async () => {
      const user = { _id: 'testid', name: 'Test User' };
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;
      
      // Mock User.findById
      const User = require('../../../models/User');
      User.findById = jest.fn().mockResolvedValue(user);

      await protect(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid';
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
    });
  });

  describe('authorize middleware', () => {
    it('should allow authorized roles', () => {
      req.user = { role: 'admin' };
      const middleware = authorize('admin');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthorized roles', () => {
      req.user = { role: 'user' };
      const middleware = authorize('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role user is not authorized to access this route'
      });
    });
  });
});