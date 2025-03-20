const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Update this with your frontend URL in production
      methods: ['GET', 'POST']
    }
  });


  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
  
    socket.on('login', (data) => {
      console.log('Login event received from client:', data);
  
      // Example: emit a login confirmation back
      io.emit('receiveLogin', { status: 'success', user: data });
    });
  
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
