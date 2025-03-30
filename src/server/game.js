/**
 * Core game logic and state management
 */

const config = require('./config');
const PlayerManager = require('./players');
const ProjectileManager = require('./projectiles');
const PhysicsManager = require('./physics');

class Game {
  constructor(io) {
    this.io = io;
    this.playerManager = new PlayerManager(io);
    this.projectileManager = new ProjectileManager(io);
    this.physicsManager = new PhysicsManager();
    this.lastUpdateTime = Date.now();
  }

  /**
   * Initialize game event handlers
   */
  initialize() {
    this.io.on('connection', this.handlePlayerConnection.bind(this));
    
    // Start the game loop
    this.startGameLoop();
  }

  /**
   * Handle a new player connection
   * @param {Object} socket - The socket.io socket object
   */
  handlePlayerConnection(socket) {
    console.log('A user connected:', socket.id);
    
    // Create a new player
    const player = this.playerManager.createPlayer(socket.id);
    
    // Send current game state to the new player
    socket.emit('currentPlayers', this.playerManager.getAllPlayers());
    
    // Inform other players of the new player
    socket.broadcast.emit('newPlayer', player);
    
    // Setup event handlers for this player
    this.setupPlayerEvents(socket);
  }

  /**
   * Set up socket event handlers for a player
   * @param {Object} socket - The socket.io socket object
   */
  setupPlayerEvents(socket) {
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      this.playerManager.removePlayer(socket.id);
    });
    
    // Handle player input
    socket.on('playerInput', (inputData) => {
      this.playerManager.updatePlayerInput(socket.id, inputData);
    });
    
    // Handle legacy movement (keeping for compatibility)
    socket.on('playerMovement', (movementData) => {
      const player = this.playerManager.getPlayer(socket.id);
      if (player) {
        player.x = movementData.x;
        player.y = movementData.y;
        player.direction = movementData.direction;
        player.moving = movementData.moving;
        
        socket.broadcast.emit('playerMoved', player);
      }
    });
    
    // Handle projectile firing
    socket.on('fireProjectile', (projectileData) => {
      const player = this.playerManager.getPlayer(socket.id);
      if (player) {
        const direction = projectileData.direction || player.direction;
        this.projectileManager.createProjectile(socket.id, player, direction);
      }
    });
    
    // Handle ammo reload
    socket.on('reloadAmmo', () => {
      this.playerManager.reloadAmmo(socket.id);
    });
    
    // Handle player hit notification
    socket.on('playerHit', (hitInfo) => {
      const hitPlayer = this.playerManager.hitPlayer(
        hitInfo.hitPlayerId, 
        hitInfo.shooterId, 
        config.PROJECTILE_DAMAGE
      );
      
      // If hit was successful, broadcast it
      if (hitPlayer) {
        this.io.emit('playerHit', hitInfo);
      }
    });
    
    // Handle player defeat
    socket.on('playerDefeated', (data) => {
      this.playerManager.defeatPlayer(data.playerId);
    });
    
    // Handle player respawn
    socket.on('respawnPlayer', (data) => {
      this.playerManager.respawnPlayer(data.playerId);
    });
    
    // Handle projectile destruction
    socket.on('destroyProjectile', (data) => {
      this.projectileManager.removeProjectile(data.projectileId);
    });
    
    // Handle sword use
    socket.on('swordUsed', (swordData) => {
      const player = this.playerManager.getPlayer(socket.id);
      if (player) {
        this.io.emit('swordUsed', {
          playerId: socket.id,
          x: swordData.x,
          y: swordData.y,
          rotation: swordData.rotation,
          direction: swordData.direction
        });
      }
    });
    
    // Handle sword hit
    socket.on('swordHit', (hitInfo) => {
      const hitPlayer = this.playerManager.hitPlayer(
        hitInfo.hitPlayerId, 
        hitInfo.attackerId, 
        config.SWORD_DAMAGE
      );
      
      // If hit was successful, broadcast it
      if (hitPlayer) {
        this.io.emit('playerSwordHit', hitInfo);
      }
    });
    
    // Handle setting player name
    socket.on('setPlayerName', (data) => {
      this.playerManager.setPlayerName(socket.id, data.name);
    });
  }

  /**
   * Start the game update loop
   */
  startGameLoop() {
    setInterval(() => {
      this.update();
    }, config.TICK_RATE);
  }

  /**
   * Update game state - physics and game logic
   */
  update() {
    // Calculate delta time
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;
    
    // Update player positions based on inputs
    this.physicsManager.updatePlayerPositions(
      this.playerManager.getAllPlayers(), 
      deltaTime
    );
    
    // Handle player-player collisions
    this.physicsManager.handlePlayerCollisions(
      this.playerManager.getAllPlayers()
    );
    
    // Update projectiles
    this.projectileManager.update(
      deltaTime, 
      this.playerManager.getAllPlayers(),
      (hitPlayerId, shooterId) => {
        // Handle player being hit by projectile
        const hitPlayer = this.playerManager.hitPlayer(
          hitPlayerId, 
          shooterId, 
          config.PROJECTILE_DAMAGE
        );
        
        if (hitPlayer) {
          this.io.emit('playerHit', {
            hitPlayerId: hitPlayerId,
            shooterId: shooterId
          });
        }
      }
    );
    
    // Send game state to all clients
    this.io.emit('gameState', {
      players: this.playerManager.getSerializedPlayers(),
      projectiles: this.projectileManager.getSerializedProjectiles()
    });
  }
}

module.exports = Game;