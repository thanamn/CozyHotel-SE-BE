const request = require('supertest');
const mongoose = require('mongoose');
const Hotel = require('../../models/Hotel');
const RoomType = require('../../models/RoomType');
const Booking = require('../../models/Booking');
const User = require('../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../utils/dbHandler');
const express = require('express');
const setupApp = require('../../server');

let app;
let server;
let testHotel;
let testRoomType;
let testUser;

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
    email: 'test@example.com',
    password: 'password123',
    tel: '1234567890',
    role: 'user'
  });

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

  // Create test room type
  testRoomType = await RoomType.create({
    hotelId: testHotel._id,
    name: 'Test Room',
    description: 'A test room',
    capacity: 2,
    bedType: 'King',
    size: '30 sqm',
    basePrice: 1000,
    totalRooms: 5,
    amenities: ['Free Wi-Fi', 'Mini-bar'],
    facilities: ['Air conditioning', 'Private bathroom']
  });
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Availability Routes', () => {
  describe('GET /api/v1/availability/room-types', () => {
    it('should return available room types for valid dates', async () => {
      const res = await request(app)
        .get('/api/v1/availability/room-types')
        .query({
          hotelId: testHotel._id.toString(),
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-03'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hotelId');
      expect(res.body.data).toHaveProperty('availableRoomTypes');
      expect(res.body.data.availableRoomTypes.length).toBe(1);
      expect(res.body.data.availableRoomTypes[0].isAvailable).toBe(true);
    });

    it('should handle room type with existing bookings', async () => {
      // Create existing booking
      await Booking.create({
        checkinDate: new Date('2025-06-01'),
        checkoutDate: new Date('2025-06-02'),
        user: testUser._id,
        hotel: testHotel._id,
        roomType: testRoomType._id
      });

      const res = await request(app)
        .get('/api/v1/availability/room-types')
        .query({
          hotelId: testHotel._id.toString(),
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-03'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availableRoomTypes[0].availableRooms).toBe(4);
    });

    it('should handle invalid date format', async () => {
      const res = await request(app)
        .get('/api/v1/availability/room-types')
        .query({
          hotelId: testHotel._id.toString(),
          checkInDate: 'invalid-date',
          checkOutDate: '2025-06-03'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require all parameters', async () => {
      const res = await request(app)
        .get('/api/v1/availability/room-types')
        .query({
          hotelId: testHotel._id.toString()
          // Missing dates
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/availability/hotels', () => {
    it('should return available hotels for valid dates', async () => {
      const res = await request(app)
        .get('/api/v1/availability/hotels')
        .query({
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-03'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('checkInDate');
      expect(res.body.data).toHaveProperty('checkOutDate');
      expect(res.body.data).toHaveProperty('availableHotels');
      expect(res.body.data.availableHotels.length).toBe(1);
      expect(res.body.data.availableHotels[0].hasAvailableRooms).toBe(true);
    });

    it('should not return hotels with no available rooms', async () => {
      // Book all rooms
      const bookingPromises = [];
      for (let i = 0; i < testRoomType.totalRooms; i++) {
        bookingPromises.push(
          Booking.create({
            checkinDate: new Date('2025-06-01'),
            checkoutDate: new Date('2025-06-03'),
            user: testUser._id,
            hotel: testHotel._id,
            roomType: testRoomType._id
          })
        );
      }
      await Promise.all(bookingPromises);

      const res = await request(app)
        .get('/api/v1/availability/hotels')
        .query({
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-03'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availableHotels.length).toBe(0);
    });

    it('should validate dates', async () => {
      const res = await request(app)
        .get('/api/v1/availability/hotels')
        .query({
          checkInDate: '2025-06-03',
          checkOutDate: '2025-06-01' // Invalid: checkout before checkin
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require both dates', async () => {
      const res = await request(app)
        .get('/api/v1/availability/hotels')
        .query({
          checkInDate: '2025-06-01'
          // Missing checkOutDate
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});