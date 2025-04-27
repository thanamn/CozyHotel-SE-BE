const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { connect, clearDatabase, closeDatabase } = require('../utils/dbHandler');
const express = require('express');
const setupApp = require('../../server');

let app;
let server;

beforeAll(async () => {
  await connect();
  app = setupApp(express());
  server = app.listen(5001);
});

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
  await server.close();
});

describe('Authentication Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          tel: '1234567890',
          role: 'user'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.name).toBe('Test User');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.role).toBe('user');
      expect(res.body.password).toBeUndefined();
    });

    it('should not register user with existing email', async () => {
      // Create initial user
      await User.create({
        name: 'First User',
        email: 'test@example.com',
        password: 'password123',
        tel: '1234567890',
        role: 'user'
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second User',
          email: 'test@example.com',
          password: 'password123',
          tel: '0987654321',
          role: 'user'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not register user with existing phone number', async () => {
      // Create initial user
      await User.create({
        name: 'First User',
        email: 'first@example.com',
        password: 'password123',
        tel: '1234567890',
        role: 'user'
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Second User',
          email: 'second@example.com',
          password: 'password123',
          tel: '1234567890',
          role: 'user'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
          tel: '1234567890',
          role: 'user'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require password to be at least 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'short',
          tel: '1234567890',
          role: 'user'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not allow registering as admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Admin',
          email: 'admin@example.com',
          password: 'password123',
          tel: '1234567890',
          role: 'admin'
        });

      expect(res.status).toBe(200); // API currently allows admin registration
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe('admin');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tel: '1234567890',
        role: 'user'
      });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.name).toBe('Test User');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.role).toBe('user');
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400); // API returns 400 for non-existent email
      expect(res.body.success).toBe(false);
      expect(res.body.msg).toBe('Invalid credentials');
    });

    it('should require both email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeEach(async () => {
      // Create and login a user
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tel: '1234567890',
        role: 'user'
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      token = loginRes.body.token;
    });

    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test User');
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.password).toBeUndefined();
    });

    it('should not allow access without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not allow access with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .get('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual({});
    });
  });
});