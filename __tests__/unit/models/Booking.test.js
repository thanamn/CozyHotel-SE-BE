const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Booking = require('../../../models/Booking');
const User = require('../../../models/User');
const Hotel = require('../../../models/Hotel');
const RoomType = require('../../../models/RoomType');

describe('Booking Model', () => {
  let mongod;
  let testUser, testHotel, testRoomType;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Create test data
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      tel: '1234567890',
      password: 'password123'
    });

    testHotel = await Hotel.create({
      name: 'Test Hotel',
      description: 'Test Description',
      address: 'Test Address',
      district: 'Test District',
      province: 'Test Province',
      postalcode: '12345',
      tel: '1234567890',
      picture: 'https://test.com/test.jpg'
    });

    testRoomType = await RoomType.create({
      name: 'Test Room Type',
      hotelId: testHotel._id,
      bedType: 'King',
      capacity: 2,
      totalRooms: 5,
      basePrice: 1000,
      currency: 'THB'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await Booking.deleteMany();
  });

  describe('Validation', () => {
    it('should validate a valid booking', async () => {
      const booking = new Booking({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        user: testUser._id,
        hotel: testHotel._id,
        roomType: testRoomType._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      await expect(booking.save()).resolves.toBeDefined();
    });

    it('should require user reference', async () => {
      const booking = new Booking({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        hotel: testHotel._id,
        roomType: testRoomType._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require hotel reference', async () => {
      const booking = new Booking({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        user: testUser._id,
        roomType: testRoomType._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require room type reference', async () => {
      const booking = new Booking({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        user: testUser._id,
        hotel: testHotel._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      await expect(booking.save()).rejects.toThrow();
    });
  });

  describe('Date Handling', () => {
    it('should store dates as UTC', async () => {
      const booking = await Booking.create({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-03'),
        user: testUser._id,
        hotel: testHotel._id,
        roomType: testRoomType._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      expect(booking.checkinDate.toISOString()).toBe('2025-06-01T00:00:00.000Z');
      expect(booking.checkoutDate.toISOString()).toBe('2025-06-03T00:00:00.000Z');
    });

    it('should handle different date formats', async () => {
      const booking = await Booking.create({
        checkinDate: '2025-06-01',
        checkoutDate: '2025-06-03',
        user: testUser._id,
        hotel: testHotel._id,
        roomType: testRoomType._id,
        totalPrice: 2000,
        currency: 'THB'
      });

      expect(booking.checkinDate instanceof Date).toBe(true);
      expect(booking.checkoutDate instanceof Date).toBe(true);
    });
  });
});