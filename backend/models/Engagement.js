const mongoose = require('mongoose');

const engagementSchema = new mongoose.Schema({
  profileUrl: {
    type: String,
    required: true,
    unique: true  // To prevent duplicate entries
  },
  name: String,
  connectionSent: {
    type: Boolean,
    default: false
  },
  followUpSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient profile lookup
engagementSchema.index({ profileUrl: 1 });

module.exports = mongoose.model('Engagement', engagementSchema); 