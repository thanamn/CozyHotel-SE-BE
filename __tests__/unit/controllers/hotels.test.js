const mongoose = require('mongoose');
const { getHotels, createHotel, deleteHotel } = require('../../../controllers/hotels');
const Hotel = require('../../../models/Hotel');
const Booking = require('../../../models/Booking');
const RoomType = require('../../../models/RoomType');

// Mock all required models
jest.mock('../../../models/Hotel');
jest.mock('../../../models/Booking');
jest.mock('../../../models/RoomType');

describe('Hotels Controller', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/v1/hotels', () => {
    it('should filter hotels by province', async () => {
      const testHotels = [
        { name: 'Test Hotel 1', province: 'Bangkok' },
        { name: 'Test Hotel 2', province: 'Bangkok' }
      ];

      mockReq.query = { province: 'Bangkok' };

      // Mock the query chain
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(testHotels)
      };
      Hotel.find.mockReturnValue(mockQuery);
      Hotel.countDocuments.mockResolvedValue(2);

      await getHotels(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: testHotels,
        pagination: expect.any(Object)
      });
    });

    it('should handle empty search results', async () => {
      mockReq.query = { province: 'NonExistent' };

      // Mock empty results
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      Hotel.find.mockReturnValue(mockQuery);
      Hotel.countDocuments.mockResolvedValue(0);

      await getHotels(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: [],
        pagination: expect.any(Object)
      });
    });
  });

  describe('POST /api/v1/hotels', () => {
    it('should handle duplicate hotel names', async () => {
      const duplicateHotel = {
        name: 'Existing Hotel',
        province: 'Bangkok',
        district: 'Pathumwan',
        address: '123 Test St',
        postalcode: '10330',
        tel: '0123456789',
        picture: 'http://example.com/pic.jpg',
        description: 'Test Description'
      };

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        name: new Error('Hotel name already exists')
      };

      Hotel.create.mockRejectedValue(validationError);
      mockReq.body = duplicateHotel;

      await createHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hotel name already exists'
      });
    });

    it('should validate required fields', async () => {
      const invalidHotel = {
        province: 'Bangkok',
        district: 'Pathumwan'
      };

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        name: new Error('Name is required')
      };

      Hotel.create.mockRejectedValue(validationError);
      mockReq.body = invalidHotel;

      await createHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name is required'
      });
    });
  });

  describe('DELETE /api/v1/hotels/:id', () => {
    it('should delete hotel', async () => {
      const testHotel = {
        _id: '507f1f77bcf86cd799439011' // Valid MongoDB ObjectId format
      };

      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockResolvedValue(testHotel);
      Hotel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      // Mock cascade deletes
      Booking.deleteMany.mockResolvedValue({ deletedCount: 0 });
      RoomType.deleteMany.mockResolvedValue({ deletedCount: 0 });

      await deleteHotel(mockReq, mockRes);

      expect(Hotel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Booking.deleteMany).toHaveBeenCalledWith({ hotel: '507f1f77bcf86cd799439011' });
      expect(RoomType.deleteMany).toHaveBeenCalledWith({ hotel: '507f1f77bcf86cd799439011' });
      expect(Hotel.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });
  });
});