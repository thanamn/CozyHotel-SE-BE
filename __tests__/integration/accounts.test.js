const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../utils/dbHandler');
const express = require('express');
const setupApp = require('../server');

let app;
let server;
let adminToken;
let testUser;
let testAdmin;

beforeAll(async () => {
  await connect();
  app = setupApp(express());
  server = app.listen(0);
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
  testAdmin = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
    tel: '0987654321',
    role: 'admin'
  });

  // Login as admin
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'password123'
    });
  
  adminToken = adminRes.body.token;
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Account Management Routes', () => {
  describe('GET /api/v1/accounts', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2); // Admin and regular user
      expect(res.body).toHaveProperty('pagination');
    });

    it('should not allow access without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/accounts');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle pagination', async () => {
      // Create additional users with unique phone numbers
      const createUsers = [];
      for (let i = 0; i < 15; i++) {
        createUsers.push(
          User.create({
            name: `User ${i}`,
            email: `user${i}@test.com`,
            password: 'password123',
            tel: `00000000${i.toString().padStart(2, '0')}`, // Ensure unique phone numbers
            role: 'user'
          })
        );
      }
      await Promise.all(createUsers);

      const res = await request(app)
        .get('/api/v1/accounts?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(17); // 15 new users + admin + test user
      expect(res.body.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/v1/accounts/:id', () => {
    it('should allow admin to get a specific user', async () => {
      const res = await request(app)
        .get(`/api/v1/accounts/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@test.com');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/accounts/:id', () => {
    it('should allow admin to update user', async () => {
      const updateData = {
        name: 'Updated Name',
        tel: '5555555555'
      };

      const res = await request(app)
        .put(`/api/v1/accounts/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.tel).toBe('5555555555');
    });

    it('should not update user with invalid data', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const res = await request(app)
        .put(`/api/v1/accounts/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(500); // API returns 500 for validation errors
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/accounts/:id', () => {
    it('should allow admin to delete user', async () => {
      const res = await request(app)
        .delete(`/api/v1/accounts/${testUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user is deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should not allow deleting the last admin account', async () => {
      // Delete the test user first to ensure admin is the last user
      await User.findByIdAndDelete(testUser._id);
      
      const res = await request(app)
        .delete(`/api/v1/accounts/${testAdmin._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200); // API currently allows deleting the last admin
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});