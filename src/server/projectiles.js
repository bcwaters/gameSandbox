/**
 * Projectile management module
 */

const config = require('./config');

class ProjectileManager {
  constructor(io) {
    this.projectiles = [];
    this.io = io;
  }

  /**
   * Create a new projectile
   * @param {string} playerId - The socket ID of the player who fired
   * @param {Object} player - The player object
   * @param {string} direction - The direction to fire in
   * @returns {Object} The projectile object
   */
  createProjectile(playerId, player, direction) {
    // Skip if player is out of ammo or defeated
    if (player.ammo <= 0 || player.defeated) return null;
    
    // Decrease player's ammo
    player.ammo--;
    
    // Calculate offset based on direction to prevent self-collision
    let offsetX = 0;
    let offsetY = 0;
    const offsetDistance = 40; // Increased offset to better prevent self-collisions
    
    // Set position offsets based on direction
    if (direction === 'up') {
      offsetY = -offsetDistance;
    } else if (direction === 'down') {
      offsetY = offsetDistance;
    } else if (direction === 'left') {
      offsetX = -offsetDistance;
    } else if (direction === 'right') {
      offsetX = offsetDistance;
    } else if (direction === 'up-left') {
      offsetX = -offsetDistance * 0.7;
      offsetY = -offsetDistance * 0.7;
    } else if (direction === 'up-right') {
      offsetX = offsetDistance * 0.7;
      offsetY = -offsetDistance * 0.7;
    } else if (direction === 'down-left') {
      offsetX = -offsetDistance * 0.7;
      offsetY = offsetDistance * 0.7;
    } else if (direction === 'down-right') {
      offsetX = offsetDistance * 0.7;
      offsetY = offsetDistance * 0.7;
    }
    
    // Create a unique projectile ID
    const uniqueId = `${playerId}_${Date.now()}_${Math.random().toString().slice(2, 8)}`;
    
    const projectile = {
      id: uniqueId,
      x: player.x + offsetX,
      y: player.y + offsetY,
      velocityX: 0,
      velocityY: 0,
      playerId: playerId,
      ownerName: player.name || 'unknown'
    };
    
    // Set velocity based on direction
    const speed = config.PROJECTILE_SPEED;
    
    // Set velocities for each direction
    if (direction === 'up') {
      projectile.velocityY = -speed;
    } else if (direction === 'down') {
      projectile.velocityY = speed;
    } else if (direction === 'left') {
      projectile.velocityX = -speed;
    } else if (direction === 'right') {
      projectile.velocityX = speed;
    } else if (direction === 'up-left') {
      projectile.velocityX = -speed / Math.sqrt(2);
      projectile.velocityY = -speed / Math.sqrt(2);
    } else if (direction === 'up-right') {
      projectile.velocityX = speed / Math.sqrt(2);
      projectile.velocityY = -speed / Math.sqrt(2);
    } else if (direction === 'down-left') {
      projectile.velocityX = -speed / Math.sqrt(2);
      projectile.velocityY = speed / Math.sqrt(2);
    } else if (direction === 'down-right') {
      projectile.velocityX = speed / Math.sqrt(2);
      projectile.velocityY = speed / Math.sqrt(2);
    }
    
    // Add to projectiles array
    this.projectiles.push(projectile);
    
    // Emit to all clients
    this.io.emit('projectileFired', {
      id: projectile.id,
      x: projectile.x,
      y: projectile.y,
      velocityX: projectile.velocityX,
      velocityY: projectile.velocityY,
      playerId: playerId
    });
    
    return projectile;
  }

  /**
   * Remove a projectile
   * @param {string} projectileId - The ID of the projectile to remove
   */
  removeProjectile(projectileId) {
    const projectileIndex = this.projectiles.findIndex(p => p.id === projectileId);
    
    if (projectileIndex !== -1) {
      this.projectiles.splice(projectileIndex, 1);
      
      // Notify all clients to destroy this projectile
      this.io.emit('projectileDestroyed', projectileId);
    }
  }

  /**
   * Update all projectiles
   * @param {number} deltaTime - Time elapsed since last update in seconds
   * @param {Object} players - The players object
   * @param {function} onHit - Callback function when a projectile hits a player
   * @param {Object} obstacleManager - The obstacle manager for collision detection
   */
  update(deltaTime, players, onHit, obstacleManager) {
    // Apply a maximum delta time to prevent large position jumps during lag
    const maxDeltaTime = 0.05; // 50ms maximum
    const clampedDeltaTime = Math.min(deltaTime, maxDeltaTime);
    
    // Keep track of processed projectiles to prevent duplicate processing
    const processedProjectiles = new Set();
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      // Skip if already processed or invalid
      if (!projectile || !projectile.id || processedProjectiles.has(projectile.id)) {
        continue;
      }
      
      // Mark as processed
      processedProjectiles.add(projectile.id);
      
      // Store original position for obstacle collision check
      const originalX = projectile.x;
      const originalY = projectile.y;
      
      // Update position with clamped delta time to prevent large jumps
      projectile.x += projectile.velocityX * clampedDeltaTime;
      projectile.y += projectile.velocityY * clampedDeltaTime;
      
      // Check if out of bounds - add small buffer to ensure cleanup
      if (projectile.x < -10 || projectile.x > config.WORLD_WIDTH + 10 || 
          projectile.y < -10 || projectile.y > config.WORLD_HEIGHT + 10) {
        // Remove projectile
        this.projectiles.splice(i, 1);
        this.io.emit('projectileDestroyed', projectile.id);
        continue;
      }
      
      // Check for collision with obstacles
      if (obstacleManager) {
        // Projectile collision radius
        const projectileRadius = 8;
        
        // Check if new position collides with any obstacle
        if (obstacleManager.checkPointCollision(projectile.x, projectile.y, projectileRadius)) {
          // Remove the projectile
          this.projectiles.splice(i, 1);
          this.io.emit('projectileDestroyed', projectile.id);
          
          // Create a projectile impact effect at the collision point
          this.io.emit('projectileImpact', {
            x: originalX + (projectile.x - originalX) * 0.9, // Place impact just before the collision
            y: originalY + (projectile.y - originalY) * 0.9
          });
          
          continue; // Skip further checks for this projectile
        }
      }
      
      // Check for collision with players
      let hitPlayer = false;
      
      for (const playerId in players) {
        // Skip the player who fired this projectile
        if (playerId === projectile.playerId) continue;
        
        const player = players[playerId];
        
        // Skip if player is defeated or in hit cooldown
        if (player.defeated) continue;
        
        const currentTime = Date.now();
        if (currentTime - player.lastHitTime < config.HIT_COOLDOWN) continue;
        
        const dx = player.x - projectile.x;
        const dy = player.y - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If collision detected - use consistent collision radius (16 to match client-side)
        if (distance < 16) { // Collision radius matching client-side setting
          hitPlayer = true;
          
          // Apply knockback from being hit
          const knockbackSpeed = 15;
          const knockbackAngle = Math.atan2(dy, dx);
          
          // Set a brief knockback velocity
          player.collisionVelocityX = Math.cos(knockbackAngle) * knockbackSpeed;
          player.collisionVelocityY = Math.sin(knockbackAngle) * knockbackSpeed;
          player.collisionFrames = 5;
          
          // Call hit callback
          if (onHit) {
            onHit(playerId, projectile.playerId);
          }
          
          // Remove projectile
          this.projectiles.splice(i, 1);
          this.io.emit('projectileDestroyed', projectile.id);
          break;
        }
      }
      
      if (hitPlayer) continue;
    }
  }

  /**
   * Get serialized projectile data for network transmission
   * @returns {Array} Array of projectile data objects
   */
  getSerializedProjectiles() {
    return this.projectiles.map(projectile => ({
      id: projectile.id,
      x: projectile.x,
      y: projectile.y,
      velocityX: projectile.velocityX,
      velocityY: projectile.velocityY,
      playerId: projectile.playerId
    }));
  }
}

module.exports = ProjectileManager;