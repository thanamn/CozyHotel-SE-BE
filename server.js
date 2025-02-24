const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')
const connectDB = require('./config/db');

// route files
const hospitals = require('./routes/hospitals')
const auth = require('./routes/auth');
const appointments =require('./routes/appointments');

// load dotenv
dotenv.config({path:'./config/config.env'})

// connect DB here
connectDB();

const app=express();

// body parser
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/hospitals',hospitals);
app.use('/api/v1/appointments', appointments)
app.use('/api/v1/auth',auth);

const PORT=process.env.PORT || 5000;
app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT))