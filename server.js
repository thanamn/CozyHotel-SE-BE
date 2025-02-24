const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')
const connectDB = require('./config/db');

// route files
const hotels = require('./routes/hotels')
const auth = require('./routes/auth');
const bookings =require('./routes/bookings');

// load dotenv
dotenv.config({path:'./config/config.env'})

// connect DB here
connectDB();

const app=express();

// body parser
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/hotels', hotels);
app.use('/api/v1/bookings', bookings)
app.use('/api/v1/auth',auth);

const PORT=process.env.PORT || 5000;
app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT))