const { getAvailableRoomTypes } = require('../../../controllers/availability');
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
        isAvailable: true
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
              isAvailable: mockAvailability.isAvailable
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
  });
});