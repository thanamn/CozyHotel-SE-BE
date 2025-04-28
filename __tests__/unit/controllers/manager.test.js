const { 
  getManagedHotels, 
  getHotelBookings, 
  getHotelRoomTypes, 
  createRoomType,
  updateRoomType,
  deleteRoomType,
  updateBooking,
  updateHotel,
  deleteBooking
} = require('../../../controllers/manager');
const User = require('../../../models/User');
const Hotel = require('../../../models/Hotel');
const RoomType = require('../../../models/RoomType');
const Booking = require('../../../models/Booking');

jest.mock('../../../models/User');
jest.mock('../../../models/Hotel');
jest.mock('../../../models/RoomType');
jest.mock('../../../models/Booking');

describe('Manager Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'manager'
      },
      params: {
        hotelId: '507f1f77bcf86cd799439012',
        id: '507f1f77bcf86cd799439013'
      },
      body: {}
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

    it('should handle server errors', async () => {
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getManagedHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('GET /api/v1/manager/hotels/:hotelId/bookings', () => {
    it('should get all bookings for a specific hotel', async () => {
      const bookings = [
        { _id: '507f1f77bcf86cd799439014', hotel: '507f1f77bcf86cd799439012' },
        { _id: '507f1f77bcf86cd799439015', hotel: '507f1f77bcf86cd799439012' }
      ];
      
      // Create a proper mock for the chained populate calls
      const populateChain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(bookings)
        })
      };
      
      Booking.find = jest.fn().mockReturnValue(populateChain);

      await getHotelBookings(mockReq, mockRes);

      expect(Booking.find).toHaveBeenCalledWith({ hotel: mockReq.params.hotelId });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: bookings
      });
    });

    it('should handle server errors', async () => {
      Booking.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getHotelBookings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('GET /api/v1/manager/hotels/:hotelId/roomtypes', () => {
    it('should get all room types for a specific hotel', async () => {
      const roomTypes = [
        { _id: '507f1f77bcf86cd799439016', hotelId: '507f1f77bcf86cd799439012' },
        { _id: '507f1f77bcf86cd799439017', hotelId: '507f1f77bcf86cd799439012' }
      ];
      
      RoomType.find = jest.fn().mockResolvedValue(roomTypes);

      await getHotelRoomTypes(mockReq, mockRes);

      expect(RoomType.find).toHaveBeenCalledWith({ hotelId: mockReq.params.hotelId });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: roomTypes
      });
    });

    it('should handle server errors', async () => {
      RoomType.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getHotelRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('POST /api/v1/manager/hotels/:hotelId/roomtypes', () => {
    it('should create a new room type for a hotel', async () => {
      const newRoomType = {
        _id: '507f1f77bcf86cd799439018',
        hotelId: '507f1f77bcf86cd799439012',
        name: 'Deluxe Room'
      };
      
      mockReq.body = { name: 'Deluxe Room' };
      
      RoomType.create = jest.fn().mockResolvedValue(newRoomType);

      await createRoomType(mockReq, mockRes);

      expect(RoomType.create).toHaveBeenCalledWith({
        ...mockReq.body,
        hotelId: mockReq.params.hotelId
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: newRoomType
      });
    });

    it('should handle server errors', async () => {
      RoomType.create = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await createRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('PUT /api/v1/manager/roomtypes/:id', () => {
    it('should update a room type', async () => {
      const updatedRoomType = {
        _id: '507f1f77bcf86cd799439013',
        name: 'Updated Room',
        hotelId: { toString: () => '507f1f77bcf86cd799439012' }
      };
      
      mockReq.body = { name: 'Updated Room' };
      
      RoomType.findById = jest.fn().mockResolvedValue(updatedRoomType);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] 
      });
      RoomType.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedRoomType);

      await updateRoomType(mockReq, mockRes);

      expect(RoomType.findById).toHaveBeenCalledWith(mockReq.params.id);
      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(RoomType.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.id,
        mockReq.body,
        { new: true, runValidators: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedRoomType
      });
    });

    it('should return 404 if room type is not found', async () => {
      RoomType.findById = jest.fn().mockResolvedValue(null);

      await updateRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Room type not found'
      });
    });

    it('should return 403 if manager does not have permission', async () => {
      const roomType = {
        _id: '507f1f77bcf86cd799439013',
        hotelId: { toString: () => '507f1f77bcf86cd799439014' } // Different hotel
      };
      
      RoomType.findById = jest.fn().mockResolvedValue(roomType);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] // Does not include the hotel of the room type
      });

      await updateRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this room type.'
      });
    });

    it('should handle server errors', async () => {
      RoomType.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await updateRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('DELETE /api/v1/manager/roomtypes/:id', () => {
    it('should delete a room type', async () => {
      const roomType = {
        _id: '507f1f77bcf86cd799439013',
        hotelId: { toString: () => '507f1f77bcf86cd799439012' },
        deleteOne: jest.fn().mockResolvedValue({})
      };
      
      RoomType.findById = jest.fn().mockResolvedValue(roomType);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] 
      });

      await deleteRoomType(mockReq, mockRes);

      expect(RoomType.findById).toHaveBeenCalledWith(mockReq.params.id);
      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(roomType.deleteOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });

    it('should return 404 if room type is not found', async () => {
      RoomType.findById = jest.fn().mockResolvedValue(null);

      await deleteRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Room type not found'
      });
    });

    it('should return 403 if manager does not have permission', async () => {
      const roomType = {
        _id: '507f1f77bcf86cd799439013',
        hotelId: { toString: () => '507f1f77bcf86cd799439014' } // Different hotel
      };
      
      RoomType.findById = jest.fn().mockResolvedValue(roomType);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] // Does not include the hotel of the room type
      });

      await deleteRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this room type.'
      });
    });

    it('should handle server errors', async () => {
      RoomType.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await deleteRoomType(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('PUT /api/v1/manager/bookings/:id', () => {
    it('should update a booking', async () => {
      const booking = {
        _id: '507f1f77bcf86cd799439013',
        hotel: { toString: () => '507f1f77bcf86cd799439012' }
      };
      
      const updatedBooking = {
        _id: '507f1f77bcf86cd799439013',
        hotel: '507f1f77bcf86cd799439012',
        status: 'confirmed'
      };
      
      mockReq.body = { status: 'confirmed' };
      
      Booking.findById = jest.fn().mockResolvedValue(booking);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] 
      });
      
      // Properly mock chained populate calls
      const populateStub = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(updatedBooking)
        })
      };
      
      Booking.findByIdAndUpdate = jest.fn().mockReturnValue(populateStub);

      await updateBooking(mockReq, mockRes);

      expect(Booking.findById).toHaveBeenCalledWith(mockReq.params.id);
      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(Booking.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.id,
        mockReq.body,
        { new: true, runValidators: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedBooking
      });
    });

    it('should return 404 if booking is not found', async () => {
      Booking.findById = jest.fn().mockResolvedValue(null);

      await updateBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found'
      });
    });

    it('should return 403 if manager does not have permission', async () => {
      const booking = {
        _id: '507f1f77bcf86cd799439013',
        hotel: { toString: () => '507f1f77bcf86cd799439014' } // Different hotel
      };
      
      Booking.findById = jest.fn().mockResolvedValue(booking);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] // Does not include the hotel of the booking
      });

      await updateBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this booking.'
      });
    });

    it('should handle server errors', async () => {
      Booking.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await updateBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('PUT /api/v1/manager/hotels/:hotelId', () => {
    it('should update a hotel', async () => {
      const hotel = {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        name: 'Original Hotel Name'
      };
      
      const updatedHotel = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Updated Hotel Name'
      };
      
      mockReq.body = { name: 'Updated Hotel Name' };
      
      Hotel.findById = jest.fn().mockResolvedValue(hotel);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] 
      });
      Hotel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedHotel);

      await updateHotel(mockReq, mockRes);

      expect(Hotel.findById).toHaveBeenCalledWith(mockReq.params.hotelId);
      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(Hotel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockReq.params.hotelId,
        mockReq.body,
        { new: true, runValidators: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedHotel
      });
    });

    it('should return 404 if hotel is not found', async () => {
      Hotel.findById = jest.fn().mockResolvedValue(null);

      await updateHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hotel not found'
      });
    });

    it('should return 403 if manager does not have permission', async () => {
      const hotel = {
        _id: { toString: () => '507f1f77bcf86cd799439012' }
      };
      
      Hotel.findById = jest.fn().mockResolvedValue(hotel);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439014'] // Does not include the hotel ID
      });

      await updateHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this hotel.'
      });
    });

    it('should handle server errors', async () => {
      Hotel.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await updateHotel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });

  describe('DELETE /api/v1/manager/bookings/:id', () => {
    it('should delete a booking', async () => {
      const booking = {
        _id: '507f1f77bcf86cd799439013',
        hotel: { toString: () => '507f1f77bcf86cd799439012' },
        deleteOne: jest.fn().mockResolvedValue({})
      };
      
      Booking.findById = jest.fn().mockResolvedValue(booking);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] 
      });

      await deleteBooking(mockReq, mockRes);

      expect(Booking.findById).toHaveBeenCalledWith(mockReq.params.id);
      expect(User.findById).toHaveBeenCalledWith(mockReq.user.id);
      expect(booking.deleteOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {}
      });
    });

    it('should return 404 if booking is not found', async () => {
      Booking.findById = jest.fn().mockResolvedValue(null);

      await deleteBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found'
      });
    });

    it('should return 403 if manager does not have permission', async () => {
      const booking = {
        _id: '507f1f77bcf86cd799439013',
        hotel: { toString: () => '507f1f77bcf86cd799439014' } // Different hotel
      };
      
      Booking.findById = jest.fn().mockResolvedValue(booking);
      User.findById = jest.fn().mockResolvedValue({ 
        managedHotels: ['507f1f77bcf86cd799439012'] // Does not include the hotel of the booking
      });

      await deleteBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to manage this booking.'
      });
    });

    it('should handle server errors', async () => {
      Booking.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await deleteBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server Error'
      });
    });
  });
});