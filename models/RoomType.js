const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: "Hotel", // Assuming you have a 'Hotel' model
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    integer: true,
  },
  bedType: {
    type: String,
    enum: [
      "Single",
      "Double",
      "Queen",
      "King",
      "Twin",
      "Bunk Beds",
      "Sofa Bed",
    ],
    required: true,
  },
  size: {
    type: String,
    trim: true,
    maxLength: 50,
  },
  amenities: [
    {
      type: String,
      trim: true,
      maxLength: 100,
    },
  ],
  facilities: [
    {
      type: String,
      enum: [
        "Free Wi-Fi",
        "Swimming pool",
        "Free parking",
        "Front desk [24-hour]",
        "Restaurant",
        "Bar",
        "Massage",
        "Airport transfer",
        "Air conditioning",
        "Heating",
        "Private bathroom",
        "Television",
        "Mini-bar",
        "Coffee/tea maker",
        "Safe",
        "Balcony/terrace",
        "Non-smoking rooms available",
        "Soundproofing" /* Add more facilities */,
      ],
      trim: true,
    },
  ],
  images: [
    {
      type: String,
      trim: true,
    },
  ],
  basePrice: {
    type: Number,
    required: false,
    min: 0,
  },
  currency: {
    type: String,
    default: "THB",
    trim: true,
    maxLength: 10,
  },
  totalRooms: {
    type: Number,
    required: true,
    min: 0,
    integer: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  // Timestamps for creation and updates
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a compound index to enforce uniqueness of 'name' within the same 'hotelId'
roomTypeSchema.index({ hotelId: 1, name: 1 }, { unique: true });

// Static method to check room availability for a specific date range
roomTypeSchema.statics.checkAvailability = async function(roomTypeId, checkInDate, checkOutDate) {
  const Booking = mongoose.model('Booking');
  
  // Get the room type
  const roomType = await this.findById(roomTypeId);
  if (!roomType) {
    throw new Error('Room type not found');
  }

  // Convert string dates to Date objects
  const startDate = new Date(checkInDate);
  const endDate = new Date(checkOutDate);

  // Get all bookings that overlap with our date range
  const overlappingBookings = await Booking.find({
    roomType: roomTypeId,
    $or: [
      {
        checkinDate: { $lte: endDate },
        checkoutDate: { $gte: startDate }
      }
    ]
  });

  // Create a map to count bookings for each day
  const bookingsByDay = new Map();
  
  // For each booking, increment the count for each day it covers
  overlappingBookings.forEach(booking => {
    const bookingStart = new Date(booking.checkinDate);
    const bookingEnd = new Date(booking.checkoutDate);
    
    // Iterate through each day of the booking
    for (let date = new Date(bookingStart); date < bookingEnd; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      bookingsByDay.set(dateStr, (bookingsByDay.get(dateStr) || 0) + 1);
    }
  });

  // Find the maximum number of rooms booked on any day
  let maxBookedRooms = 0;
  for (const count of bookingsByDay.values()) {
    maxBookedRooms = Math.max(maxBookedRooms, count);
  }

  // Calculate available rooms
  const availableRooms = roomType.totalRooms - maxBookedRooms;
  
  return {
    roomTypeId,
    totalRooms: roomType.totalRooms,
    bookedRooms: maxBookedRooms,
    availableRooms,
    isAvailable: availableRooms > 0,
    roomTypeDetails: {
      name: roomType.name,
      capacity: roomType.capacity,
      bedType: roomType.bedType,
      basePrice: roomType.basePrice,
      currency: roomType.currency
    },
    dailyBookings: Object.fromEntries(bookingsByDay)
  };
};

const RoomType = mongoose.model("RoomType", roomTypeSchema);

module.exports = RoomType;
