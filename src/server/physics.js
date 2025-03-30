/**
 * Physics and collision handling module
 */

const config = require('./config');

class PhysicsManager {
  constructor() {
    // Future: Add spatial partitioning data structures here
  }

  /**
   * Update player positions based on inputs
   * @param {Object} players - The players object
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  updatePlayerPositions(players, deltaTime) {
    Object.values(players).forEach(player => {
      // Apply inputs to update player position
      const inputs = player.inputs || { left: false, right: false, up: false, down: false };
      const speed = config.PLAYER_SPEED * deltaTime;
      let moving = false;
      
      // Apply movement based on inputs
      if (inputs.left) {
        player.x -= speed;
        player.direction = 'left';
        moving = true;
      } else if (inputs.right) {
        player.x += speed;
        player.direction = 'right';
        moving = true;
      }
      
      if (inputs.up) {
        player.y -= speed;
        player.direction = 'up';
        moving = true;
      } else if (inputs.down) {
        player.y += speed;
        player.direction = 'down';
        moving = true;
      }
      
      // Apply collision velocity if it exists
      if (player.collisionFrames > 0) {
        player.x += player.collisionVelocityX;
        player.y += player.collisionVelocityY;
        player.collisionFrames--;
        
        // If collision velocity made the player move, count that as moving
        if (Math.abs(player.collisionVelocityX) > 0.1 || Math.abs(player.collisionVelocityY) > 0.1) {
          moving = true;
        }
      }
      
      // Set moving state
      player.moving = moving;
      
      // World bounds checking
      player.x = Math.max(0, Math.min(player.x, config.WORLD_WIDTH));
      player.y = Math.max(0, Math.min(player.y, config.WORLD_HEIGHT));
    });
  }

  /**
   * Check and handle collisions between players
   * @param {Object} players - The players object
   */
  handlePlayerCollisions(players) {
    const playerArray = Object.values(players);
    
    // Optimize: future spatial partitioning would reduce this O(n²) check
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        const player1 = playerArray[i];
        const player2 = playerArray[j];
        
        // Calculate distance between players
        const dx = player2.x - player1.x;
        const dy = player2.y - player1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If collision detected
        if (distance < 30) { // Approx. combined radius of players
          // Calculate collision response
          const angle = Math.atan2(dy, dx);
          const overlap = 30 - distance;
          
          // Calculate momentum factors - players with active input have more "force"
          const p1Active = this.isPlayerMoving(player1);
          const p2Active = this.isPlayerMoving(player2);
          
          // Only apply collision if at least one player is actively moving
          if (p1Active || p2Active) {
            // Determine how to distribute the collision response
            let p1Factor = 0.5;
            let p2Factor = 0.5;
            
            // If one player is moving and the other isn't, the moving player should push more
            if (p1Active && !p2Active) {
              p1Factor = 0.2; // Moving player gets pushed less
              p2Factor = 0.8; // Stationary player gets pushed more
            } else if (!p1Active && p2Active) {
              p1Factor = 0.8; // Stationary player gets pushed more
              p2Factor = 0.2; // Moving player gets pushed less
            }
            
            // Move players away from each other based on factors
            const moveX = Math.cos(angle) * overlap;
            const moveY = Math.sin(angle) * overlap;
            
            player1.x -= moveX * p1Factor;
            player1.y -= moveY * p1Factor;
            player2.x += moveX * p2Factor;
            player2.y += moveY * p2Factor;
            
            // Add a slight "bounce" velocity - players slightly bounce away from collisions
            if (p1Active) {
              player1.collisionVelocityX = -Math.cos(angle) * 2;
              player1.collisionVelocityY = -Math.sin(angle) * 2;
              player1.collisionFrames = 3;
            }
            
            if (p2Active) {
              player2.collisionVelocityX = Math.cos(angle) * 2;
              player2.collisionVelocityY = Math.sin(angle) * 2;
              player2.collisionFrames = 3;
            }
          } else {
            // If neither player is moving, just separate them without velocity
            const moveX = Math.cos(angle) * overlap * 0.5;
            const moveY = Math.sin(angle) * overlap * 0.5;
            
            player1.x -= moveX;
            player1.y -= moveY;
            player2.x += moveX;
            player2.y += moveY;
          }
          
          // Keep within world bounds
          player1.x = Math.max(0, Math.min(player1.x, config.WORLD_WIDTH));
          player1.y = Math.max(0, Math.min(player1.y, config.WORLD_HEIGHT));
          player2.x = Math.max(0, Math.min(player2.x, config.WORLD_WIDTH));
          player2.y = Math.max(0, Math.min(player2.y, config.WORLD_HEIGHT));
        }
      }
    }
  }

  /**
   * Check if a player is actively moving based on inputs
   * @param {Object} player - The player object
   * @returns {boolean} Whether the player is moving
   */
  isPlayerMoving(player) {
    const inputs = player.inputs || {};
    return inputs.left || inputs.right || inputs.up || inputs.down;
  }
}

module.exports = PhysicsManager;