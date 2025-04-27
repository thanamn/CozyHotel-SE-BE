const mongoose = require('mongoose');
const connectDB = require('../../../config/db');

describe('Database Connection Tests', () => {
    let originalConsoleError;
    let originalEnv;

    beforeAll(() => {
        originalConsoleError = console.error;
        console.error = jest.fn();
        originalEnv = process.env.MONGODB_URI;
        process.env.MONGO_URI = 'mongodb://localhost:27017/test-db';
    });

    afterEach(async () => {
        await mongoose.connection.close();
        jest.restoreAllMocks();
    });

    afterAll(() => {
        console.error = originalConsoleError;
        process.env.MONGO_URI = originalEnv;
    });

    describe('Connection Handling', () => {
        it('should handle connection string validation', async () => {
            process.env.MONGO_URI = 'invalid://connection/string';
            await expect(connectDB()).rejects.toThrow();
        });

        it('should handle invalid port number', async () => {
            process.env.MONGO_URI = 'mongodb://localhost:invalid/test-db';
            await expect(connectDB()).rejects.toThrow();
        });

        it('should handle connection timeout', async () => {
            jest.spyOn(mongoose, 'connect').mockImplementationOnce(() => 
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timed out')), 100)
                )
            );

            await expect(connectDB()).rejects.toThrow('Connection timed out');
        });

        it('should handle basic connection attempt', async () => {
            const connectSpy = jest.spyOn(mongoose, 'connect');
            
            try {
                await connectDB();
            } catch (error) {
                // Ignore actual connection errors in test environment
            }

            expect(connectSpy).toHaveBeenCalledWith(process.env.MONGO_URI);
        });
    });
});