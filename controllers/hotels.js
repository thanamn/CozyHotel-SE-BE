const { query } = require('express');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
//@desc     Get all hotels
//@routes   GET /api/v1/hotels
//@access   Public
exports.getHotels = async (req, res, next) => {
    let query;

    const reqQuery = { ...req.query };

    //Field to exclude
    const remove = ['select', 'sort', 'page', 'limit'];

    remove.forEach(param => delete reqQuery[param]);
    console.log(reqQuery);

    let queryStr = JSON.stringify(req.query);

    //Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    //finding resource
    query = Hotel.find(JSON.parse(queryStr)).populate('bookings');

    //Select fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Hotel.countDocuments();

    query = query.skip(startIndex).limit(limit);

    try {
        const Hotels = await query;

        //Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            }
        }

        if (startIndex < total) {
            pagination.prev = {
                page: page - 1,
                limit
            }
        }

        res.status(200).json({
            success: true,
            count: Hotels.length,
            pagination,
            data: Hotels
        })
    }
    catch (err) {
        res.status(400).json({ success: false });
    }
};

// @desc    Get single Hotel
// @route   GET /api/v1/Hotels/:id
// @access  Public
exports.getHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findById(req.params.id);

        if (!hotel) {
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: hotel });
    } catch (err) {
        console.log(err)
        res.status(400).json({ success: false });
    }
};


// @desc    Create new Hotel
// @route   POST /api/v1/Hotels
// @access  Private
exports.createHotel = async (req, res, next) => {
    const exist = await Hotel.findOne({
        name: req.body.name
    });

    if (exist) {
        return res.status(409).json({
            success: false,
            message: "Hotel name already exist"
        });
    }

    const hotel = await Hotel.create(req.body);
    res.status(201).json({
        success: true,
        data: hotel
    });
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
            return res.status(400).json({ success: false });
        }

        res.status(200).json({ success: true, data: hotel });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};


// @desc    Delete Hotel
// @route   DELETE /api/v1/Hotels/:id
// @access  Private
exports.deleteHotel = async (req, res, next) => {
    try {
        const hotel = await Hotel.findById(req.params.id);

        if (!hotel) {
            return res.status(404).json({ success: false, message: `Hotel not foundwith id of ${req.params.id}` })
        }
        await Booking.deleteMany({ hotel: req.params.id });
        await Hotel.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.log(err.stack);
        res.status(400).json({ success: false });
    }
};

