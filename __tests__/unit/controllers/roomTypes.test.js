const mongoose = require('mongoose');
const { getRoomTypes, getRoomType, createRoomType, updateRoomType, deleteRoomType } = require('../../../controllers/roomTypes');
const RoomType = require('../../../models/RoomType');
const Booking = require('../../../models/Booking');

// Mock RoomType and Booking models
jest.mock('../../../models/RoomType');
jest.mock('../../../models/Booking');

describe('RoomTypes Controller', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    mockReq = {
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

  describe('GET /api/v1/roomtypes', () => {
    it('should get all room types', async () => {
      const mockRoomTypes = [
        { name: 'Deluxe Room', capacity: 2 },
        { name: 'Suite', capacity: 4 }
      ];

      RoomType.find.mockResolvedValue(mockRoomTypes);

      await getRoomTypes(mockReq, mockRes);

      expect(RoomType.find).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoomTypes
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      RoomType.find.mockRejectedValue(error);

      await getRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('GET /api/v1/roomtypes/:id', () => {
    it('should return 404 if room type not found', async () => {
      RoomType.findById.mockResolvedValue(null);
      mockReq.params.id = '507f1f77bcf86cd799439011';

      await getRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'RoomType not found'
      });
    });
  });

  describe('POST /api/v1/roomtypes', () => {
    it('should handle validation errors', async () => {
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        name: new Error('Name is required')
      };

      RoomType.create.mockRejectedValue(validationError);
      mockReq.body = { capacity: 2 }; // Missing required name field

      await createRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: ['Name is required']
      });
    });
  });

  describe('PUT /api/v1/roomtypes/:id', () => {
    it('should update a room type', async () => {
      const updatedRoomType = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Updated Room',
        capacity: 3
      };

      RoomType.findByIdAndUpdate.mockResolvedValue(updatedRoomType);
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = { name: 'Updated Room', capacity: 3 };

      await updateRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedRoomType
      });
    });
  });

  describe('DELETE /api/v1/roomtypes/:id', () => {
    it('should delete a room type', async () => {
      const testRoomType = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Room'
      };

      mockReq.params.id = '507f1f77bcf86cd799439011';
      RoomType.findById.mockResolvedValue(testRoomType);
      Booking.deleteMany.mockResolvedValue({ deletedCount: 0 });
      RoomType.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteRoomType(mockReq, mockRes);

      expect(RoomType.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Booking.deleteMany).toHaveBeenCalledWith({ roomType: '507f1f77bcf86cd799439011' });
      expect(RoomType.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });
  });
});