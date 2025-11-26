let ioInstance = null;

exports.init = (server, options = {}) => {
  try {
    const { Server } = require('socket.io');
    const io = new Server(server, {
      cors: {
        origin: options.corsOrigins || ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      // Allow clients to join a room for their user id
      socket.on('join', (userId) => {
        try {
          if (userId) socket.join(userId.toString());
        } catch (e) {
          console.error('Error joining socket room:', e);
        }
      });

      socket.on('disconnect', () => {
        // nothing special
      });
    });

    ioInstance = io;
    console.log('✅ Socket.IO initialized');
    return io;
  } catch (e) {
    console.warn('⚠️ Failed to initialize Socket.IO:', e.message);
    return null;
  }
};

exports.getIO = () => ioInstance;
