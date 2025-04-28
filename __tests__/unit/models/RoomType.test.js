const mongoose = require('mongoose');
const RoomType = require('../../../models/RoomType');
const Booking = require('../../../models/Booking');
const User = require('../../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../../utils/dbHandler');

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe('RoomType Model', () => {
  describe('Validation', () => {
    let validRoomTypeData;

    beforeEach(() => {
      validRoomTypeData = {
        hotelId: new mongoose.Types.ObjectId(),
        name: 'Deluxe Room',
        description: 'A luxurious room',
        capacity: 2,
        bedType: 'King',
        size: '40 sqm',
        basePrice: 2000,
        totalRooms: 5,
        amenities: ['Free Wi-Fi', 'Mini-bar'],
        facilities: ['Air conditioning', 'Private bathroom']
      };
    });

    it('should validate a valid room type', async () => {
      const roomType = new RoomType(validRoomTypeData);
      const validated = await roomType.validate();
      expect(validated).toBeUndefined();
    });

    it('should require hotelId', async () => {
      delete validRoomTypeData.hotelId;
      const roomType = new RoomType(validRoomTypeData);
      await expect(roomType.validate()).rejects.toThrow();
    });

    it('should require name', async () => {
      delete validRoomTypeData.name;
      const roomType = new RoomType(validRoomTypeData);
      await expect(roomType.validate()).rejects.toThrow();
    });

    it('should enforce valid bed types', async () => {
      validRoomTypeData.bedType = 'InvalidType';
      const roomType = new RoomType(validRoomTypeData);
      await expect(roomType.validate()).rejects.toThrow();
    });

    it('should require positive totalRooms', async () => {
      validRoomTypeData.totalRooms = -1;
      const roomType = new RoomType(validRoomTypeData);
      await expect(roomType.validate()).rejects.toThrow();
    });

    it('should enforce valid facilities', async () => {
      validRoomTypeData.facilities = ['Invalid Facility'];
      const roomType = new RoomType(validRoomTypeData);
      await expect(roomType.validate()).rejects.toThrow();
    });
  });

  describe('checkAvailability Method', () => {
    let testRoomType;
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tel: '1234567890'
      });

      testRoomType = await RoomType.create({
        hotelId: new mongoose.Types.ObjectId(),
        name: 'Test Room',
        description: 'Test Description',
        capacity: 2,
        bedType: 'King',
        size: '30 sqm',
        basePrice: 1000,
        totalRooms: 3,
        amenities: ['Free Wi-Fi'],
        facilities: ['Air conditioning']
      });
    });

    it('should show all rooms available when no bookings exist', async () => {
      const result = await RoomType.checkAvailability(
        testRoomType._id,
        '2025-06-01',
        '2025-06-03'
      );

      expect(result.isActivated).toBe(true);
      expect(result.availableRooms).toBe(3);
      expect(result.bookedRooms).toBe(0);
    });

    it('should handle room under maintenance', async () => {
      await RoomType.findByIdAndUpdate(testRoomType._id, { isActivated: false });
      // Refetch the updated room type
      const updatedRoomType = await RoomType.findById(testRoomType._id);

      const result = await RoomType.checkAvailability(
        testRoomType._id,
        '2025-06-01',
        '2025-06-03'
      );

      expect(updatedRoomType.isActivated).toBe(false);
      expect(result.isActivated).toBe(false);
      expect(result.status).toBe('under_maintenance');
    });

    it('should correctly calculate availability with existing bookings', async () => {
      // Create two bookings that overlap
      await Booking.create({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        user: testUser._id,
        hotel: testRoomType.hotelId,
        roomType: testRoomType._id
      });

      await Booking.create({
        checkinDate: new Date('2025-06-02'),
        checkoutDate: new Date('2025-06-04'),
        user: testUser._id,
        hotel: testRoomType.hotelId,
        roomType: testRoomType._id
      });

      const result = await RoomType.checkAvailability(
        testRoomType._id,
        '2025-06-02',
        '2025-06-03'
      );

      expect(result.isActivated).toBe(true);
      expect(result.bookedRooms).toBe(2);
      expect(result.availableRooms).toBe(1);
      expect(result.status).toBe('available');
    });

    it('should show fully booked when all rooms are taken', async () => {
      // Create bookings for all rooms
      for (let i = 0; i < 5; i++) {
        await Booking.create({
          checkinDate: new Date('2025-06-01'),
          checkoutDate: new Date('2025-06-03'),
          user: testUser._id,
          hotel: testRoomType.hotelId,
          roomType: testRoomType._id
        });
      }

      const result = await RoomType.checkAvailability(
        testRoomType._id,
        '2025-06-01',
        '2025-06-03'
      );

      expect(result.status).toBe('fully_booked');
    });

    it('should handle non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        RoomType.checkAvailability(fakeId, '2025-06-01', '2025-06-03')
      ).rejects.toThrow('Room type not found');
    });
  });
});