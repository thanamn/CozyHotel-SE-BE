const request = require('supertest');
const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Hotel = require('../../models/Hotel');
const RoomType = require('../../models/RoomType');
const User = require('../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../utils/dbHandler');
const express = require('express');
const setupApp = require('../../server');

let app;
let server;
let userToken;
let adminToken;
let testUser;
let testHotel;
let testRoomType;
let testBooking;

beforeAll(async () => {
  await connect();
  app = setupApp(express());
  server = app.listen(5001);
});

beforeEach(async () => {
  await clearDatabase();

  // Create test user
  testUser = await User.create({
    name: 'Test User',
    email: 'user@test.com',
    password: 'password123',
    tel: '1234567890',
    role: 'user'
  });

  // Create admin user
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    tel: '0987654321',
    role: 'admin'
  });

  // Login as user
  const userRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'user@test.com',
      password: 'password123'
    });
  
  userToken = userRes.body.token;

  // Login as admin
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  
  adminToken = adminRes.body.token;

  // Create test hotel
  testHotel = await Hotel.create({
    name: 'Test Hotel',
    address: '123 Test St',
    district: 'Test District',
    province: 'Test Province',
    postalcode: '12345',
    tel: '1234567890',
    picture: 'http://test.com/image.jpg',
    description: 'A test hotel'
  });

  // Create test room type with limited rooms
  testRoomType = await RoomType.create({
    hotelId: testHotel._id,
    name: 'Test Room',
    description: 'A test room',
    capacity: 2,
    bedType: 'King',
    size: '30 sqm',
    basePrice: 1000,
    totalRooms: 2,
    amenities: ['Free Wi-Fi', 'Mini-bar'],
    facilities: ['Air conditioning', 'Private bathroom']
  });

  // Create test booking
  testBooking = await Booking.create({
    checkinDate: new Date('2025-06-01'),
    checkoutDate: new Date('2025-06-03'),
    user: testUser._id,
    hotel: testHotel._id,
    roomType: testRoomType._id
  });
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Booking Routes', () => {
  describe('GET /api/v1/bookings', () => {
    it('should get user\'s own bookings', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should allow admin to get all bookings', async () => {
      // Create another user's booking
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'password123',
        tel: '5555555555',
        role: 'user'
      });

      await Booking.create({
        checkinDate: new Date('2025-07-01'),
        checkoutDate: new Date('2025-07-03'),
        user: otherUser._id,
        hotel: testHotel._id,
        roomType: testRoomType._id
      });

      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should not allow access without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/bookings');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/hotels/:hotelId/bookings', () => {
    it('should create a new booking', async () => {
      const newBooking = {
        checkinDate: '2025-08-01',
        checkoutDate: '2025-08-03',
        user: testUser._id,
        roomType: testRoomType._id
      };

      const res = await request(app)
        .post(`/api/v1/hotels/${testHotel._id}/bookings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(newBooking);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(new Date(res.body.data.checkinDate)).toEqual(new Date('2025-08-01'));
    });

    it('should enforce booking limit per user', async () => {
      // Create 3 bookings (maximum allowed)
      for (let i = 0; i < 3; i++) {
        await Booking.create({
          checkinDate: new Date(`2025-09-0${i+1}`),
          checkoutDate: new Date(`2025-09-0${i+2}`),
          user: testUser._id,
          hotel: testHotel._id,
          roomType: testRoomType._id
        });
      }

      const newBooking = {
        checkinDate: '2025-08-01',
        checkoutDate: '2025-08-03',
        user: testUser._id,
        roomType: testRoomType._id
      };

      const res = await request(app)
        .post(`/api/v1/hotels/${testHotel._id}/bookings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(newBooking);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already made 3 Bookings');
    });

    it('should not allow booking for another user', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'password123',
        tel: '5555555555',
        role: 'user'
      });

      const newBooking = {
        checkinDate: '2025-08-01',
        checkoutDate: '2025-08-03',
        user: otherUser._id,
        roomType: testRoomType._id
      };

      const res = await request(app)
        .post(`/api/v1/hotels/${testHotel._id}/bookings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(newBooking);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should handle non-existent hotel', async () => {
      const fakeHotelId = new mongoose.Types.ObjectId();
      const newBooking = {
        checkinDate: '2025-08-01',
        checkoutDate: '2025-08-03',
        user: testUser._id,
        roomType: testRoomType._id
      };

      const res = await request(app)
        .post(`/api/v1/hotels/${fakeHotelId}/bookings`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(newBooking);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/bookings/:id', () => {
    it('should update booking dates', async () => {
      const updateData = {
        checkinDate: '2025-07-01',
        checkoutDate: '2025-07-03'
      };

      const res = await request(app)
        .put(`/api/v1/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(new Date(res.body.data.checkinDate)).toEqual(new Date('2025-07-01'));
    });

    it('should return 404 for non-existent booking', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        checkinDate: '2025-07-01',
        checkoutDate: '2025-07-03'
      };

      const res = await request(app)
        .put(`/api/v1/bookings/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/bookings/:id', () => {
    it('should delete booking', async () => {
      const res = await request(app)
        .delete(`/api/v1/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify booking is deleted
      const deletedBooking = await Booking.findById(testBooking._id);
      expect(deletedBooking).toBeNull();
    });

    it('should return 404 for non-existent booking', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/bookings/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});