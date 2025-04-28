const mongoose = require('mongoose');
const User = require('../../../models/User');
const jwt = require('jsonwebtoken');
const { connect, clearDatabase, closeDatabase } = require('../../utils/dbHandler');

// Mock environment variables for JWT
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRE = '1h';

describe('User Model', () => {
  beforeAll(async () => await connect());
  afterEach(async () => await clearDatabase());
  afterAll(async () => await closeDatabase());

  describe('Validation', () => {
    it('should require name', async () => {
      const user = new User({
        email: 'test@example.com',
        tel: '1234567890',
        password: 'password123'
      });

      try {
        await user.validate();
      } catch (error) {
        expect(error.errors.name).toBeDefined();
      }
    });

    it('should require valid email format', async () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email',
        tel: '1234567890',
        password: 'password123'
      });

      try {
        await user.validate();
      } catch (error) {
        expect(error.errors.email).toBeDefined();
      }
    });

    it('should require valid phone number', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        tel: '123', // Too short
        password: 'password123'
      });

      try {
        await user.validate();
      } catch (error) {
        expect(error.errors.tel).toBeDefined();
      }
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        tel: '1234567890',
        password: 'password123'
      });

      expect(user.password).not.toBe('password123');
      expect(user.password).toHaveLength(60); // bcrypt hash length
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        tel: '1234567890',
        password: 'password123'
      });

      const token = user.getSignedJwtToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include correct payload in token', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        tel: '1234567890',
        password: 'password123'
      });

      const token = user.getSignedJwtToken();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id.toString()).toBe(user._id.toString());
    });
  });
});