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
let managerToken;
let otherManagerToken;
let testManager;
let testHotel;
let testRoomType;
let testBooking;
let testUser;

beforeAll(async () => {
  await connect();
  app = setupApp(express());
  server = app.listen(5001);
});

beforeEach(async () => {
  await clearDatabase();

  // Create test manager
  testManager = await User.create({
    name: 'Test Manager',
    email: 'manager@test.com',
    password: 'password123',
    tel: '1234567890',
    role: 'manager'
  });

  // Create another manager
  const otherManager = await User.create({
    name: 'Other Manager',
    email: 'other.manager@test.com',
    password: 'password123',
    tel: '0987654321',
    role: 'manager'
  });

  // Create test user for bookings
  testUser = await User.create({
    name: 'Test User',
    email: 'user@test.com',
    password: 'password123',
    tel: '5555555555',
    role: 'user'
  });

  // Get manager tokens - do this in beforeEach since users are recreated
  const managerRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'manager@test.com',
      password: 'password123'
    });
  managerToken = managerRes.body.token;

  const otherManagerRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'other.manager@test.com',
      password: 'password123'
    });
  otherManagerToken = otherManagerRes.body.token;

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

  // Add hotel to manager's managed hotels
  await User.findByIdAndUpdate(
    testManager._id,
    { $push: { managedHotels: testHotel._id } }
  );

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

  // Create test booking
  testBooking = await Booking.create({
    checkinDate: new Date('2025-05-01'),
    checkoutDate: new Date('2025-05-03'),
    user: testUser._id,
    hotel: testHotel._id,
    roomType: testRoomType._id
  });
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Manager Routes', () => {
  describe('GET /api/v1/manager/hotels', () => {
    it('should get all hotels managed by the manager', async () => {
      const res = await request(app)
        .get('/api/v1/manager/hotels')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id.toString()).toBe(testHotel._id.toString());
    });

    it('should return empty array for manager with no hotels', async () => {
      const res = await request(app)
        .get('/api/v1/manager/hotels')
        .set('Authorization', `Bearer ${otherManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/v1/manager/hotels/:hotelId/bookings', () => {
    it('should get all bookings for a managed hotel', async () => {
      const res = await request(app)
        .get(`/api/v1/manager/hotels/${testHotel._id}/bookings`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].hotel.toString()).toBe(testHotel._id.toString());
    });

    it('should not allow access to unmanaged hotel bookings', async () => {
      const res = await request(app)
        .get(`/api/v1/manager/hotels/${testHotel._id}/bookings`)
        .set('Authorization', `Bearer ${otherManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/manager/bookings/:id', () => {
    it('should update a booking in a managed hotel', async () => {
      const updateData = {
        checkinDate: '2025-06-01',
        checkoutDate: '2025-06-03'
      };

      const res = await request(app)
        .put(`/api/v1/manager/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(new Date(res.body.data.checkinDate)).toEqual(new Date('2025-06-01'));
    });

    it('should not allow updating booking in unmanaged hotel', async () => {
      const updateData = {
        checkinDate: '2025-06-01',
        checkoutDate: '2025-06-03'
      };

      const res = await request(app)
        .put(`/api/v1/manager/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${otherManagerToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/manager/bookings/:id', () => {
    it('should delete a booking in a managed hotel', async () => {
      const res = await request(app)
        .delete(`/api/v1/manager/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify booking is deleted
      const deletedBooking = await Booking.findById(testBooking._id);
      expect(deletedBooking).toBeNull();
    });

    it('should not allow deleting booking in unmanaged hotel', async () => {
      const res = await request(app)
        .delete(`/api/v1/manager/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${otherManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/manager/hotels/:hotelId/roomtypes', () => {
    it('should create a room type in a managed hotel', async () => {
      const newRoomType = {
        name: 'New Room Type',
        description: 'A new room type',
        capacity: 2,
        bedType: 'Queen',
        size: '25 sqm',
        basePrice: 800,
        totalRooms: 3,
        amenities: ['Free Wi-Fi'],
        facilities: ['Air conditioning']
      };

      const res = await request(app)
        .post(`/api/v1/manager/hotels/${testHotel._id}/roomtypes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newRoomType);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Room Type');
      expect(res.body.data.hotelId.toString()).toBe(testHotel._id.toString());
    });

    it('should not allow creating room type in unmanaged hotel', async () => {
      const newRoomType = {
        name: 'Unauthorized Room Type',
        description: 'Should not be created',
        capacity: 2,
        bedType: 'Queen',
        size: '25 sqm',
        basePrice: 800,
        totalRooms: 3
      };

      const res = await request(app)
        .post(`/api/v1/manager/hotels/${testHotel._id}/roomtypes`)
        .set('Authorization', `Bearer ${otherManagerToken}`)
        .send(newRoomType);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/manager/roomtypes/:id', () => {
    it('should update a room type in a managed hotel', async () => {
      const updateData = {
        name: 'Updated Room Type',
        description: 'Updated room description',
        basePrice: 1200,
        totalRooms: 6
      };

      const res = await request(app)
        .put(`/api/v1/manager/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Room Type');
      expect(res.body.data.basePrice).toBe(1200);
    });

    it('should not allow updating room type in unmanaged hotel', async () => {
      const updateData = {
        name: 'Unauthorized Update',
        description: 'Should not be updated'
      };

      const res = await request(app)
        .put(`/api/v1/manager/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${otherManagerToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not update non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Non-existent Room',
        description: 'Should not be updated'
      };

      const res = await request(app)
        .put(`/api/v1/manager/roomtypes/${fakeId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/manager/roomtypes/:id', () => {
    it('should delete a room type from a managed hotel', async () => {
      const res = await request(app)
        .delete(`/api/v1/manager/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify room type is deleted
      const deletedRoomType = await RoomType.findById(testRoomType._id);
      expect(deletedRoomType).toBeNull();

      // The API no longer deletes related bookings for managers
      const relatedBookings = await Booking.find({ roomType: testRoomType._id });
      expect(relatedBookings.length).toBe(1);
    });

    it('should not allow deleting room type from unmanaged hotel', async () => {
      const res = await request(app)
        .delete(`/api/v1/manager/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${otherManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not delete non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/manager/roomtypes/${fakeId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/manager/hotels/:hotelId/roomtypes', () => {
    it('should get all room types for a managed hotel', async () => {
      const res = await request(app)
        .get(`/api/v1/manager/hotels/${testHotel._id}/roomtypes`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].hotelId.toString()).toBe(testHotel._id.toString());
    });

    it('should not allow access to unmanaged hotel room types', async () => {
      const res = await request(app)
        .get(`/api/v1/manager/hotels/${testHotel._id}/roomtypes`)
        .set('Authorization', `Bearer ${otherManagerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should handle non-existent hotel', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/manager/hotels/${fakeId}/roomtypes`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403); // API returns 403 instead of 404 for non-existent hotels
      expect(res.body.success).toBe(false);
    });

    it('should return empty array for hotel with no room types', async () => {
      // Create a new hotel with no room types
      const emptyHotel = await Hotel.create({
        name: 'Empty Hotel',
        address: '456 Empty St',
        district: 'Empty District',
        province: 'Empty Province',
        postalcode: '54321',
        tel: '9876543210',
        picture: 'http://test.com/empty.jpg',
        description: 'A hotel with no room types'
      });

      // Add empty hotel to manager's managed hotels
      await User.findByIdAndUpdate(
        testManager._id,
        { $push: { managedHotels: emptyHotel._id } }
      );

      const res = await request(app)
        .get(`/api/v1/manager/hotels/${emptyHotel._id}/roomtypes`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });
});