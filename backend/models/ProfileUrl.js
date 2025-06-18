const mongoose = require('mongoose');

const profileUrlSchema = new mongoose.Schema({
  profileUrl: {
    type: String,
    required: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// No need for index since we'll only have one document
module.exports = mongoose.model('ProfileUrl', profileUrlSchema); 