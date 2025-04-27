const { getUsers, getUser, updateUser, deleteUser } = require('../../../controllers/accounts');
const User = require('../../../models/User');
const Booking = require('../../../models/Booking');

jest.mock('../../../models/User');
jest.mock('../../../models/Booking');

describe('Accounts Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/v1/accounts', () => {
    it('should get all users with pagination', async () => {
      const mockUsers = [
        { _id: '507f1f77bcf86cd799439011', name: 'User 1' },
        { _id: '507f1f77bcf86cd799439012', name: 'User 2' }
      ];

      User.countDocuments.mockResolvedValue(2);
      const mockFind = jest.fn().mockReturnThis();
      const mockSkip = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue(mockUsers);
      
      User.find = mockFind;
      User.find().skip = mockSkip;
      User.find().skip().limit = mockLimit;

      await getUsers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          total: 2
        }
      });
    });

    it('should handle pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '5' };

      User.countDocuments.mockResolvedValue(15);
      const mockFind = jest.fn().mockReturnThis();
      const mockSkip = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);
      
      User.find = mockFind;
      User.find().skip = mockSkip;
      User.find().skip().limit = mockLimit;

      await getUsers(mockReq, mockRes);

      expect(mockSkip).toHaveBeenCalledWith(5);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /api/v1/accounts/:id', () => {
    it('should get user by ID', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', name: 'User 1' };
      mockReq.params.id = mockUser._id;
      User.findById.mockResolvedValue(mockUser);

      await getUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should handle user not found', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      User.findById.mockResolvedValue(null);

      await getUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('PUT /api/v1/accounts/:id', () => {
    it('should update user details', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', name: 'Updated User' };
      mockReq.params.id = mockUser._id;
      mockReq.body = { name: 'Updated User' };
      
      User.findByIdAndUpdate.mockResolvedValue(mockUser);

      await updateUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });
  });

  describe('DELETE /api/v1/accounts/:id', () => {
    it('should delete user and related bookings', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011' };
      mockReq.params.id = mockUser._id;

      User.findById.mockResolvedValue(mockUser);
      Booking.deleteMany.mockResolvedValue({ deletedCount: 2 });
      User.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteUser(mockReq, mockRes);

      expect(Booking.deleteMany).toHaveBeenCalledWith({ user: mockUser._id });
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: mockUser._id });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });
  });
});