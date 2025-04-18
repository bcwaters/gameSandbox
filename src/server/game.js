/**
 * Core game logic and state management
 */

const config = require('./config');
const PlayerManager = require('./players');
const ProjectileManager = require('./projectiles');
const ObstacleManager = require('./obstacles');
const CoinManager = require('./coins'); // Re-enabled coin manager
const PhysicsManager = require('./physics');

class Game {
  constructor(io) {
    this.io = io;
    this.playerManager = new PlayerManager(io);
    this.projectileManager = new ProjectileManager(io);
    this.obstacleManager = new ObstacleManager(io);
    this.coinManager = new CoinManager(io); // Re-enabled coin manager
    this.physicsManager = new PhysicsManager();
    this.lastUpdateTime = Date.now();
    
    // Circles drawn by players
    this.circles = {};
    this.circleIdCounter = 1;
    this.playerCircles = {}; // Map player IDs to their active circle
  }

  /**
   * Initialize game event handlers
   */
  initialize() {
    // Initialize obstacles
    this.obstacleManager.initializeObstacles();
    
    // Setup socket connection handler
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
    
    // Send obstacles and outlines separately
    const serializedObstacles = this.obstacleManager.getSerializedObstacles();
    socket.emit('currentObstacles', {
      obstacles: serializedObstacles.obstacles,
      outlines: serializedObstacles.outlines
    });
    
    socket.emit('currentCoins', this.coinManager.getSerializedCoins()); // Re-enabled coins
    
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
        // Check if target position is provided (for cursor-based aiming)
        if (projectileData.useTargetPosition && 
            projectileData.targetX !== null && 
            projectileData.targetY !== null) {
          
          // Create a projectile with target position
          this.projectileManager.createProjectileWithTarget(
            socket.id, 
            player, 
            projectileData.targetX, 
            projectileData.targetY
          );
        } else {
          // Fallback to direction-based firing (backward compatibility)
          const direction = projectileData.direction || player.direction;
          this.projectileManager.createProjectile(socket.id, player, direction);
        }
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
      // Get player before marking as defeated (to get position)
      const player = this.playerManager.getPlayer(data.playerId || socket.id);
      
      if (player) {
        console.log(`Player ${socket.id} defeated at position (${player.x}, ${player.y})`);
        
        // Store player position before marking as defeated
        const playerX = player.x;
        const playerY = player.y;
        
        // Mark player as defeated
        this.playerManager.defeatPlayer(data.playerId || socket.id);
        
        // Delay coin spawn slightly to prevent immediate collection
        setTimeout(() => {
          // Create a player-dropped coin with special properties
          console.log(`Spawning player-drop coin at (${playerX}, ${playerY}) for defeated player ${socket.id}`);
          this.coinManager.dropCoinAtPosition(playerX, playerY, 'player_drop', 5);
        }, 500); // 500ms delay - longer than client-side visual effect
      }
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
          direction: swordData.direction,
          targetX: swordData.targetX || null,
          targetY: swordData.targetY || null,
          useTargetPosition: swordData.useTargetPosition || false
        });
      }
    });
    
    // Handle sword hit on player
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
    
    // Handle sword hit on obstacle
    socket.on('obstacleHit', (hitInfo) => {
      this.obstacleManager.handleSwordHit(
        hitInfo.obstacleId,
        socket.id
      );
    });
    
    // Handle setting player name
    socket.on('setPlayerName', (data) => {
      this.playerManager.setPlayerName(socket.id, data.name);
    });
    
    // Handle setting player character type
    socket.on('setPlayerCharType', (data) => {
      this.playerManager.setPlayerCharacterType(socket.id, data.charType);
    });
    
    // Handle coin collection
    socket.on('collectCoin', (data) => {
      try {
        if (!data || !data.coinId) {
          console.error('Invalid collectCoin data:', data);
          return;
        }
        
        console.log(`Player ${socket.id} attempting to collect coin ${data.coinId}`);
        
        const coin = this.coinManager.collectCoin(data.coinId, socket.id);
        
        // If coin was collected successfully, increase player's score
        if (coin && coin.value) {
          this.playerManager.increaseScore(socket.id, coin.value);
        } else {
          // Coin might have already been collected by another player
          // Send an acknowledgment anyway to sync client state
          socket.emit('coinRemoved', {
            coinId: data.coinId,
            collected: true
          });
        }
      } catch (error) {
        console.error('Error in collectCoin handler:', error);
      }
    });
    
    // Handle circle creation
    socket.on('createCircle', (circleData) => {
      try {
        // Create a new circle with server-assigned ID
        const circleId = this.createCircle(socket.id, circleData.x, circleData.y, circleData.radius);
        
        // Broadcast to all players
        if (circleId) {
          const circle = this.circles[circleId];
          this.io.emit('circleCreated', circle);
          
          // Set expiration time (5 seconds)
          setTimeout(() => {
            this.removeCircle(circleId);
          }, 5000);
        }
      } catch (error) {
        console.error('Error creating circle:', error);
      }
    });
    
    // Handle circle removal
    socket.on('removeCircle', (data) => {
      try {
        // Validate the requester owns the circle
        const circleId = data.circleId;
        const circle = this.circles[circleId];
        
        if (circle && circle.playerId === socket.id) {
          this.removeCircle(circleId);
        }
      } catch (error) {
        console.error('Error removing circle:', error);
      }
    });
  }
  
  /**
   * Create a new circle and assign it to a player
   * @param {string} playerId - ID of the player creating the circle
   * @param {number} x - X position of the circle
   * @param {number} y - Y position of the circle
   * @param {number} radius - Radius of the circle
   * @returns {string} ID of the created circle
   */
  createCircle(playerId, x, y, radius) {
    // If player already has a circle, remove it first
    if (this.playerCircles[playerId]) {
      this.removeCircle(this.playerCircles[playerId]);
    }
    
    // Create a unique ID for the circle
    const circleId = `circle_${this.circleIdCounter++}`;
    
    // Create the circle object
    const circle = {
      id: circleId,
      playerId: playerId,
      x: x,
      y: y,
      radius: radius || 100,
      createdAt: Date.now()
    };
    
    // Store the circle
    this.circles[circleId] = circle;
    this.playerCircles[playerId] = circleId;
    
    return circleId;
  }
  
  /**
   * Remove a circle by ID
   * @param {string} circleId - ID of the circle to remove
   */
  removeCircle(circleId) {
    const circle = this.circles[circleId];
    if (circle) {
      // Remove player's reference to this circle
      if (this.playerCircles[circle.playerId] === circleId) {
        delete this.playerCircles[circle.playerId];
      }
      
      // Remove the circle
      delete this.circles[circleId];
      
      // Notify all clients
      this.io.emit('circleRemoved', circleId);
      
      return true;
    }
    return false;
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
      deltaTime,
      this.obstacleManager // Pass obstacle manager for collision detection
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
      },
      this.obstacleManager // Pass obstacle manager for collision detection
    );
    
    // Prepare serialized obstacles and outlines
    const serializedObstacles = this.obstacleManager.getSerializedObstacles();
    
    // Send game state to all clients
    const gameState = {
      players: this.playerManager.getSerializedPlayers(),
      projectiles: this.projectileManager.getSerializedProjectiles(),
      obstacles: serializedObstacles.obstacles,
      outlines: serializedObstacles.outlines
    };
    
    // Re-enabled coins
    if (Math.floor(Date.now() / 1000) % 5 === 0) {
      gameState.coins = this.coinManager.getSerializedCoins();
    }
    
    this.io.emit('gameState', gameState);
  }
}

module.exports = Game;