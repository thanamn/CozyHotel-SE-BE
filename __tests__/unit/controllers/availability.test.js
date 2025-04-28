const { getAvailableRoomTypes, getAvailableHotels } = require('../../../controllers/availability');
const Hotel = require('../../../models/Hotel');
const RoomType = require('../../../models/RoomType');

jest.mock('../../../models/Hotel');
jest.mock('../../../models/RoomType');

describe('Availability Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      query: {
        hotelId: '680bb3faadf03841289ca40f',
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-03'
      }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/v1/availability/room-types', () => {
    it('should return available room types for given dates', async () => {
      const mockHotel = { _id: mockReq.query.hotelId };
      const mockRoomTypes = [{
        _id: '680bb3faadf03841289ca410',
        totalRooms: 5
      }];
      const mockAvailability = {
        roomTypeId: '680bb3faadf03841289ca410',
        totalRooms: 5,
        bookedRooms: 0,
        availableRooms: 5,
        isActivated: true
      };

      Hotel.findById.mockResolvedValue(mockHotel);
      RoomType.find.mockResolvedValue(mockRoomTypes);
      RoomType.checkAvailability.mockResolvedValue(mockAvailability);

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hotelId: mockReq.query.hotelId,
          checkInDate: expect.any(Date),
          checkOutDate: expect.any(Date),
          availableRoomTypes: expect.arrayContaining([
            expect.objectContaining({
              roomTypeId: mockAvailability.roomTypeId,
              availableRooms: mockAvailability.availableRooms,
              isActivated: mockAvailability.isActivated
            })
          ])
        }
      });
    });

    it('should handle non-existent hotel', async () => {
      Hotel.findById.mockResolvedValue(null);
      RoomType.find.mockResolvedValue([]);

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.any(String)
      });
    });

    it('should handle invalid date format', async () => {
      mockReq.query.checkInDate = 'invalid-date';

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Invalid date format')
      });
    });

    it('should validate check-in is before check-out', async () => {
      mockReq.query.checkInDate = '2025-06-03';
      mockReq.query.checkOutDate = '2025-06-01';

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Check-in date must be before check-out date')
      });
    });

    it('should handle server errors', async () => {
      // Mock a server error
      const error = new Error('Server error');
      RoomType.find.mockRejectedValue(error);

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: error.message
      });
    });

    it('should require all query parameters', async () => {
      // Test with missing hotelId
      mockReq.query = {
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-03'
      };

      await getAvailableRoomTypes(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Please provide hotelId, checkInDate, and checkOutDate')
      });
    });
  });

  describe('GET /api/v1/availability/hotels', () => {
    beforeEach(() => {
      mockReq.query = {
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-03'
      };
    });

    it('should return available hotels for given dates', async () => {
      const mockHotels = [
        { 
          _id: '680bb3faadf03841289ca40f',
          name: 'Test Hotel',
          address: '123 Test St'
        }
      ];
      
      const mockRoomTypes = [{
        _id: '680bb3faadf03841289ca410',
        hotelId: '680bb3faadf03841289ca40f',
        totalRooms: 5
      }];

      const mockAvailability = {
        roomTypeId: '680bb3faadf03841289ca410',
        status: 'available',
        totalRooms: 5,
        bookedRooms: 0,
        availableRooms: 5,
        isActivated: true
      };

      Hotel.find.mockResolvedValue(mockHotels);
      RoomType.find.mockResolvedValue(mockRoomTypes);
      RoomType.checkAvailability.mockResolvedValue(mockAvailability);

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          checkInDate: expect.any(Date),
          checkOutDate: expect.any(Date),
          availableHotels: expect.arrayContaining([
            expect.objectContaining({
              hotelId: mockHotels[0]._id,
              hotelName: mockHotels[0].name,
              hasAvailableRooms: true
            })
          ])
        }
      });
    });

    it('should handle no hotels found error', async () => {
      // Empty array of hotels simulates no hotels found
      Hotel.find.mockResolvedValue([]);

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No hotels found'
      });
    });

    it('should filter out hotels with no available rooms', async () => {
      const mockHotels = [
        { 
          _id: '680bb3faadf03841289ca40f',
          name: 'Hotel With Available Rooms',
          address: '123 Available St'
        },
        { 
          _id: '680bb3faadf03841289ca41f',
          name: 'Hotel With No Available Rooms',
          address: '456 Booked St'
        }
      ];
      
      const availableRoomTypes = [{
        _id: '680bb3faadf03841289ca410',
        hotelId: '680bb3faadf03841289ca40f',
        totalRooms: 5
      }];
      
      const bookedRoomTypes = [{
        _id: '680bb3faadf03841289ca510',
        hotelId: '680bb3faadf03841289ca41f',
        totalRooms: 5
      }];

      Hotel.find.mockResolvedValue(mockHotels);
      
      // Mock room type find for each hotel
      RoomType.find.mockImplementation((query) => {
        if (query.hotelId === '680bb3faadf03841289ca40f') {
          return Promise.resolve(availableRoomTypes);
        } else {
          return Promise.resolve(bookedRoomTypes);
        }
      });
      
      // Mock availability check with different results based on room type
      RoomType.checkAvailability.mockImplementation((roomTypeId) => {
        if (roomTypeId === '680bb3faadf03841289ca410') {
          return Promise.resolve({
            roomTypeId,
            status: 'available',
            availableRooms: 5,
            isActivated: true
          });
        } else {
          return Promise.resolve({
            roomTypeId,
            status: 'booked',
            availableRooms: 0,
            isActivated: true
          });
        }
      });

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          checkInDate: expect.any(Date),
          checkOutDate: expect.any(Date),
          availableHotels: expect.arrayContaining([
            expect.objectContaining({
              hotelId: mockHotels[0]._id,
              hasAvailableRooms: true
            })
          ])
        }
      });
      
      // Ensure the second hotel (with no available rooms) is not included
      const responseData = mockRes.json.mock.calls[0][0].data;
      expect(responseData.availableHotels.length).toBe(1);
      expect(responseData.availableHotels[0].hotelId).toEqual(mockHotels[0]._id);
    });

    it('should handle missing query parameters', async () => {
      mockReq.query = {}; // No dates provided

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide checkInDate and checkOutDate'
      });
    });

    it('should handle invalid date format', async () => {
      mockReq.query = {
        checkInDate: 'invalid-date',
        checkOutDate: '2025-06-03'
      };

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Invalid date format')
      });
    });

    it('should validate check-in is before check-out', async () => {
      mockReq.query = {
        checkInDate: '2025-06-03',
        checkOutDate: '2025-06-01'
      };

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Check-in date must be before check-out date')
      });
    });

    it('should handle server errors', async () => {
      const error = new Error('Server error');
      Hotel.find.mockRejectedValue(error);

      await getAvailableHotels(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: error.message
      });
    });
  });
});