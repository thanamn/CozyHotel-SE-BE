const { checkManagerHotelAccess } = require('../../../middleware/managerAuth');
const User = require('../../../models/User');

jest.mock('../../../models/User');

describe('Manager Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    mockReq = {
      params: { hotelId: 'testHotelId' },
      user: {
        id: 'testUserId',
        role: 'manager'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('checkManagerHotelAccess', () => {
    it('should require hotel ID', async () => {
      mockReq.params.hotelId = undefined;
      await checkManagerHotelAccess(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hotel ID is required'
      });
    });

    it('should check manager role', async () => {
      mockReq.user.role = 'user';
      await checkManagerHotelAccess(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Only managers can perform this action.'
      });
    });

    it('should check hotel access permission', async () => {
      User.findById.mockResolvedValue({
        managedHotels: ['differentHotelId']
      });

      await checkManagerHotelAccess(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this hotel.'
      });
    });

    it('should grant access to managed hotel', async () => {
      User.findById.mockResolvedValue({
        managedHotels: ['testHotelId']
      });

      await checkManagerHotelAccess(mockReq, mockRes, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      // Mock an error being thrown during database access
      User.findById.mockRejectedValue(new Error('Database error'));

      await checkManagerHotelAccess(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });
});