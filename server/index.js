require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');
const apiLimiter = require('./src/middleware/rateLimit');

// Importação da lógica de sockets (vamos criar no próximo passo)
const setupRoomEvents = require('./src/sockets/roomEvents');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter); // Protege todas as rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));

// Configuração do Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Na produção, vamos limitar aos domínios da extensão
    methods: ['GET', 'POST']
  }
});

// Injetando a instância do io na nossa lógica de eventos
setupRoomEvents(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});