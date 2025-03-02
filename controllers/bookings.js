const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel')

exports.getBookings = async (req, res, next) => {
    let query;

    //General users can see only their Booking
    if (req.user.role !== 'admin') {
        query = Booking.find({ user: req.user.id }).populate({
            path: 'hotel',
            select: 'name province tel'
        });
    } else {
        if (req.params.hotelId) {
            console.log(req.params.hotelId);
            query = Booking.find({ hotel: req.params.hotelId }).populate({
                path: "hotel",
                select: "name province tel"
            });
        } else {
            query = Booking.find().populate({
                path: 'hotel',
                select: 'name province tel'
            });
        }
    }

    try {
        const Bookings = await query;

        res.status(200).json({
            success: true,
            count: Bookings.length,
            data: Bookings
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Booking" });
    }
}

//@desc     Get single Booking
//@route    GET /api/v1/Bookings/:id
//@access   Public
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id).populate({
            path: 'hotel',
            select: 'name description tel'
        })

        if (!booking) {
            return res.status(404).json({ success: false, message: ` No Booking with the id of ${req.params.id}` });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot find Booking" });
    }
};

//@desc     Add Booking
//@route    POST /api/v1/hotels/:hotelId/Booking
//@access   Private
exports.addBooking = async (req, res, next) => {
    try {
        req.body.hotel = req.params.hotelId;

        const hotel = await Hotel.findById(req.params.hotelId);

        if (!hotel) {
            return res.status(404).json({ success: false, message: `No hotel with the id of ${req.params.hotelId}` });
        }

         // Check if the user ID in the request matched the authenticated user and not an admin
        if (req.body.user !== req.user.id && req.user.role != "admin") {
            return res.status(403).json({ 
                success: false, 
                message: "You are not authorized to make this booking" 
            });
        }
        
        //Check for existed Booking
        const existedBookings = await Booking.find({ user: req.user.id });

        //If the user is not an admin, they can only create 3 Booking.
        if (existedBookings.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false, message: `The user with ID ${req.user.id} has already made 3 Bookings`
            });
        };

        const booking = await Booking.create(req.body);

        res.status(200).json({
            success: true,
            data: booking
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false, message: "Cannot create Booking"
        });
    }
}

//@desc     Update Booking
//@route    PUT /api/v1/Bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: `No Booking with the id of ${req.params.id}` });
        }

        booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })

        res.status(200).json({
            success: true,
            data: booking
        })
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: "Cannot update Booking"
        });
    }
}

//@desc     Delete Booking
//@route    DELETE /api/v1/Bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: `No Booking with the id of ${req.params.id}` });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Cannot delete Booking" })
    }
};