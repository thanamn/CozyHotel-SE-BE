const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

// route files
const hotels = require("./routes/hotels");
const auth = require("./routes/auth");
const bookings = require("./routes/bookings");

// load dotenv
dotenv.config({ path: "./config/config.env" });

// rate limit
const limiter = rateLimit({
  windowsMs: 10 * 50 * 1000,
  max: 100,
});

// connect DB here
connectDB();

const app = express();

// body parser
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(hpp());
app.use(cors());
app.use(limiter);

app.use("/api/v1/hotels", hotels);
app.use("/api/v1/bookings", bookings);
app.use("/api/v1/auth", auth);

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
