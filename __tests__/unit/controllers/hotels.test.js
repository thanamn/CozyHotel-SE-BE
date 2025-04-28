const mongoose = require('mongoose');
const { getHotels, getHotel, createHotel, updateHotel, deleteHotel } = require('../../../controllers/hotels');
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
      params: {},
      body: {}
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

    it('should handle server errors', async () => {
      // Simulate a server error
      Hotel.countDocuments.mockRejectedValue(new Error('Database error'));

      await getHotels(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error'
      });
    });
  });

  describe('GET /api/v1/hotels/:id', () => {
    it('should get a single hotel', async () => {
      const testHotel = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Hotel',
        province: 'Bangkok'
      };

      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockResolvedValue(testHotel);

      await getHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testHotel
      });
    });

    it('should return 404 when hotel not found', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockResolvedValue(null);

      await getHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Hotel not found'
      });
    });

    it('should handle server errors', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockRejectedValue(new Error('Database error'));

      await getHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Server Error'
      });
    });
  });

  describe('POST /api/v1/hotels', () => {
    it('should create a new hotel', async () => {
      const newHotel = {
        name: 'New Hotel',
        province: 'Bangkok',
        district: 'Pathumwan',
        address: '123 Test St',
        postalcode: '10330',
        tel: '0123456789',
        picture: 'http://example.com/pic.jpg',
        description: 'Test Description'
      };

      // Mock findOne to return null (no existing hotel with that name)
      Hotel.findOne.mockResolvedValue(null);
      
      // Mock create to return the new hotel
      Hotel.create.mockResolvedValue(newHotel);
      
      mockReq.body = newHotel;

      await createHotel(mockReq, mockRes);

      expect(Hotel.create).toHaveBeenCalledWith(newHotel);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: newHotel
      });
    });

    it('should handle duplicate hotel name conflicts', async () => {
      const existingHotel = {
        name: 'Existing Hotel',
        province: 'Bangkok'
      };

      // Mock findOne to return an existing hotel
      Hotel.findOne.mockResolvedValue(existingHotel);
      
      mockReq.body = { name: 'Existing Hotel' };

      await createHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hotel name already exists'
      });
    });

    it('should handle server errors', async () => {
      const newHotel = { name: 'Test Hotel' };
      
      // Mock findOne to return null
      Hotel.findOne.mockResolvedValue(null);
      
      // Mock create to throw a non-validation error
      Hotel.create.mockRejectedValue(new Error('Server error'));
      
      mockReq.body = newHotel;

      await createHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });
  });

  describe('PUT /api/v1/hotels/:id', () => {
    it('should update a hotel', async () => {
      const updatedHotel = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Updated Hotel',
        province: 'Bangkok'
      };

      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = { name: 'Updated Hotel' };

      Hotel.findByIdAndUpdate.mockResolvedValue(updatedHotel);

      await updateHotel(mockReq, mockRes);
      
      expect(Hotel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { name: 'Updated Hotel' },
        { new: true, runValidators: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedHotel
      });
    });

    it('should return 404 when hotel not found for update', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = { name: 'Updated Hotel' };

      Hotel.findByIdAndUpdate.mockResolvedValue(null);

      await updateHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Hotel not found'
      });
    });

    it('should handle validation errors during update', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = { name: '' }; // Invalid name

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        name: new Error('Name cannot be empty')
      };

      Hotel.findByIdAndUpdate.mockRejectedValue(validationError);

      await updateHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name cannot be empty'
      });
    });

    it('should handle server errors during update', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = { name: 'Updated Hotel' };

      Hotel.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await updateHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
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

    it('should return 404 when hotel not found for deletion', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockResolvedValue(null);

      await deleteHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: `Hotel not found with id of 507f1f77bcf86cd799439011`
      });
    });

    it('should handle server errors during deletion', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      Hotel.findById.mockRejectedValue(new Error('Database error'));

      await deleteHotel(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });
  });
});