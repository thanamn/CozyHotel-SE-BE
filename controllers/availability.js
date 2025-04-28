const RoomType = require('../models/RoomType');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');

// Get available room types for a specific hotel and date range
exports.getAvailableRoomTypes = async (req, res) => {
  try {
    const { hotelId, checkInDate, checkOutDate } = req.query;

    if (!hotelId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide hotelId, checkInDate, and checkOutDate'
      });
    }

    // Validate dates
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date must be before check-out date'
      });
    }

    // Get all room types for the hotel
    const roomTypes = await RoomType.find({ hotelId });

    if (!roomTypes.length) {
      return res.status(404).json({
        success: false,
        message: 'No room types found for this hotel'
      });
    }

    // Check availability for each room type
    const availabilityPromises = roomTypes.map(roomType => 
      RoomType.checkAvailability(roomType._id, checkInDate, checkOutDate)
    );

    const availabilityResults = await Promise.all(availabilityPromises);

    // Filter out Deactivated room types
    const availableRoomTypes = availabilityResults.filter(result => result.isActivated);

    res.status(200).json({
      success: true,
      data: {
        hotelId,
        checkInDate: startDate,
        checkOutDate: endDate,
        availableRoomTypes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available hotels for a specific date range
exports.getAvailableHotels = async (req, res) => {
  try {
    const { checkInDate, checkOutDate } = req.query;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide checkInDate and checkOutDate'
      });
    }

    // Validate dates
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date must be before check-out date'
      });
    }

    // Get all hotels
    const hotels = await Hotel.find();

    if (!hotels.length) {
      return res.status(404).json({
        success: false,
        message: 'No hotels found'
      });
    }

    // Check availability for each hotel
    const hotelAvailabilityPromises = hotels.map(async (hotel) => {
      // Get all room types for this hotel
      const roomTypes = await RoomType.find({ hotelId: hotel._id });
      
      // Check availability for each room type
      const roomTypeAvailabilityPromises = roomTypes.map(roomType => 
        RoomType.checkAvailability(roomType._id, checkInDate, checkOutDate)
      );

      const roomTypeAvailability = await Promise.all(roomTypeAvailabilityPromises);
      
      // Check if any room type is Activated
      const hasAvailableRooms = roomTypeAvailability.some(result => result.isActivated);

      return {
        hotelId: hotel._id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        hasAvailableRooms,
        availableRoomTypes: roomTypeAvailability.filter(result => result.status == "available")
      };
    });

    const hotelAvailability = await Promise.all(hotelAvailabilityPromises);

    // Filter out hotels with no available rooms
    const availableHotels = hotelAvailability.filter(hotel => hotel.hasAvailableRooms);

    res.status(200).json({
      success: true,
      data: {
        checkInDate: startDate,
        checkOutDate: endDate,
        availableHotels
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 
