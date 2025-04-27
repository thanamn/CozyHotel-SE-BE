const mongoose = require('mongoose');
const Hotel = require('../../../models/Hotel');
const Booking = require('../../../models/Booking');
const User = require('../../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../../utils/dbHandler');

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

describe('Hotel Model', () => {
  describe('Validation', () => {
    let validHotelData;

    beforeEach(() => {
      validHotelData = {
        name: 'Test Hotel',
        address: '123 Test Street',
        district: 'Test District',
        province: 'Test Province',
        postalcode: '12345',
        tel: '1234567890',
        picture: 'http://example.com/hotel.jpg',
        description: 'A test hotel'
      };
    });

    it('should validate a valid hotel', async () => {
      const hotel = new Hotel(validHotelData);
      const validated = await hotel.validate();
      expect(validated).toBeUndefined();
    });

    it('should require name', async () => {
      delete validHotelData.name;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require unique name', async () => {
      await Hotel.create(validHotelData);
      const duplicateHotel = new Hotel(validHotelData);
      await expect(duplicateHotel.save()).rejects.toThrow();
    });

    it('should require address', async () => {
      delete validHotelData.address;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require district', async () => {
      delete validHotelData.district;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require province', async () => {
      delete validHotelData.province;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require valid postal code', async () => {
      validHotelData.postalcode = '123456'; // More than 5 digits
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require picture URL', async () => {
      delete validHotelData.picture;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should require description', async () => {
      delete validHotelData.description;
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });

    it('should allow optional telephone number', async () => {
      delete validHotelData.tel;
      const hotel = new Hotel(validHotelData);
      const validated = await hotel.validate();
      expect(validated).toBeUndefined();
    });

    it('should enforce name length limit', async () => {
      validHotelData.name = 'A'.repeat(51); // More than 50 characters
      const hotel = new Hotel(validHotelData);
      await expect(hotel.validate()).rejects.toThrow();
    });
  });

  describe('Virtual Fields', () => {
    let testHotel;
    let testUser;

    beforeEach(async () => {
      // Create test hotel
      testHotel = await Hotel.create({
        name: 'Test Hotel',
        address: '123 Test Street',
        district: 'Test District',
        province: 'Test Province',
        postalcode: '12345',
        tel: '1234567890',
        picture: 'http://example.com/hotel.jpg',
        description: 'A test hotel'
      });

      // Create test user
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tel: '1234567890'
      });
    });

    it('should populate virtual bookings field', async () => {
      // Create some bookings
      await Booking.create([
        {
          checkinDate: new Date('2025-06-01'),
          checkoutDate: new Date('2025-06-03'),
          user: testUser._id,
          hotel: testHotel._id,
          roomType: new mongoose.Types.ObjectId()
        },
        {
          checkinDate: new Date('2025-07-01'),
          checkoutDate: new Date('2025-07-03'),
          user: testUser._id,
          hotel: testHotel._id,
          roomType: new mongoose.Types.ObjectId()
        }
      ]);

      // Fetch hotel with populated bookings
      const hotelWithBookings = await Hotel.findById(testHotel._id).populate('bookings');

      expect(hotelWithBookings.bookings).toBeDefined();
      expect(Array.isArray(hotelWithBookings.bookings)).toBe(true);
      expect(hotelWithBookings.bookings).toHaveLength(2);

      // Verify booking details
      const booking = hotelWithBookings.bookings[0];
      expect(booking.hotel.toString()).toBe(testHotel._id.toString());
      expect(booking.user.toString()).toBe(testUser._id.toString());
    });

    it('should return empty array when hotel has no bookings', async () => {
      const hotelWithBookings = await Hotel.findById(testHotel._id).populate('bookings');
      
      expect(hotelWithBookings.bookings).toBeDefined();
      expect(Array.isArray(hotelWithBookings.bookings)).toBe(true);
      expect(hotelWithBookings.bookings).toHaveLength(0);
    });
  });
});