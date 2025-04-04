/**
 * Game configuration and constants
 */

const GameConfig = {
  // Game physics settings
  PLAYER_SPEED: 200, // pixels per second
  TICK_RATE: 1000 / 60, // 60 FPS
  
  // Player settings
  MAX_HEALTH: 5,
  MAX_AMMO: 10,
  HIT_COOLDOWN: 1000, // 1 second cooldown between hits
  
  // Weapon settings
  PROJECTILE_SPEED: 400,
  PROJECTILE_DAMAGE: 1,
  SWORD_DAMAGE: 3,
  SWORD_COOLDOWN: 1000,
  
  // World settings
  WORLD_WIDTH: 1600,
  WORLD_HEIGHT: 1600,
  UI_HEIGHT: 50, // Height of the UI navbar
  
  // Respawn positions distributed across the larger map (adjusted for UI height)
  RESPAWN_POSITIONS: [
    { x: 150, y: 150 },     // Top left
    { x: 800, y: 150 },     // Top middle
    { x: 1450, y: 150 },    // Top right
    { x: 150, y: 800 },     // Middle left
    { x: 800, y: 800 },     // Center
    { x: 1450, y: 800 },    // Middle right
    { x: 150, y: 1450 },    // Bottom left
    { x: 800, y: 1450 },    // Bottom middle
    { x: 1450, y: 1450 }    // Bottom right
  ],
  
  // Obstacle settings
  OBSTACLE_COUNT: 20,           // Initial number of obstacles to place (increased for larger map)
  MAX_OBSTACLES: 60,            // Maximum number of obstacles allowed (increased for larger map)
  OBSTACLE_SIZE: 30,            // Size of obstacles in pixels
  OBSTACLE_MAX_HEALTH: 2,       // Number of sword hits to destroy
  OBSTACLE_MIN_DISTANCE: 100,   // Minimum distance between obstacles and respawn points
  OBSTACLE_RESPAWN_TIME: 20000, // Time in ms before a destroyed obstacle respawns (20 seconds)
  
  // Coin settings
  COIN_SIZE: 15,                // Size of coins in pixels
  COIN_LIFETIME: 15000,         // How long coins last before disappearing (15 seconds)
  COIN_VALUE: 1,                // Points gained per regular coin
  PLAYER_DROP_COIN_VALUE: 5     // Points gained per player-dropped coin
};

module.exports = GameConfig;