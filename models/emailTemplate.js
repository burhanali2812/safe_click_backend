const mongoose = require('mongoose');
const templateSchema = new mongoose.Schema({
  templateName: { type: String, required: true, unique: true, trim: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

const Template = mongoose.model('Template', templateSchema);
module.exports = Template;