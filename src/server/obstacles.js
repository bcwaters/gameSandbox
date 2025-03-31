/**
 * Obstacle management module
 */

const config = require('./config');

class ObstacleManager {
  constructor(io) {
    this.io = io;
    this.obstacles = {};
    this.nextId = 0;
    this.obstacleIds = []; // Array to track obstacle IDs in order of creation
  }

  /**
   * Initialize obstacles with random positions
   */
  initializeObstacles() {
    // Clear existing obstacles
    this.obstacles = {};
    this.obstacleIds = [];

    // Create the configured number of obstacles
    for (let i = 0; i < config.OBSTACLE_COUNT; i++) {
      this.createObstacle();
    }

    // Start the obstacle spawn timer
    this.startObstacleSpawnTimer();

    console.log(`Initialized ${Object.keys(this.obstacles).length} obstacles`);
    return this.obstacles;
  }
  
  /**
   * Start timer to spawn new obstacles periodically
   */
  startObstacleSpawnTimer() {
    // Clear any existing timer
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
    }
    
    // Set timer to spawn a new obstacle every 20 seconds
    this.spawnTimer = setInterval(() => {
      const newObstacle = this.createObstacle();
      
      // Broadcast the new obstacle to all clients
      if (newObstacle) {
        this.io.emit('newObstacle', newObstacle);
        console.log(`Spawned new obstacle: ${newObstacle.id} at (${newObstacle.x}, ${newObstacle.y})`);
      }
    }, 20000); // 20 seconds
  }

  /**
   * Create a new obstacle at a random position
   * @returns {Object} The created obstacle
   */
  createObstacle() {
    const id = `obstacle_${this.nextId++}`;
    let validPosition = false;
    let x, y;

    // Keep trying until we find a valid position
    while (!validPosition) {
      // Generate random position within world bounds
      // Add some margin to keep obstacles away from edges
      const margin = config.OBSTACLE_SIZE;
      x = Math.floor(Math.random() * (config.WORLD_WIDTH - 2 * margin)) + margin;
      
      // Make sure obstacles spawn below the UI navbar
      const minY = config.UI_HEIGHT + margin;
      y = Math.floor(Math.random() * (config.WORLD_HEIGHT - minY - margin)) + minY;

      validPosition = this.isValidObstaclePosition(x, y);
    }

    // Create the obstacle
    const obstacle = {
      id: id,
      x: x,
      y: y,
      size: config.OBSTACLE_SIZE,
      health: config.OBSTACLE_MAX_HEALTH
    };

    // Check if we already have the maximum number of obstacles
    if (this.obstacleIds.length >= config.MAX_OBSTACLES) {
      // Remove the oldest obstacle
      const oldestId = this.obstacleIds.shift();
      
      // Broadcast destruction event for the oldest obstacle
      this.io.emit('obstacleDestroyed', {
        obstacleId: oldestId,
        playerId: null // Not destroyed by any player
      });
      
      // Remove it from the map
      delete this.obstacles[oldestId];
      console.log(`Removed oldest obstacle ${oldestId} to make room for new one`);
    }

    // Add to obstacles map and tracking array
    this.obstacles[id] = obstacle;
    this.obstacleIds.push(id);
    
    console.log(`Created obstacle ${id}, total count: ${this.obstacleIds.length}/${config.MAX_OBSTACLES}`);

    return obstacle;
  }

  /**
   * Check if a position is valid for a new obstacle
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {boolean} Whether the position is valid
   */
  isValidObstaclePosition(x, y) {
    // Check minimum distance from respawn positions
    for (const respawnPos of config.RESPAWN_POSITIONS) {
      const dx = x - respawnPos.x;
      const dy = y - respawnPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < config.OBSTACLE_MIN_DISTANCE) {
        return false;
      }
    }

    // Check for overlap with existing obstacles
    for (const obstacleId in this.obstacles) {
      const obstacle = this.obstacles[obstacleId];
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Minimum distance between obstacles is 2.5 times their size
      if (distance < config.OBSTACLE_SIZE * 2.5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle a sword hit on an obstacle
   * @param {string} obstacleId - The ID of the hit obstacle
   * @param {string} playerId - The ID of the player who hit the obstacle
   * @returns {Object|null} The updated obstacle or null if destroyed
   */
  handleSwordHit(obstacleId, playerId) {
    const obstacle = this.obstacles[obstacleId];
    if (!obstacle) {
      return null;
    }

    // Decrease health
    obstacle.health -= 1;

    // If obstacle is destroyed
    if (obstacle.health <= 0) {
      // Broadcast destruction event
      this.io.emit('obstacleDestroyed', {
        obstacleId: obstacleId,
        playerId: playerId
      });

      // Remove from obstacles map
      delete this.obstacles[obstacleId];
      
      // Remove from the tracking array
      const index = this.obstacleIds.indexOf(obstacleId);
      if (index !== -1) {
        this.obstacleIds.splice(index, 1);
        console.log(`Removed obstacle ${obstacleId} (destroyed by player), total count: ${this.obstacleIds.length}/${config.MAX_OBSTACLES}`);
      }
      
      return null;
    }

    // Broadcast hit event
    this.io.emit('obstacleHit', {
      obstacleId: obstacleId,
      playerId: playerId,
      health: obstacle.health
    });

    return obstacle;
  }

  /**
   * Check for collision between a point and obstacles
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {number} radius - The radius of the point
   * @returns {boolean} Whether a collision is detected
   */
  checkPointCollision(x, y, radius) {
    for (const obstacleId in this.obstacles) {
      const obstacle = this.obstacles[obstacleId];
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If distance is less than combined radii, collision detected
      if (distance < (radius + obstacle.size / 2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all obstacles for serialization
   * @returns {Array} Array of obstacle objects
   */
  getSerializedObstacles() {
    return Object.values(this.obstacles);
  }
}

module.exports = ObstacleManager;