const mongoose = require('mongoose');
const { register, login } = require('../../../controllers/auth');
const User = require('../../../models/User');
const dbHandler = require('../../utils/dbHandler');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let next;
  const validUser = {
    name: 'Test User',
    email: 'test@example.com',
    tel: '1234567890',
    password: 'password123'
  };

  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  beforeEach(async () => {
    await dbHandler.clearDatabase();
    
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // Set environment variables
    process.env.JWT_COOKIE_EXPIRE = '30';
    process.env.JWT_EXPIRE = '1h'; // Added JWT_EXPIRE
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'test_secret';
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new user with correct response structure', async () => {
      mockReq.body = validUser;

      await register(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(200); // Changed to 201 for resource creation
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        expect.any(String),
        expect.any(Object)
      );

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).toMatchObject({
        success: true,
        name: validUser.name,
        email: validUser.email,
        role: 'user'
      });
      expect(responseData._id).toBeTruthy();
      expect(responseData.token).toBeTruthy();

      // Verify user was actually created in the database
      const createdUser = await User.findOne({ email: validUser.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser.name).toBe(validUser.name);
    });

    it('should handle duplicate email registration', async () => {
      // First create a user
      await User.create(validUser);

      // Try to create another user with the same email
      mockReq.body = validUser;
      await register(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false
      });
    });

    // minor typo detected: to be fix

    it('should validate required fields', async () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockReq.body = invalidUser;

      // Create a user with missing required fields
      await register(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await User.create(validUser);
    });

    it('should successfully login with valid credentials', async () => {
      const loginCredentials = {
        email: validUser.email,
        password: validUser.password
      };

      mockReq.body = loginCredentials;
      await login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        expect.any(String),
        expect.any(Object)
      );

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).toMatchObject({
        success: true,
        name: validUser.name,
        email: validUser.email,
        role: 'user'
      });
      expect(responseData._id).toBeTruthy();
      expect(responseData.token).toBeTruthy();
    });

    it('should reject login with incorrect password', async () => {
      mockReq.body = {
        email: validUser.email,
        password: 'wrongpassword'
      };

      await login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Invalid credentials'
      });
    });

    it('should validate required login fields', async () => {
      mockReq.body = { email: validUser.email }; // Missing password

      await login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Please provide an email and password'
      });
    });

    it('should handle non-existent email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: validUser.password
      };

      await login(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        msg: 'Invalid credentials'
      });
    });
  });
});