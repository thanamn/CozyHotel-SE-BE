const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../../middleware/auth');
const User = require('../../../models/User');

jest.mock('../../../models/User');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    mockReq = {
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('protect', () => {
    beforeEach(() => {
      mockReq.headers = {};
    });

    it('should fail if no token is provided', async () => {
      await protect(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should verify Bearer token', async () => {
      const token = jwt.sign({ id: '680bb9ce56478ddfbda18c89' }, process.env.JWT_SECRET);
      mockReq.headers.authorization = `Bearer ${token}`;
      
      const mockUser = { _id: '680bb9ce56478ddfbda18c89' };
      User.findById.mockResolvedValue(mockUser);

      await protect(mockReq, mockRes, nextFunction);

      expect(User.findById).toHaveBeenCalledWith('680bb9ce56478ddfbda18c89');
      expect(mockReq.user).toBe(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await protect(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorize to access this route'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow authorized roles', () => {
      mockReq.user = { role: 'admin' };
      const middleware = authorize('admin', 'manager');

      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject unauthorized roles', () => {
      mockReq.user = { role: 'user' };
      const middleware = authorize('admin', 'manager');

      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role user is not authorized to access this route'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle missing user', () => {
      mockReq.user = null;
      const middleware = authorize('admin');

      middleware(mockReq, mockRes, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User role undefined is not authorized to access this route'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});