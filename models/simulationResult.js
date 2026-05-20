const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true,
    index: true 
  },

  emailOpened: { 
    type: Boolean, 
    default: false 
  },
  emailOpenedAt: { 
    type: Date 
  },
  linkClicked: { 
    type: Boolean, 
    default: false 
  },
  clickedAt: { 
    type: Date 
  },


  // Metrics & Metadata
  interactionTime: { 
    type: Date 
  },
  ipAddress: { 
    type: String, 
    trim: true 
  },
  
  deviceInfo: {
    type: String 
  },

  operatingSystem: { 
    type: String 
  },
  deviceType: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
    default: 'Unknown'
  },
  browser: {
    type: String
  },
  location: {
    country: String,
    region: String,
    area: String,
    coordinates: {
      lat: Number,
      lon: Number
    }
  }
}, { 
  timestamps: { createdAt: true, updatedAt: false } // No need for updatedAt in an immutable log
});

interactionSchema.index({ campaignId: 1, userId: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = Interaction;