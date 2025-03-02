const User = require('../models/User');
const Booking = require('../models/Booking');

//@desc     Get All Users
//@route    GET /api/v1/users
//@access   Public
exports.getUsers = async (req, res, next) => {
    let query;

    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = User.find(JSON.parse(queryStr));

    // Select fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    try {
        const users = await query;

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: users.length,
            pagination,
            data: users
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
    }
};

//@desc     Get Single User
//@route    GET /api/v1/users/:id
//@access   Public
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
    }
};

//@desc     Update User
//@route    PUT /api/v1/users/:id
//@access   Private
exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
    }
};

//@desc     Delete User
//@route    DELETE /api/v1/users/:id
//@access   Private
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        // Cascade delete related bookings
        await Booking.deleteMany({ user: req.params.id });

        await User.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
    }
};