const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['passenger', 'driver', 'admin'],
    required: true
  },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // Driver-specific fields
  licenseId: {
    type: String,
    required: function() {
      return this.role === 'driver';
    },
    unique: true,
    sparse: true, // Allows multiple null values for non-drivers
  },
  earnings: {
    type: Number,
    default: function() {
      return this.role === 'driver' ? 0 : undefined;
    },
  },
  badges: {
    type: [
      {
        name: { type: String, required: true }, // e.g., "Safe Driver"
        description: { type: String }, // e.g., "No delays in 30 days"
        awardedAt: { type: Date, default: Date.now },
      },
    ],
    default: function() {
      return this.role === 'driver' ? [] : undefined;
    },
  },
}, { timestamps: true });

// Pre-save hook to ensure driver-specific fields are handled correctly
userSchema.pre('save', function(next) {
  if (this.role !== 'driver') {
    this.licenseId = undefined;
    this.earnings = undefined;
    this.badges = undefined;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);