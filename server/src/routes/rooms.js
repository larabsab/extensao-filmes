const router = require('express').Router();
const Room = require('../models/Room');
const verifyToken = require('../middleware/auth');

function buildRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = buildRoomCode();
    const existingRoom = await Room.exists({ roomCode });

    if (!existingRoom) {
      return roomCode;
    }
  }

  throw new Error('Nao foi possivel gerar um codigo unico para a sala.');
}

router.post('/', verifyToken, async (req, res) => {
  try {
    const roomCode = await generateUniqueRoomCode();
    const newRoom = new Room({
      roomCode,
      host: req.user._id,
      members: [req.user._id]
    });

    const savedRoom = await newRoom.save();
    res.status(201).json({ roomId: savedRoom._id, roomCode: savedRoom.roomCode });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Sala nao encontrada ou expirada.' });
    }

    res.json({ roomId: room._id, roomCode: room.roomCode, host: room.host });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
});

router.get('/code/:roomCode', verifyToken, async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ error: 'Sala nao encontrada ou expirada.' });
    }

    res.json({ roomId: room._id, roomCode: room.roomCode, host: room.host });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
});

module.exports = router;
