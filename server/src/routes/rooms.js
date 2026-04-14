const router = require('express').Router();
const Room = require('../models/Room');
const verifyToken = require('../middleware/auth');

// POST /api/rooms - Cria uma nova sala
router.post('/', verifyToken, async (req, res) => {
  try {
    // O verifyToken já colocou o ID do usuário em req.user._id
    const newRoom = new Room({
      host: req.user._id,
      members: [req.user._id]
    });

    const savedRoom = await newRoom.save();
    res.status(201).json({ roomId: savedRoom._id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

// GET /api/rooms/:id - Verifica se a sala existe
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada ou expirada' });
    
    res.json({ roomId: room._id, host: room.host });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
});

module.exports = router;