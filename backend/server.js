const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const passport = require('passport');
const cron = require('node-cron');
const path = require('path');
const open = require('open');

// Load environment variables
dotenv.config();

// Import routes
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const assetRoutes = require('./routes/assets');
const agentRoutes = require('./routes/agent');
const deviceRoutes = require('./routes/devices');

// Import database connection
const { connectDB } = require('./database/connection');
const store = require('./database/dataStore');

// Import authentication strategies
require('./config/passport');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
// Rate limiting disabled to allow unlimited ticket creation
// const { rateLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting disabled to avoid IP-based request blocking during ticket creation
// app.use(rateLimiter);

// Passport middleware
app.use(passport.initialize());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/agent', agentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('../frontend/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'frontend', 'build', 'index.html'));
  });
}

// Make socket available to routes
app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
  });

  socket.on('leave', (room) => {
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Global error handler
app.use(errorHandler);

// Connect to database
connectDB();

// Seed initial data for development
store.seedInitialData();

// Scheduled tasks
cron.schedule('0 0 * * *', () => {
  // Daily compliance check
  console.log('Running daily compliance check...');
  // Implement compliance monitoring logic
});

cron.schedule('0 */6 * * *', () => {
  // Every 6 hours asset inventory sync
  console.log('Syncing asset inventory...');
  // Implement inventory sync logic
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  const isPkg = typeof process.pkg !== 'undefined';
  if (isPkg) {
    open(`http://localhost:${PORT}`);
  }
});

module.exports = { app, server, io };