const request = require('supertest');
const mongoose = require('mongoose');
const RoomType = require('../../models/RoomType');
const Hotel = require('../../models/Hotel');
const User = require('../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../utils/dbHandler');
const express = require('express');
const setupApp = require('../../server');

let app;
let server;
let adminToken;
let managerToken;
let testHotel;
let testRoomType;
let adminUser;
let managerUser;

beforeAll(async () => {
  await connect();
  app = setupApp(express());
  server = app.listen(5001);
});

beforeEach(async () => {
  await clearDatabase();

  // Create admin user
  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    tel: '1234567890',
    role: 'admin'
  });

  // Create manager user
  managerUser = await User.create({
    name: 'Manager User',
    email: 'manager@test.com',
    password: 'password123',
    tel: '0987654321',
    role: 'manager'
  });

  // Login as admin
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  
  adminToken = adminRes.body.token;

  // Login as manager
  const managerRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'manager@test.com',
      password: 'password123'
    });
  
  managerToken = managerRes.body.token;

  // Create a test hotel
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

  // Create a test room type
  testRoomType = await RoomType.create({
    hotelId: testHotel._id,
    name: 'Deluxe Room',
    description: 'A luxurious room',
    capacity: 2,
    bedType: 'King',
    size: '40 sqm',
    amenities: ['Free Wi-Fi', 'Mini-bar'],
    facilities: ['Air conditioning', 'Private bathroom'],
    basePrice: 2000,
    totalRooms: 5
  });

  // Add hotel to manager's managed hotels
  await User.findByIdAndUpdate(managerUser._id, {
    $push: { managedHotels: testHotel._id }
  });
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Room Type Routes', () => {
  describe('GET /api/v1/roomtypes', () => {
    it('should get all room types', async () => {
      const res = await request(app)
        .get('/api/v1/roomtypes');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/roomtypes/:id', () => {
    it('should get a single room type', async () => {
      const res = await request(app)
        .get(`/api/v1/roomtypes/${testRoomType._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Deluxe Room');
    });

    it('should return 404 for non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/roomtypes/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/roomtypes/hotel/:hotelId', () => {
    it('should get all room types for a specific hotel', async () => {
      const res = await request(app)
        .get(`/api/v1/roomtypes/hotel/${testHotel._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].hotelId.toString()).toBe(testHotel._id.toString());
    });

    it('should return 404 for non-existent hotel', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/roomtypes/hotel/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/roomtypes', () => {
    it('should create a new room type if admin', async () => {
      const newRoomType = {
        hotelId: testHotel._id,
        name: 'Suite Room',
        description: 'A spacious suite',
        capacity: 4,
        bedType: 'Double',
        size: '60 sqm',
        amenities: ['Free Wi-Fi', 'Mini-bar', 'Coffee maker'],
        facilities: ['Air conditioning', 'Private bathroom', 'Mini-bar'],
        basePrice: 3000,
        totalRooms: 3,
        isAvailable: true
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newRoomType);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Suite Room');
    });

    it('should not create room type with duplicate name in same hotel', async () => {
      const duplicateRoomType = {
        hotelId: testHotel._id,
        name: 'Deluxe Room', // Same name as testRoomType
        description: 'Another deluxe room',
        capacity: 2,
        bedType: 'Queen',
        size: '35 sqm',
        basePrice: 1800,
        totalRooms: 3
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateRoomType);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/roomtypes/:id', () => {
    it('should update a room type if admin', async () => {
      const updateData = {
        name: 'Updated Deluxe Room',
        description: 'Updated description',
        basePrice: 2500
      };

      const res = await request(app)
        .put(`/api/v1/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Deluxe Room');
      expect(res.body.data.basePrice).toBe(2500);
    });

    it('should not update non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/roomtypes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/roomtypes/:id', () => {
    it('should delete a room type if admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/roomtypes/${testRoomType._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify room type is deleted
      const deletedRoomType = await RoomType.findById(testRoomType._id);
      expect(deletedRoomType).toBeNull();
    });

    it('should not delete non-existent room type', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/roomtypes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Manager Room Type Operations', () => {
    describe('PUT /api/v1/manager/roomtypes/:id', () => {
      it('should allow manager to update room type for managed hotel', async () => {
        const updateData = {
          name: 'Manager Updated Room',
          description: 'Updated by manager',
          basePrice: 2200
        };

        const res = await request(app)
          .put(`/api/v1/manager/roomtypes/${testRoomType._id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Manager Updated Room');
        expect(res.body.data.basePrice).toBe(2200);
      });

      it('should not allow manager to update room type for unmanaged hotel', async () => {
        // Create another hotel and room type that the manager doesn't manage
        const unmanagedHotel = await Hotel.create({
          name: 'Unmanaged Hotel',
          address: '999 Unmanaged St',
          district: 'Test District',
          province: 'Test Province',
          postalcode: '54321',
          tel: '5555555555',
          picture: 'http://test.com/unmanaged.jpg',
          description: 'An unmanaged hotel'
        });

        const unmanagedRoomType = await RoomType.create({
          hotelId: unmanagedHotel._id,
          name: 'Unmanaged Room',
          description: 'Room in unmanaged hotel',
          capacity: 2,
          bedType: 'Queen',
          size: '30 sqm',
          basePrice: 1500,
          totalRooms: 4
        });

        const updateData = {
          name: 'Unauthorized Update',
          description: 'Should not be updated'
        };

        const res = await request(app)
          .put(`/api/v1/manager/roomtypes/${unmanagedRoomType._id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .send(updateData);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/manager/roomtypes/:id', () => {
      it('should allow manager to delete room type from managed hotel', async () => {
        const res = await request(app)
          .delete(`/api/v1/manager/roomtypes/${testRoomType._id}`)
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify room type is deleted
        const deletedRoomType = await RoomType.findById(testRoomType._id);
        expect(deletedRoomType).toBeNull();
      });

      it('should not allow manager to delete room type from unmanaged hotel', async () => {
        // Create another hotel and room type that the manager doesn't manage
        const unmanagedHotel = await Hotel.create({
          name: 'Unmanaged Hotel 2',
          address: '888 Unmanaged St',
          district: 'Test District',
          province: 'Test Province',
          postalcode: '54321',
          tel: '5555555555',
          picture: 'http://test.com/unmanaged2.jpg',
          description: 'Another unmanaged hotel'
        });

        const unmanagedRoomType = await RoomType.create({
          hotelId: unmanagedHotel._id,
          name: 'Unmanaged Room',
          description: 'Room in unmanaged hotel',
          capacity: 2,
          bedType: 'Queen',
          size: '30 sqm',
          basePrice: 1500,
          totalRooms: 4
        });

        const res = await request(app)
          .delete(`/api/v1/manager/roomtypes/${unmanagedRoomType._id}`)
          .set('Authorization', `Bearer ${managerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });
  });

  describe('Room Type Validation', () => {
    it('should not create room type with invalid capacity', async () => {
      const invalidRoomType = {
        hotelId: testHotel._id,
        name: 'Invalid Room',
        description: 'Room with invalid capacity',
        capacity: -1,
        bedType: 'Queen',
        size: '30 sqm',
        basePrice: 1500,
        totalRooms: 4
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoomType);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not create room type with invalid bed type', async () => {
      const invalidRoomType = {
        hotelId: testHotel._id,
        name: 'Invalid Room',
        description: 'Room with invalid bed type',
        capacity: 2,
        bedType: 'InvalidBed',
        size: '30 sqm',
        basePrice: 1500,
        totalRooms: 4
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoomType);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not create room type with negative base price', async () => {
      const invalidRoomType = {
        hotelId: testHotel._id,
        name: 'Invalid Room',
        description: 'Room with negative price',
        capacity: 2,
        bedType: 'Queen',
        size: '30 sqm',
        basePrice: -100,
        totalRooms: 4
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoomType);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow creating room type with zero total rooms', async () => {
      const validRoomType = {
        hotelId: testHotel._id,
        name: 'Zero Room Type',
        description: 'Room type with zero rooms',
        capacity: 2,
        bedType: 'Queen',
        size: '30 sqm',
        basePrice: 1500,
        totalRooms: 0,
        available: true
      };

      const res = await request(app)
        .post('/api/v1/roomtypes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRoomType);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRooms).toBe(0);
    });
  });
});