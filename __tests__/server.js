const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("../config/db");  // Fix path to point to the root config
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

// Load dotenv
dotenv.config({ path: "./config/config.env" });

const setupApp = (app) => {
  // rate limit
  const limiter = rateLimit({
    windowsMs: 10 * 50 * 1000,
    max: 100,
  });

  // body parser
  app.use(express.json());
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(helmet());
  app.use(xss());
  app.use(hpp());
  app.use(cors());
  app.use(limiter);

  // route files
  const hotels = require("../routes/hotels");
  const auth = require("../routes/auth");
  const bookings = require("../routes/bookings");
  const accounts = require("../routes/accounts");
  const roomTypes = require('../routes/roomTypes');
  const manager = require('../routes/manager');
  const availability = require('../routes/availability');

  app.use("/api/v1/hotels", hotels);
  app.use("/api/v1/bookings", bookings);
  app.use("/api/v1/auth", auth);
  app.use("/api/v1/accounts", accounts);
  app.use('/api/v1/roomtypes', roomTypes);
  app.use('/api/v1/manager', manager);
  app.use('/api/v1/availability', availability);

  return app;
};

// connect DB here
connectDB();

// Create express app if not provided (standalone mode)
if (!module.parent) {
  const app = setupApp(express());
  const PORT = process.env.PORT || 5000;
  app.listen(
    PORT,
    console.log(
      "Server running in ",
      process.env.NODE_ENV,
      " mode on port ",
      PORT
    )
  );
}

module.exports = setupApp;
