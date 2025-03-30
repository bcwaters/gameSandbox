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
  SWORD_DAMAGE: 4,
  SWORD_COOLDOWN: 1000,
  
  // World settings
  WORLD_WIDTH: 800,
  WORLD_HEIGHT: 600,
  
  // Respawn positions
  RESPAWN_POSITIONS: [
    { x: 100, y: 100 },
    { x: 700, y: 100 },
    { x: 100, y: 500 },
    { x: 700, y: 500 },
    { x: 400, y: 300 }
  ]
};

module.exports = GameConfig;