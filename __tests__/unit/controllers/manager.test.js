const { getManagedHotels } = require('../../../controllers/manager');
const User = require('../../../models/User');

jest.mock('../../../models/User');

describe('Manager Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'manager'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/v1/manager/hotels', () => {
    it('should get hotels managed by the authenticated manager', async () => {
      const managedHotels = [
        { _id: '507f1f77bcf86cd799439012', name: 'Hotel 1' },
        { _id: '507f1f77bcf86cd799439013', name: 'Hotel 2' }
      ];

      const mockPopulate = jest.fn().mockResolvedValue({ managedHotels });
      User.findById = jest.fn().mockReturnValue({
        populate: () => mockPopulate()
      });

      await getManagedHotels(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: managedHotels
      });
    });

    it('should return empty array for manager with no hotels', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({ managedHotels: [] });
      User.findById = jest.fn().mockReturnValue({
        populate: () => mockPopulate()
      });

      await getManagedHotels(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });
  });
});