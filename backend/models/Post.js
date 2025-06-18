const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed,  // Allow both String and ObjectId
    default: () => new mongoose.Types.ObjectId()
  },
  linkedinId: {
    type: String,
    unique: true,
    sparse: true,  // This allows null/undefined values while maintaining uniqueness for non-null values
    required: false  // Make it optional
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  hashtags: [{
    type: String
  }],
  scheduledTime: {
    type: Date,
    required: function() {
      // Only require scheduledTime if status is 'scheduled'
      return this.status === 'scheduled';
    },
    default: null
  },
  originalScheduledTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'posting', 'completed', 'failed', 'rescheduled'],
    default: 'draft'
  },
  reschedulingHistory: [{
    fromTime: Date,
    toTime: Date,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  postUrl: {
    type: String
  },
  engagement: {
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  engagers: [{
    profileUrl: String,
    type: {
      type: String,
      enum: ['like', 'comment', 'share']
    },
    connectionStatus: {
      type: String,
      enum: ['pending', 'sent', 'accepted', 'failed'],
      default: 'pending'
    },
    followUpStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  error: {
    message: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying of scheduled posts
postSchema.index({ scheduledTime: 1, status: 1 });

// Add a pre-save middleware to handle status updates
postSchema.pre('save', function(next) {
  // If scheduledTime is set, ensure status is 'scheduled'
  if (this.scheduledTime && this.status === 'draft') {
    this.status = 'scheduled';
  }
  // If scheduledTime is removed, ensure status is 'draft'
  if (!this.scheduledTime && this.status === 'scheduled') {
    this.status = 'draft';
  }
  next();
});

module.exports = mongoose.model('Post', postSchema); 