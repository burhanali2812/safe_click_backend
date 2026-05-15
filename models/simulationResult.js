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
  linkClicked: { 
    type: Boolean, 
    default: false 
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
  location: {
    city: String,
    country: String,
    coordinates: {
      type: [Number], 
      index: '2dsphere'
    }
  },


}, { 
  timestamps: { createdAt: true, updatedAt: false } // No need for updatedAt in an immutable log
});

interactionSchema.index({ campaignId: 1, userId: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = Interaction;