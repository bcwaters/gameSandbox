/**
 * Obstacle management module
 */

const config = require('./config');

class ObstacleManager {
  constructor(io) {
    this.io = io;
    this.obstacles = {};
    this.outlines = {}; // Store outlines of destroyed obstacles
    this.nextId = 0;
    this.obstacleIds = []; // Array to track obstacle IDs in order of creation
    this.obstacleGroups = []; // To track obstacle groups
    this.destroyedObstacles = []; // Queue of obstacles to be respawned
    this.totalObstacleCount = 0; // Track total blocks including destroyed ones that will respawn
  }

  /**
   * Initialize obstacles with random positions
   */
  initializeObstacles() {
    // Clear existing obstacles and outlines
    this.obstacles = {};
    this.outlines = {};
    this.obstacleIds = [];
    this.obstacleGroups = [];
    this.destroyedObstacles = [];
    this.totalObstacleCount = 0;

    // Create obstacle groups
    const groupCount = Math.ceil(config.OBSTACLE_COUNT / 5); // Create enough groups for all obstacles
    for (let i = 0; i < groupCount; i++) {
      this.createObstacleGroup();
    }

    // Start the obstacle spawn timer
    this.startObstacleSpawnTimer();
    
    // Start the respawn timer for destroyed obstacles
    this.startObstacleRespawnTimer();

    console.log(`Initialized ${Object.keys(this.obstacles).length} obstacles in ${this.obstacleGroups.length} groups`);
    return this.obstacles;
  }
  
  /**
   * Start timer to respawn destroyed obstacles
   */
  startObstacleRespawnTimer() {
    // Clear any existing timer
    if (this.respawnTimer) {
      clearInterval(this.respawnTimer);
    }
    
    // Set timer to check for respawns every second
    this.respawnTimer = setInterval(() => {
      this.processObstacleRespawns();
    }, 1000); // Check every second
  }
  
  /**
   * Process the queue of obstacles waiting to be respawned
   */
  processObstacleRespawns() {
    const now = Date.now();
    let respawned = false;
    
    // Process all obstacles that are ready to respawn
    while (this.destroyedObstacles.length > 0 && 
           now >= this.destroyedObstacles[0].respawnTime) {
      
      // Get the next obstacle to respawn
      const obstacleToRespawn = this.destroyedObstacles.shift();
      
      // Try to respawn the obstacle at its original position
      const respawnedObstacle = this.respawnObstacle(obstacleToRespawn);
      
      if (respawnedObstacle) {
        respawned = true;
        // Broadcast the respawned obstacle
        this.io.emit('obstacleRespawned', respawnedObstacle);
        
        // Remove the outline
        const outlineId = `outline_${obstacleToRespawn.originalId}`;
        if (this.outlines[outlineId]) {
          delete this.outlines[outlineId];
          this.io.emit('outlineRemoved', outlineId);
        }
        
        console.log(`Respawned obstacle at (${respawnedObstacle.x}, ${respawnedObstacle.y}), total count: ${this.obstacleIds.length}/${config.MAX_OBSTACLES}`);
      }
    }
    
    // If we respawned any obstacles, send updated game state
    if (respawned) {
      this.io.emit('obstaclesUpdated', this.getSerializedObstacles());
    }
  }
  
  /**
   * Start timer to spawn new obstacles periodically
   */
  startObstacleSpawnTimer() {
    // Clear any existing timer
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
    }
    
    // Set timer to spawn a new obstacle group every 30 seconds
    this.spawnTimer = setInterval(() => {
      // Create a new group instead of a single obstacle
      const newGroup = this.createObstacleGroup();
      
      // Broadcast the new obstacles to all clients
      if (newGroup && newGroup.length > 0) {
        newGroup.forEach(obstacle => {
          this.io.emit('newObstacle', obstacle);
        });
        console.log(`Spawned new obstacle group with ${newGroup.length} obstacles`);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Create a group of obstacles that form a pattern
   * @returns {Array} The created obstacles
   */
  createObstacleGroup() {
    // Decide group size (1-5 obstacles)
    const groupSize = Math.min(5, Math.floor(Math.random() * 3) + 3); // 3-5 obstacles per group
    const createdObstacles = [];
    
    // Find a valid starting position for the group
    let startX, startY;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 50) {
      attempts++;
      // Generate random start position
      const margin = config.OBSTACLE_SIZE * 2;
      startX = Math.floor(Math.random() * (config.WORLD_WIDTH - 2 * margin)) + margin;
      
      // Make sure obstacles spawn below the UI navbar
      const minY = config.UI_HEIGHT + margin;
      startY = Math.floor(Math.random() * (config.WORLD_HEIGHT - minY - margin)) + minY;
      
      // Check if this position works for a group
      validPosition = this.isValidGroupPosition(startX, startY, groupSize);
    }
    
    if (!validPosition) {
      console.log("Could not find valid position for obstacle group after 50 attempts");
      return []; // Return empty array if no valid position found
    }
    
    // Generate pattern based on starting position
    // Choose a pattern: line, L-shape, square, etc.
    const patterns = ['line', 'L-shape', 'square'];
    const patternType = patterns[Math.floor(Math.random() * patterns.length)];
    
    const positions = this.generateGroupPositions(startX, startY, groupSize, patternType);
    
    // Create obstacles at each position
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const obstacle = this.createObstacleAt(pos.x, pos.y);
      if (obstacle) {
        createdObstacles.push(obstacle);
      }
    }
    
    // Store the group reference
    if (createdObstacles.length > 0) {
      this.obstacleGroups.push(createdObstacles.map(o => o.id));
    }
    
    return createdObstacles;
  }
  
  /**
   * Generate positions for a group of obstacles based on pattern type
   * @param {number} startX - The starting X coordinate
   * @param {number} startY - The starting Y coordinate
   * @param {number} size - The number of obstacles in the group
   * @param {string} pattern - The pattern type
   * @returns {Array} Array of position objects {x, y}
   */
  generateGroupPositions(startX, startY, size, pattern) {
    const positions = [];
    const spacing = config.OBSTACLE_SIZE * 1.2; // Slightly larger than obstacle size for spacing
    
    switch (pattern) {
      case 'line':
        // Create a horizontal or vertical line
        const isHorizontal = Math.random() > 0.5;
        
        for (let i = 0; i < size; i++) {
          if (isHorizontal) {
            positions.push({
              x: startX + (i * spacing),
              y: startY
            });
          } else {
            positions.push({
              x: startX,
              y: startY + (i * spacing)
            });
          }
        }
        break;
        
      case 'L-shape':
        // Create an L-shape pattern
        const legLength = Math.floor(size / 2);
        
        // First leg (horizontal)
        for (let i = 0; i < legLength; i++) {
          positions.push({
            x: startX + (i * spacing),
            y: startY
          });
        }
        
        // Second leg (vertical)
        for (let i = 1; i < size - legLength + 1; i++) {
          positions.push({
            x: startX,
            y: startY + (i * spacing)
          });
        }
        break;
        
      case 'square':
        // Create a square or rectangle pattern
        const sideLength = Math.ceil(Math.sqrt(size));
        let count = 0;
        
        for (let y = 0; y < sideLength && count < size; y++) {
          for (let x = 0; x < sideLength && count < size; x++) {
            positions.push({
              x: startX + (x * spacing),
              y: startY + (y * spacing)
            });
            count++;
          }
        }
        break;
    }
    
    return positions;
  }
  
  /**
   * Check if a position is valid for an obstacle group
   * @param {number} x - The x coordinate of the group's starting position
   * @param {number} y - The y coordinate of the group's starting position
   * @param {number} groupSize - The number of obstacles in the group
   * @returns {boolean} Whether the position is valid
   */
  isValidGroupPosition(x, y, groupSize) {
    // Check minimum distance from respawn positions
    for (const respawnPos of config.RESPAWN_POSITIONS) {
      const dx = x - respawnPos.x;
      const dy = y - respawnPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Group needs more clearance from respawn points
      if (distance < config.OBSTACLE_MIN_DISTANCE * 1.5) {
        return false;
      }
    }
    
    // Check group position against existing obstacles and outlines
    // We'll need more space for a group
    const groupRadius = config.OBSTACLE_SIZE * Math.sqrt(groupSize) * 1.5;
    
    // Check against existing obstacles
    for (const obstacleId in this.obstacles) {
      const obstacle = this.obstacles[obstacleId];
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < groupRadius) {
        return false;
      }
    }
    
    // Check against outlines too
    for (const outlineId in this.outlines) {
      const outline = this.outlines[outlineId];
      const dx = x - outline.x;
      const dy = y - outline.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < groupRadius) {
        return false;
      }
    }
    
    // Check if the group fits within world bounds
    const spacing = config.OBSTACLE_SIZE * 1.2;
    const estimatedGroupWidth = spacing * Math.min(groupSize, 3); // Assume max 3 in a row
    const estimatedGroupHeight = spacing * Math.ceil(groupSize / 3);
    
    if (x - config.OBSTACLE_SIZE < 0 || 
        x + estimatedGroupWidth > config.WORLD_WIDTH ||
        y - config.OBSTACLE_SIZE < config.UI_HEIGHT ||
        y + estimatedGroupHeight > config.WORLD_HEIGHT) {
      return false;
    }
    
    return true;
  }

  /**
   * Create a new obstacle at a specific position
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate 
   * @returns {Object} The created obstacle
   */
  createObstacleAt(x, y) {
    const id = `obstacle_${this.nextId++}`;
    
    // Create the obstacle
    const obstacle = {
      id: id,
      x: x,
      y: y,
      size: config.OBSTACLE_SIZE,
      health: config.OBSTACLE_MAX_HEALTH
    };

    // Check if creating this obstacle would exceed the max total count
    // (including obstacles scheduled for respawn)
    if (this.totalObstacleCount >= config.MAX_OBSTACLES) {
      // Remove the oldest obstacle
      const oldestId = this.obstacleIds.shift();
      
      // Broadcast destruction event for the oldest obstacle
      this.io.emit('obstacleDestroyed', {
        obstacleId: oldestId,
        playerId: null, // Not destroyed by any player
        createOutline: false // Don't create outline for auto-removed obstacles
      });
      
      // Remove it from the map
      delete this.obstacles[oldestId];
      
      // Decrease the total count since we're removing one permanently
      this.totalObstacleCount--;
      
      console.log(`Removed oldest obstacle ${oldestId} to make room for new one`);
    }

    // Add to obstacles map and tracking array
    this.obstacles[id] = obstacle;
    this.obstacleIds.push(id);
    
    // Increment total obstacle count
    this.totalObstacleCount++;
    
    return obstacle;
  }
  
  /**
   * Respawn a previously destroyed obstacle
   * @param {Object} obstacleInfo - Information about the obstacle to respawn
   * @returns {Object|null} The respawned obstacle or null if respawn failed
   */
  respawnObstacle(obstacleInfo) {
    // Make sure we don't exceed the maximum number of active obstacles
    if (this.obstacleIds.length >= config.MAX_OBSTACLES) {
      // Put the obstacle back in the queue with a short delay
      obstacleInfo.respawnTime = Date.now() + 5000; // Try again in 5 seconds
      this.destroyedObstacles.push(obstacleInfo);
      return null;
    }
    
    // Always respawn at exact same position regardless of other obstacles
    
    // First, remove the outline to make room for the new obstacle
    const outlineId = `outline_${obstacleInfo.originalId}`;
    if (this.outlines[outlineId]) {
      delete this.outlines[outlineId];
      // Notify clients to remove the outline
      this.io.emit('outlineRemoved', outlineId);
    }
    
    // Create a new obstacle with a new ID
    const id = `obstacle_${this.nextId++}`;
    
    // Create the obstacle at the EXACT original position with precise coordinates
    const obstacle = {
      id: id,
      x: obstacleInfo.x,
      y: obstacleInfo.y,
      size: config.OBSTACLE_SIZE,
      health: config.OBSTACLE_MAX_HEALTH,
      isRespawned: true,
      originalPosition: true, // Flag to indicate it respawned at its original position
      respawnedFrom: obstacleInfo.originalId // Track which obstacle it was respawned from
    };
    
    // Log the respawn with precise coordinates
    console.log(`Respawning obstacle at exact position (${obstacle.x}, ${obstacle.y}) from original (${obstacleInfo.originalId})`);
    
    // Add to obstacles map and tracking array
    this.obstacles[id] = obstacle;
    this.obstacleIds.push(id);
    
    return obstacle;
  }

  /**
   * Create a new obstacle at a random position (legacy method)
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

    return this.createObstacleAt(x, y);
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

    // Also check for overlap with existing outlines
    for (const outlineId in this.outlines) {
      const outline = this.outlines[outlineId];
      const dx = x - outline.x;
      const dy = y - outline.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Minimum distance between obstacles and outlines
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
      // Create an outline before removing the obstacle
      const outline = {
        id: `outline_${obstacleId}`,
        x: obstacle.x,
        y: obstacle.y,
        size: obstacle.size,
        isOutline: true
      };
      
      // Add to outlines map
      this.outlines[outline.id] = outline;
      
      // Schedule the obstacle for respawn after the configured time
      // Store all original properties precisely to ensure exact respawn
      const respawnInfo = {
        originalId: obstacleId,
        x: obstacle.x,
        y: obstacle.y,
        size: obstacle.size,
        respawnTime: Date.now() + config.OBSTACLE_RESPAWN_TIME,
        exactPosition: true // Flag to ensure exact positioning during respawn
      };
      
      // Add to the respawn queue (sorted by respawn time)
      this.destroyedObstacles.push(respawnInfo);
      this.destroyedObstacles.sort((a, b) => a.respawnTime - b.respawnTime);
      
      // Broadcast destruction event with outline creation
      this.io.emit('obstacleDestroyed', {
        obstacleId: obstacleId,
        playerId: playerId,
        createOutline: true,
        outlineId: outline.id,
        x: outline.x,
        y: outline.y,
        size: outline.size,
        respawnIn: config.OBSTACLE_RESPAWN_TIME // Inform clients when it will respawn
      });

      // Remove from obstacles map
      delete this.obstacles[obstacleId];
      
      // Remove from the tracking array but keep in total count since it will respawn
      const index = this.obstacleIds.indexOf(obstacleId);
      if (index !== -1) {
        this.obstacleIds.splice(index, 1);
        console.log(`Removed obstacle ${obstacleId} (destroyed by player), will respawn in ${config.OBSTACLE_RESPAWN_TIME/1000}s, active count: ${this.obstacleIds.length}/${this.totalObstacleCount}`);
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
    // Check collision with active obstacles
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
    
    // Note: Outlines don't cause collisions
    
    return false;
  }

  /**
   * Get all obstacles and outlines for serialization
   * @returns {Object} Object containing arrays of obstacles and outlines
   */
  getSerializedObstacles() {
    return {
      obstacles: Object.values(this.obstacles),
      outlines: Object.values(this.outlines)
    };
  }
}

module.exports = ObstacleManager;