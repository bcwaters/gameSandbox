/**
 * Player management module
 */

const config = require('./config');

class PlayerManager {
  constructor(io) {
    this.players = {};
    this.io = io;
  }

  /**
   * Create a new player
   * @param {string} socketId - The socket ID of the player
   * @returns {Object} The player object
   */
  createPlayer(socketId) {
    this.players[socketId] = {
      id: socketId,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      direction: 'down',
      moving: false,
      health: config.MAX_HEALTH,
      ammo: config.MAX_AMMO,
      lastHitTime: 0,
      name: "Player" + Math.floor(Math.random() * 1000),
      inputs: {
        left: false,
        right: false,
        up: false,
        down: false
      },
      // Physics properties
      collisionVelocityX: 0,
      collisionVelocityY: 0,
      collisionFrames: 0
    };
    
    return this.players[socketId];
  }

  /**
   * Remove a player
   * @param {string} socketId - The socket ID of the player to remove
   */
  removePlayer(socketId) {
    delete this.players[socketId];
    this.io.emit('playerDisconnected', socketId);
  }

  /**
   * Update player inputs
   * @param {string} socketId - The socket ID of the player
   * @param {Object} inputData - The input data
   */
  updatePlayerInput(socketId, inputData) {
    if (this.players[socketId]) {
      this.players[socketId].inputs = inputData;
    }
  }

  /**
   * Update player name
   * @param {string} socketId - The socket ID of the player
   * @param {string} name - The new name
   */
  setPlayerName(socketId, name) {
    if (this.players[socketId]) {
      this.players[socketId].name = name.substring(0, 12); // Limit name length
      
      this.io.emit('playerNameUpdate', {
        id: socketId,
        name: this.players[socketId].name
      });
    }
  }

  /**
   * Mark player as defeated
   * @param {string} socketId - The socket ID of the player
   */
  defeatPlayer(socketId) {
    if (this.players[socketId]) {
      this.players[socketId].defeated = true;
      this.io.emit('playerDefeated', { playerId: socketId });
    }
  }

  /**
   * Respawn a player
   * @param {string} socketId - The socket ID of the player
   */
  respawnPlayer(socketId) {
    if (this.players[socketId]) {
      const player = this.players[socketId];
      
      // Get a random respawn position
      const respawnPos = config.RESPAWN_POSITIONS[
        Math.floor(Math.random() * config.RESPAWN_POSITIONS.length)
      ];
      
      // Reset player position and stats
      player.x = respawnPos.x;
      player.y = respawnPos.y;
      player.health = config.MAX_HEALTH;
      player.ammo = config.MAX_AMMO;
      player.defeated = false;
      
      // Reset velocity and motion
      player.collisionVelocityX = 0;
      player.collisionVelocityY = 0;
      player.collisionFrames = 0;
      
      // Broadcast respawn to all players
      this.io.emit('playerRespawned', {
        playerId: socketId,
        x: player.x,
        y: player.y,
        health: player.health,
        ammo: player.ammo
      });
    }
  }

  /**
   * Reset player's ammo to max
   * @param {string} socketId - The socket ID of the player
   */
  reloadAmmo(socketId) {
    if (this.players[socketId]) {
      this.players[socketId].ammo = config.MAX_AMMO;
    }
  }

  /**
   * Handle a player being hit
   * @param {string} hitPlayerId - The socket ID of the hit player
   * @param {string} attackerId - The socket ID of the attacker
   * @param {number} damage - Amount of damage to deal
   * @returns {boolean} Whether the hit was successful
   */
  hitPlayer(hitPlayerId, attackerId, damage) {
    const currentTime = Date.now();
    
    if (this.players[hitPlayerId]) {
      // Check hit cooldown
      if (currentTime - this.players[hitPlayerId].lastHitTime < config.HIT_COOLDOWN) {
        return false; // Ignore hit during cooldown period
      }
      
      // Update last hit time
      this.players[hitPlayerId].lastHitTime = currentTime;
      
      // Decrease health if player still has health
      if (this.players[hitPlayerId].health > 0) {
        this.players[hitPlayerId].health -= damage;
        
        // Ensure health doesn't go below zero
        if (this.players[hitPlayerId].health < 0) {
          this.players[hitPlayerId].health = 0;
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get serialized player data for network transmission
   * @returns {Array} Array of player data objects
   */
  getSerializedPlayers() {
    return Object.values(this.players).map(player => ({
      id: player.id,
      x: player.x,
      y: player.y,
      direction: player.direction,
      moving: player.moving,
      health: player.health,
      ammo: player.ammo,
      name: player.name
    }));
  }

  /**
   * Get all players
   * @returns {Object} The players object
   */
  getAllPlayers() {
    return this.players;
  }

  /**
   * Get a player by ID
   * @param {string} socketId - The socket ID of the player
   * @returns {Object|null} The player object or null if not found
   */
  getPlayer(socketId) {
    return this.players[socketId] || null;
  }
}

module.exports = PlayerManager;