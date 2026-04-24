const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true,
    default: ''
  },
  googleId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  appServicesUserId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  authProviders: {
    type: [String],
    default: ['password']
  },
  icon: {
    type: String,
    trim: true,
    default: 'quill'
  },
  passwordHash: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
