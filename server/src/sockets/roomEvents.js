module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Novo usuário conectado: ${socket.id}`);

    // Evento para entrar em uma sala específica
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
      
      // Notifica os outros membros da sala que alguém entrou
      socket.to(roomId).emit('user-joined', { userId: socket.id });
    });

    // Eventos de sincronização de vídeo (Interceptados do Content Script)
    socket.on('sync-play', ({ roomId, timestamp }) => {
      console.log(`Play recebido na sala ${roomId} no tempo ${timestamp}`);
      // Emite para todos na sala, EXCETO quem enviou
      socket.to(roomId).emit('force-play', { timestamp });
    });

    socket.on('sync-pause', ({ roomId, timestamp }) => {
      console.log(`Pause recebido na sala ${roomId} no tempo ${timestamp}`);
      socket.to(roomId).emit('force-pause', { timestamp });
    });

    socket.on('sync-seek', ({ roomId, timestamp }) => {
      console.log(`Seek recebido na sala ${roomId} para o tempo ${timestamp}`);
      socket.to(roomId).emit('force-seek', { timestamp });
    });

    // Desconexão do usuário
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${socket.id}`);
    });
  });
};