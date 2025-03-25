const User = require('../models/User');
const Booking = require('../models/Booking');

//@desc     Get All Users
//@route    GET /api/v1/users
//@access   Public
exports.getUsers = async (req, res, next) => {
    try {
        // Parse pagination parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
        const startIndex = (page - 1) * limit;

        // Get total count first
        const total = await User.countDocuments();

        // Build the query
        let query = User.find();

        // Apply pagination
        query = query.skip(startIndex).limit(limit);

        // Execute query
        const users = await query;

        // Send response
        res.status(200).json({
            success: true,
            count: total, // Total number of users (not just in this page)
            data: users,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                total
            }
        });
    } catch (err) {
        console.error('Error in getUsers:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

//@desc     Get Single User
//@route    GET /api/v1/users/:id
//@access   Public
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('Error in getUser:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
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
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('Error in updateUser:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

//@desc     Delete User
//@route    DELETE /api/v1/users/:id
//@access   Private
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Cascade delete related bookings
        await Booking.deleteMany({ user: req.params.id });

        await User.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error('Error in deleteUser:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};