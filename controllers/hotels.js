const { query } = require('express');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');
//@desc     Get all hotels
//@routes   GET /api/v1/hotels
//@access   Public
exports.getHotels = async (req, res, next) => {
    try {
        // Parse pagination parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit) || 6; // Default to 6 to match frontend
        const startIndex = (page - 1) * limit;

        // Get total count first
        const total = await Hotel.countDocuments();

        // Build the query
        let query = Hotel.find();

        // Apply pagination
        query = query.skip(startIndex).limit(limit);

        // Execute query
        const hotels = await query;

        // Send response
        res.status(200).json({
            success: true,
            count: total, // Total number of hotels (not just in this page)
            data: hotels,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total
            }
        });
    } catch (err) {
        console.error('Error in getHotels:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get single Hotel
// @route   GET /api/v1/Hotels/:id
// @access  Public
exports.getHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findById(req.params.id);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                error: 'Hotel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: hotel
        });
    } catch (err) {
        console.error('Error in getHotel:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};


// @desc    Create new Hotel
// @route   POST /api/v1/Hotels
// @access  Private
exports.createHotel = async (req, res, next) => {
    try {
        const exist = await Hotel.findOne({ name: req.body.name });

        if (exist) {
            return res.status(409).json({
                success: false,
                message: "Hotel name already exists"
            });
        }

        const hotel = await Hotel.create(req.body);
        res.status(201).json({
            success: true,
            data: hotel
        });
    } catch (err) {
        console.error('Error in createHotel:', err);
        if (err instanceof mongoose.Error.ValidationError) {
            const errorMessages = Object.values(err.errors).map(error => error.message);
            const message = errorMessages.join(', ');
            res.status(400).json({
                success: false,
                message: message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }
    }
};

// @desc    Update Hotel
// @route   PUT /api/v1/Hotels/:id
// @access  Private
exports.updateHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!hotel) {
            return res.status(404).json({
                success: false,
                error: 'Hotel not found'
            });
        }

        res.status(200).json({
            success: true,
            data: hotel
        });
    } catch (err) {
        console.error('Error in updateHotel:', err);
        if (err instanceof mongoose.Error.ValidationError) {
            const errorMessages = Object.values(err.errors).map(error => error.message);
            const message = errorMessages.join(', ');
            res.status(400).json({
                success: false,
                message: message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }
    }
};


// @desc    Delete Hotel
// @route   DELETE /api/v1/Hotels/:id
// @access  Private
exports.deleteHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findById(req.params.id);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: `Hotel not found with id of ${req.params.id}`
            });
        }

        // Delete all bookings associated with this hotel
        await Booking.deleteMany({ hotel: req.params.id });
        
        // Delete the hotel
        await Hotel.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error('Error in deleteHotel:', err);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

