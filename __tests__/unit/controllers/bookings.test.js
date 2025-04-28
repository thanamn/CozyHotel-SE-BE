const { getBookings, getBooking, addBooking, updateBooking, deleteBooking } = require('../../../controllers/bookings');
const Booking = require('../../../models/Booking');
const Hotel = require('../../../models/Hotel');
const User = require('../../../models/User');
const RoomType = require('../../../models/RoomType');
const dbHandler = require('../../utils/dbHandler');

describe('Bookings Controller', () => {
  let mockReq;
  let mockRes;
  let testUser;
  let testHotel;
  let testRoomType;

  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  beforeEach(async () => {
    await dbHandler.clearDatabase();
    
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      tel: '1234567890',
      role: 'user'
    });

    // Create test hotel
    testHotel = await Hotel.create({
      name: 'Test Hotel',
      address: 'Test Address',
      district: 'Test District',
      province: 'Test Province',
      postalcode: '12345',
      tel: '1234567890',
      picture: 'http://test.com/picture.jpg',
      description: 'Test Description'
    });

    // Create test room type
    testRoomType = await RoomType.create({
      hotelId: testHotel._id,
      name: 'Test Room',
      description: 'Test Description',
      capacity: 2,
      bedType: 'Queen',
      size: '30 sqm',
      amenities: ['TV', 'AC'],
      facilities: ['Free Wi-Fi', 'Television'],
      basePrice: 100,
      totalRooms: 5
    });

    mockReq = {
      params: {
        id: '507f1f77bcf86cd799439011',
        hotelId: testHotel._id.toString()
      },
      body: {
        checkinDate: '2025-01-01',
        checkoutDate: '2025-01-03',
        roomType: testRoomType._id.toString()
      },
      user: {
        id: testUser._id.toString(),
        role: 'user'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('GET /api/v1/bookings', () => {
    it('should return user bookings for non-admin users', async () => {
      // Create some test bookings
      const booking1 = await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: mockReq.body.roomType,
        checkinDate: mockReq.body.checkinDate,
        checkoutDate: mockReq.body.checkoutDate
      });

      const booking2 = await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: mockReq.body.roomType,
        checkinDate: '2025-02-01',
        checkoutDate: '2025-02-03'
      });

      await getBookings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.count).toBe(2);
      expect(responseData.data.length).toBe(2);
    });

    it('should return all bookings for admin users', async () => {
      // Create an admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;

      // Create bookings for different users
      await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: mockReq.body.roomType,
        checkinDate: mockReq.body.checkinDate,
        checkoutDate: mockReq.body.checkoutDate
      });

      await Booking.create({
        hotel: testHotel._id,
        user: adminUser._id,
        roomType: mockReq.body.roomType,
        checkinDate: '2025-02-01',
        checkoutDate: '2025-02-03'
      });

      await getBookings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.count).toBe(2);
      expect(responseData.data.length).toBe(2);
    });

    it('should filter bookings by hotel for admin users with hotelId param', async () => {
      // Create an admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;
      mockReq.params.hotelId = testHotel._id.toString();

      await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: mockReq.body.roomType,
        checkinDate: mockReq.body.checkinDate,
        checkoutDate: mockReq.body.checkoutDate
      });

      await getBookings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      // Create a test booking
      testBooking = await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: testRoomType._id,
        checkinDate: new Date('2025-01-01'),
        checkoutDate: new Date('2025-01-03')
      });
      mockReq.params.id = testBooking._id.toString();
    });

    it('should get a single booking by ID', async () => {
      await getBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data._id.toString()).toBe(testBooking._id.toString());
    });

    it('should return 404 if booking ID does not exist', async () => {
      // Use a valid but non-existent MongoDB ID
      mockReq.params.id = '507f1f77bcf86cd799439011';
      
      await getBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('No Booking with the id of')
      });
    });

    it('should return 500 if database query fails - covering lines 55-56', async () => {
      // Create a more direct mock implementation that will definitely trigger the catch block
      const findByIdSpy = jest.spyOn(Booking, 'findById');
      
      // We'll use mockImplementationOnce to directly reject the promise chain
      findByIdSpy.mockImplementationOnce(() => {
        return {
          populate: jest.fn().mockRejectedValue(new Error('Database error'))
        };
      });
      
      await getBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find Booking'
      });
    });

    it('should return 500 if an invalid ID format is provided', async () => {
      // Use an invalid MongoDB ID format
      mockReq.params.id = 'invalid-id';
      
      await getBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot find Booking'
      });
    });
  });

  describe('POST /api/v1/hotels/:hotelId/bookings', () => {
    beforeEach(() => {
      mockReq.body.user = testUser._id.toString();
    });

    it('should create booking if hotel exists and user has not exceeded limit', async () => {
      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      // Compare ObjectIDs as strings
      expect(responseData.data.hotel.toString()).toBe(testHotel._id.toString());
      expect(responseData.data.user.toString()).toBe(testUser._id.toString());
    });

    it('should return 404 if hotel does not exist', async () => {
      // Set an invalid hotel ID
      mockReq.params.hotelId = '507f1f77bcf86cd799439011'; // Valid format but non-existent

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('No hotel with the id of')
      });
    });

    it('should return 403 if user tries to make booking for another user', async () => {
      // Create another user
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123',
        tel: '9876543210',
        role: 'user'
      });

      // Try to make a booking for another user
      mockReq.body.user = anotherUser._id.toString();

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not authorized to make this booking'
      });
    });

    it('should not allow more than 3 bookings for regular users', async () => {
      // Create 3 existing bookings
      for (let i = 0; i < 3; i++) {
        await Booking.create({
          hotel: testHotel._id,
          user: testUser._id,
          roomType: testRoomType._id,
          checkinDate: `2025-0${i+1}-01`,
          checkoutDate: `2025-0${i+1}-03`
        });
      }

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('has already made 3 Bookings')
      });
    });

    it('should allow admin users to make more than 3 bookings', async () => {
      // Create admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;
      mockReq.body.user = adminUser._id.toString();

      // Create 3 existing bookings
      for (let i = 0; i < 3; i++) {
        await Booking.create({
          hotel: testHotel._id,
          user: adminUser._id,
          roomType: testRoomType._id,
          checkinDate: `2025-0${i+1}-01`,
          checkoutDate: `2025-0${i+1}-03`
        });
      }

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
    });

    it('should allow admin users to make bookings for other users', async () => {
      // Create admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;
      mockReq.body.user = testUser._id.toString();

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.toString()).toBe(testUser._id.toString());
    });

    it('should return 500 if booking creation fails', async () => {
      // Mock Booking.create to throw an error
      jest.spyOn(Booking, 'create').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await addBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot create Booking'
      });
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: testRoomType._id,
        checkinDate: new Date('2025-01-01'),
        checkoutDate: new Date('2025-01-03')
      });
      mockReq.params.id = testBooking._id.toString();
    });

    it('should update booking if user owns it', async () => {
      mockReq.body = {
        checkinDate: new Date('2025-02-01'),
        checkoutDate: new Date('2025-02-03')
      };

      await updateBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(new Date(responseData.data.checkinDate)).toEqual(new Date('2025-02-01'));
    });

    it('should allow admin to update any booking', async () => {
      // Create admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;
      mockReq.body = {
        checkinDate: new Date('2025-03-01'),
        checkoutDate: new Date('2025-03-03')
      };

      await updateBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(new Date(responseData.data.checkinDate)).toEqual(new Date('2025-03-01'));
    });

    it('should return 404 if booking ID does not exist', async () => {
      // Use a valid but non-existent MongoDB ID
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = {
        checkinDate: new Date('2025-02-01'),
        checkoutDate: new Date('2025-02-03')
      };
      
      await updateBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('No Booking with the id of')
      });
    });

    it('should return 400 if validation fails', async () => {
      mockReq.body = {
        // Invalid date format to trigger validation error
        checkinDate: 'invalid-date',
        checkoutDate: 'invalid-date'
      };
      
      await updateBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot update Booking'
      });
    });

    it('should return 400 if database update fails', async () => {
      // Mock findByIdAndUpdate to simulate a database error
      jest.spyOn(Booking, 'findByIdAndUpdate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      mockReq.body = {
        checkinDate: new Date('2025-02-01'),
        checkoutDate: new Date('2025-02-03')
      };
      
      await updateBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot update Booking'
      });
    });

    it('should return 400 if an invalid ID format is provided', async () => {
      // Use an invalid MongoDB ID format
      mockReq.params.id = 'invalid-id';
      mockReq.body = {
        checkinDate: new Date('2025-02-01'),
        checkoutDate: new Date('2025-02-03')
      };
      
      await updateBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot update Booking'
      });
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        hotel: testHotel._id,
        user: testUser._id,
        roomType: testRoomType._id,
        checkinDate: new Date('2025-01-01'),
        checkoutDate: new Date('2025-01-03')
      });
      mockReq.params.id = testBooking._id.toString();
    });

    it('should delete booking if user owns it', async () => {
      await deleteBooking(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);

      // Verify booking was actually deleted
      const deletedBooking = await Booking.findById(testBooking._id);
      expect(deletedBooking).toBeNull();
    });

    it('should allow admin to delete any booking', async () => {
      // Create admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        tel: '0987654321',
        role: 'admin'
      });

      // Create another user's booking
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
        tel: '5555555555',
        role: 'user'
      });
      
      const otherUserBooking = await Booking.create({
        hotel: testHotel._id,
        user: otherUser._id,
        roomType: testRoomType._id,
        checkinDate: new Date('2025-01-01'),
        checkoutDate: new Date('2025-01-03')
      });
      
      // Set admin user in request
      mockReq.user.role = 'admin';
      mockReq.user.id = adminUser._id;
      mockReq.params.id = otherUserBooking._id.toString();
      
      await deleteBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      
      // Verify booking was deleted
      const deletedBooking = await Booking.findById(otherUserBooking._id);
      expect(deletedBooking).toBeNull();
    });

    it('should not allow regular user to delete booking they do not own', async () => {
      // Create another user's booking
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
        tel: '5555555555',
        role: 'user'
      });
      
      // Create a new booking owned by the other user
      const otherUserBooking = await Booking.create({
        hotel: testHotel._id,
        user: otherUser._id,
        roomType: testRoomType._id,
        checkinDate: new Date('2025-01-01'),
        checkoutDate: new Date('2025-01-03')
      });
      
      // Set the request to try to delete the other user's booking
      mockReq.params.id = otherUserBooking._id.toString();
      
      await deleteBooking(mockReq, mockRes);
      
      // Should return 403 Forbidden for unauthorized access
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not authorized to delete this booking'
      });
      
      // Verify booking still exists
      const existingBooking = await Booking.findById(otherUserBooking._id);
      expect(existingBooking).toBeTruthy();
    });

    it('should return 404 if booking ID does not exist', async () => {
      // Use a valid but non-existent MongoDB ID
      mockReq.params.id = '507f1f77bcf86cd799439011';
      
      await deleteBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('No Booking with the id of')
      });
    });

    it('should return 500 if database deletion fails', async () => {
      // Mock the deleteOne method to simulate a database error
      jest.spyOn(Booking.prototype, 'deleteOne').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      await deleteBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete Booking'
      });
    });

    it('should return 500 if an invalid ID format is provided', async () => {
      // Use an invalid MongoDB ID format
      mockReq.params.id = 'invalid-id';
      
      await deleteBooking(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete Booking'
      });
    });
  });
});