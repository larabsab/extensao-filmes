const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  // Índice TTL: o MongoDB deleta o documento automaticamente após 12 horas
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '12h' 
  }
});

module.exports = mongoose.model('Room', roomSchema);