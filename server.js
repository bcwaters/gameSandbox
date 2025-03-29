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
    
    // Make sure we have the correct direction
    // Either use what was sent in projectileData or fall back to the player's current direction
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
    
    const projectile = {
        id: Date.now() + Math.random().toString(),
        x: player.x + offsetX,
        y: player.y + offsetY,
        velocityX: 0,
        velocityY: 0,
        playerId: socket.id
    };
    
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
        playerId: socket.id
    });
  });
  
  // When a player is hit
  socket.on('playerHit', function(hitInfo) {
    // Broadcast the hit event to all players
    io.emit('playerHit', hitInfo);
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
      // Skip the player who fired this projectile - IMPORTANT CHECK
      if (playerId === projectile.playerId) {
        continue;
      }
      
      const player = players[playerId];
      const dx = player.x - projectile.x;
      const dy = player.y - projectile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If collision detected
      if (distance < 20) { // Approximate collision radius
        hitPlayer = true;
        
        // Apply knockback from being hit
        const knockbackSpeed = 15;
        const knockbackAngle = Math.atan2(dy, dx);
        
        // Set a brief knockback velocity
        player.collisionVelocityX = Math.cos(knockbackAngle) * knockbackSpeed;
        player.collisionVelocityY = Math.sin(knockbackAngle) * knockbackSpeed;
        player.collisionFrames = 5;
        
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
      moving: player.moving
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

