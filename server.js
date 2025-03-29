// Server-side code (server.js)
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Game constants
const PLAYER_SPEED = 200; // pixels per second
const TICK_RATE = 1000 / 60; // 60 FPS
const MAX_HEALTH = 5;
const MAX_AMMO = 10;
const HIT_COOLDOWN = 1000; // 1 second cooldown between hits
const RESPAWN_POSITIONS = [
  { x: 100, y: 100 },
  { x: 700, y: 100 },
  { x: 100, y: 500 },
  { x: 700, y: 500 },
  { x: 400, y: 300 }
];

// Store player data
const players = {};
const projectiles = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Create a new player and add it to players object
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    direction: 'down',
    moving: false,
    health: MAX_HEALTH, // Initialize with full health
    ammo: MAX_AMMO,     // Initialize with full ammo
    lastHitTime: 0,     // Track last time player was hit
    name: "Player" + Math.floor(Math.random() * 1000), // Random default name
    inputs: {
      left: false,
      right: false,
      up: false,
      down: false
    },
    // Add collision physics properties
    collisionVelocityX: 0,
    collisionVelocityY: 0,
    collisionFrames: 0
  };
  
  // Send the players object to the new player
  socket.emit('currentPlayers', players);
  
  // Update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  // When a player disconnects, remove them from the players object
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    
    // Emit a message to all players to remove this player
    io.emit('playerDisconnected', socket.id);
  });
  
  // When a player moves, update the player data (legacy method - keeping for compatibility)
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].direction = movementData.direction;
      players[socket.id].moving = movementData.moving;
      
      // Emit a message to all players about the player that moved
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Handle player input for server-side physics
  socket.on('playerInput', (inputData) => {
  
    
    if (players[socket.id]) {
      // Store the inputs for processing in the game loop
      players[socket.id].inputs = inputData;
    }
  });
  
  // When a player fires a projectile
  socket.on('fireProjectile', (projectileData) => {
    if (!players[socket.id]) return;
    
    const player = players[socket.id];
    
    // Make sure player has ammo
    if (player.ammo <= 0) return;
    
    // Decrease player's ammo
    player.ammo--;
    
    // Make sure we have the correct direction
    const direction = projectileData.direction || player.direction;
    
    // Calculate offset based on direction to prevent self-collision
    let offsetX = 0;
    let offsetY = 0;
    const offsetDistance = 30;
    
    // Set position offsets based on direction - handle all eight directions explicitly
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
    
    // Create a unique projectile ID that includes the player ID to make tracking easier
    const uniqueId = `${socket.id}_${Date.now()}_${Math.random().toString().slice(2, 8)}`;
    
    const projectile = {
        id: uniqueId,
        x: player.x + offsetX,
        y: player.y + offsetY,
        velocityX: 0,
        velocityY: 0,
        playerId: socket.id, // Always use the socket ID of the player who fired
        ownerName: player.name || 'unknown'
    };
    
    console.log(`Player ${socket.id} fired projectile ${projectile.id}`);
    
    // Set velocity based on direction - handle all directions explicitly
    const speed = 400;
    
    // Set velocities for each of the eight possible directions explicitly
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
    projectiles.push(projectile);
    
    // Emit to all clients
    io.emit('projectileFired', {
        id: projectile.id,
        x: projectile.x,
        y: projectile.y,
        velocityX: projectile.velocityX,
        velocityY: projectile.velocityY,
        playerId: socket.id // Explicitly set the owner ID
    });
  });
  
  // When a player reloads
  socket.on('reloadAmmo', () => {
    if (players[socket.id]) {
      players[socket.id].ammo = MAX_AMMO;
    }
  });
  
  // When a player is hit
  socket.on('playerHit', function(hitInfo) {
    // Update player health on the server
    const hitPlayerId = hitInfo.hitPlayerId;
    const currentTime = Date.now();
    
    if (players[hitPlayerId]) {
      // Check hit cooldown
      if (currentTime - players[hitPlayerId].lastHitTime < HIT_COOLDOWN) {
        // Ignore hit during cooldown period
        return;
      }
      
      // Update last hit time
      players[hitPlayerId].lastHitTime = currentTime;
      
      // Decrease health if player still has health
      if (players[hitPlayerId].health > 0) {
        // Projectiles only do 1 damage
        players[hitPlayerId].health -= 1;
        
        // Ensure health doesn't go below zero
        if (players[hitPlayerId].health < 0) {
          players[hitPlayerId].health = 0;
        }
        
        // Broadcast the hit event to all players
        io.emit('playerHit', hitInfo);
      }
    }
  });
  
  // Handle player defeat
  socket.on('playerDefeated', function(data) {
    if (players[data.playerId]) {
      // Mark player as defeated
      players[data.playerId].defeated = true;
      
      // Broadcast defeat to other players
      io.emit('playerDefeated', { playerId: data.playerId });
    }
  });
  
  // Handle player respawn
  socket.on('respawnPlayer', function(data) {
    if (players[data.playerId]) {
      const player = players[data.playerId];
      
      // Get a random respawn position
      const respawnPos = RESPAWN_POSITIONS[Math.floor(Math.random() * RESPAWN_POSITIONS.length)];
      
      // Reset player position and stats
      player.x = respawnPos.x;
      player.y = respawnPos.y;
      player.health = MAX_HEALTH;
      player.ammo = MAX_AMMO;
      player.defeated = false;
      
      // Reset velocity and motion
      player.collisionVelocityX = 0;
      player.collisionVelocityY = 0;
      player.collisionFrames = 0;
      
      // Broadcast respawn to all players
      io.emit('playerRespawned', {
        playerId: data.playerId,
        x: player.x,
        y: player.y,
        health: player.health,
        ammo: player.ammo
      });
      
      console.log(`Player ${data.playerId} has respawned at position (${player.x}, ${player.y})`);
    }
  });
  
  // Handle projectile destruction
  socket.on('destroyProjectile', function(data) {
    const projectileId = data.projectileId;
    
    // Find and remove the projectile
    const projectileIndex = projectiles.findIndex(p => p.id === projectileId);
    if (projectileIndex !== -1) {
      projectiles.splice(projectileIndex, 1);
      
      // Notify all clients to destroy this projectile
      io.emit('projectileDestroyed', projectileId);
    }
  });
  
  // Handle sword use
  socket.on('swordUsed', function(swordData) {
    if (players[socket.id]) {
      // Broadcast the sword use to all other players
      io.emit('swordUsed', {
        playerId: socket.id,
        x: swordData.x,
        y: swordData.y,
        rotation: swordData.rotation,
        direction: swordData.direction
      });
      
      console.log(`Player ${socket.id} used sword in direction: ${swordData.direction}`);
    }
  });
  
  // Handle sword hit detection
  socket.on('swordHit', function(hitInfo) {
    const hitPlayerId = hitInfo.hitPlayerId;
    const attackerId = hitInfo.attackerId;
    const currentTime = Date.now();
    
    // Verify both players exist
    if (players[hitPlayerId] && players[attackerId]) {
      // Check hit cooldown
      if (currentTime - players[hitPlayerId].lastHitTime < HIT_COOLDOWN) {
        // Ignore hit during cooldown period
        return;
      }
      
      // Update last hit time
      players[hitPlayerId].lastHitTime = currentTime;
      
      // Decrease health if player still has health
      if (players[hitPlayerId].health > 0) {
        players[hitPlayerId].health -= 4;
        
        // Ensure health doesn't go below zero
        if (players[hitPlayerId].health < 0) {
          players[hitPlayerId].health = 0;
        }
        
        // Check if player is now defeated
        if (players[hitPlayerId].health <= 0) {
          console.log(`Player ${hitPlayerId} has been defeated by sword from ${attackerId}!`);
        }
        
        // Broadcast the sword hit event to all players
        io.emit('playerSwordHit', {
          hitPlayerId: hitPlayerId,
          attackerId: attackerId
        });
        
        console.log(`Player ${hitPlayerId} was hit by ${attackerId}'s sword. Health now: ${players[hitPlayerId].health}`);
      }
    }
  });
  
  // Handle setting player name
  socket.on('setPlayerName', function(data) {
    if (players[socket.id] && data.name) {
      // Update player name
      players[socket.id].name = data.name.substring(0, 12); // Limit name length
      
      // Broadcast the updated name to all players
      io.emit('playerNameUpdate', {
        id: socket.id,
        name: players[socket.id].name
      });
      
      console.log(`Player ${socket.id} set name to: ${players[socket.id].name}`);
    }
  });
});

// Update game state - physics and game logic
function updateGame() {
  // Process player movement
  Object.values(players).forEach(player => {
    // Apply inputs to update player position
    const inputs = player.inputs || { left: false, right: false, up: false, down: false };
    const speed = PLAYER_SPEED * (TICK_RATE / 1000); // Convert to movement per frame
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
    player.x = Math.max(0, Math.min(player.x, 800));
    player.y = Math.max(0, Math.min(player.y, 600));
  });
  
  // Handle player-player collisions
  handlePlayerCollisions();
  
  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    
    // Update position
    projectile.x += projectile.velocityX * (TICK_RATE / 1000);
    projectile.y += projectile.velocityY * (TICK_RATE / 1000);
    
    // Check if out of bounds
    if (projectile.x < 0 || projectile.x > 800 || 
        projectile.y < 0 || projectile.y > 600) {
      // Remove projectile
      projectiles.splice(i, 1);
      io.emit('projectileDestroyed', projectile.id);
      continue;
    }
    
    // Check for collision with players
    let hitPlayer = false;
    for (const playerId in players) {
      // Skip the player who fired this projectile - absolutely essential
      if (playerId === projectile.playerId) {
        // Log skip of self collision
        console.log(`Skipping collision check between projectile ${projectile.id} and its owner ${playerId}`);
        continue;
      }
      
      const player = players[playerId];
      
      // Skip if player is in hit cooldown
      const currentTime = Date.now();
      if (currentTime - player.lastHitTime < HIT_COOLDOWN) {
        console.log(`Skipping hit on ${playerId} due to cooldown`);
        continue;
      }
      
      const dx = player.x - projectile.x;
      const dy = player.y - projectile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If collision detected
      if (distance < 20) { // Approximate collision radius
        // Double-check that this isn't a self-hit
        if (playerId === projectile.playerId) {
          console.log(`Prevented self-hit between player ${playerId} and projectile ${projectile.id}`);
          continue;
        }
        
        console.log(`Hit detected! Player ${playerId} hit by projectile ${projectile.id} from player ${projectile.playerId}`);
        hitPlayer = true;
        
        // Apply knockback from being hit
        const knockbackSpeed = 15;
        const knockbackAngle = Math.atan2(dy, dx);
        
        // Set a brief knockback velocity
        player.collisionVelocityX = Math.cos(knockbackAngle) * knockbackSpeed;
        player.collisionVelocityY = Math.sin(knockbackAngle) * knockbackSpeed;
        player.collisionFrames = 5;
        
        // Update player's hit time
        player.lastHitTime = currentTime;
        
        // Decrease player health
        if (player.health > 0) {
          player.health -= 1;
          
          // Ensure health doesn't go below zero
          if (player.health < 0) {
            player.health = 0;
          }
        }
        
        // Emit hit event - only for valid hits (not self-hits)
        io.emit('playerHit', {
          hitPlayerId: playerId,
          shooterId: projectile.playerId
        });
        
        // Remove projectile
        projectiles.splice(i, 1);
        io.emit('projectileDestroyed', projectile.id);
        break;
      }
    }
    
    if (hitPlayer) continue;
  
  }
  
  // Send game state to all clients
  io.emit('gameState', {
    players: Object.values(players).map(player => ({
      id: player.id,
      x: player.x,
      y: player.y,
      direction: player.direction,
      moving: player.moving,
      health: player.health,  // Include health in state
      ammo: player.ammo,      // Include ammo in state
      name: player.name       // Include name in state
    })),
    projectiles: projectiles.map(projectile => ({
      id: projectile.id,
      x: projectile.x,
      y: projectile.y
    }))
  });
}

// Handle collisions between players
function handlePlayerCollisions() {
  const playerArray = Object.values(players);
  
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
        // Calculate collision response with more physical properties
        const angle = Math.atan2(dy, dx);
        const overlap = 30 - distance;
        
        // Calculate momentum factors - players with active input have more "force"
        const p1Active = isPlayerMoving(player1);
        const p2Active = isPlayerMoving(player2);
        
        // Only apply collision if at least one player is actively moving
        // This prevents unwanted collisions when players are stationary
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
          // This makes collisions feel more dynamic without creating sliding
          // Only apply bounce to actively moving players
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
          // This is a gentle separation for overlapping stationary players
          const moveX = Math.cos(angle) * overlap * 0.5;
          const moveY = Math.sin(angle) * overlap * 0.5;
          
          player1.x -= moveX;
          player1.y -= moveY;
          player2.x += moveX;
          player2.y += moveY;
        }
        
        // Keep within world bounds
        player1.x = Math.max(0, Math.min(player1.x, 800));
        player1.y = Math.max(0, Math.min(player1.y, 600));
        player2.x = Math.max(0, Math.min(player2.x, 800));
        player2.y = Math.max(0, Math.min(player2.y, 600));
      }
    }
  }
}

// Helper function to determine if a player is actively moving
function isPlayerMoving(player) {
  const inputs = player.inputs || {};
  return inputs.left || inputs.right || inputs.up || inputs.down;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the game loop
  setInterval(updateGame, TICK_RATE);
});

