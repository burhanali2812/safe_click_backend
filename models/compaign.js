const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
description: { type: String },
  emailTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
  launchDate: { type: Date , default: Date.now()},
  trackingEnabled: { type: Boolean, default: false },
}, { timestamps: true });


const Campaign = mongoose.model("Campaign", campaignSchema);
module.exports = Campaign;