/**
 * Main server entry point
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const Game = require('./game');

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.Server(this.app);
    this.io = socketIO(this.server);
    this.game = new Game(this.io);
    
    // Setup middleware
    this.setupMiddleware();
    
    // Initialize game
    this.game.initialize();
  }

  /**
   * Setup Express middleware and routes
   */
  setupMiddleware() {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // Serve the main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
  }

  /**
   * Start the server
   * @param {number} port - The port to listen on
   */
  start(port = 3000) {
    this.server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

// Create and start the server
const PORT = process.env.PORT || 3000;
const gameServer = new GameServer();
gameServer.start(PORT);