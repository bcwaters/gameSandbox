/**
 * Coin management module
 */

const config = require('./config');

class CoinManager {
  constructor(io) {
    this.io = io;
    this.coins = {};
    this.nextId = 0;
    
    // Log that the CoinManager has been initialized
    console.log('CoinManager initialized');
  }

  /**
   * Create a new coin at the specified position
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Object} The created coin
   */
  createCoin(x, y) {
    try {
      // Ensure valid coordinates
      if (isNaN(x) || isNaN(y)) {
        console.error('Invalid coordinates for coin creation:', x, y);
        return null;
      }
      
      const id = `coin_${this.nextId++}`;
      
      // Create the coin object
      const coin = {
        id: id,
        x: x,
        y: y,
        size: config.COIN_SIZE,
        value: config.COIN_VALUE,
        createdAt: Date.now()
      };

      // Add to coins map
      this.coins[id] = coin;
      
      // Set up auto-removal timer
      setTimeout(() => {
        this.removeCoin(id, true);
      }, config.COIN_LIFETIME);

      // Broadcast the new coin to all clients
      this.io.emit('coinSpawned', coin);
      
      console.log(`Coin created: ${id} at (${x}, ${y})`);
      return coin;
    } catch (error) {
      console.error('Error creating coin:', error);
      return null;
    }
  }

  /**
   * Drop a coin at the position of a defeated player
   * @param {Object} player - The defeated player object
   * @returns {Object} The created coin
   */
  dropCoinAtPlayerPosition(player) {
    if (!player) {
      console.error('Cannot drop coin: player is null or undefined');
      return null;
    }
    
    if (isNaN(player.x) || isNaN(player.y)) {
      console.error('Cannot drop coin: player position is invalid:', player.x, player.y);
      return null;
    }
    
    console.log(`Dropping coin at player position: (${player.x}, ${player.y})`);
    
    // Add some slight random offset to make it more interesting
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    
    return this.createCoin(player.x + offsetX, player.y + offsetY);
  }

  /**
   * Remove a coin from the game
   * @param {string} coinId - The ID of the coin to remove
   * @param {boolean} expired - Whether the coin expired (rather than being collected)
   */
  removeCoin(coinId, expired = false) {
    // Only remove if the coin still exists
    if (this.coins[coinId]) {
      // Remove from coins map
      delete this.coins[coinId];
      
      // Broadcast removal to all clients
      this.io.emit('coinRemoved', {
        coinId: coinId,
        expired: expired
      });
      
      console.log(`Coin removed: ${coinId}, expired: ${expired}`);
    } else {
      console.log(`Tried to remove non-existent coin: ${coinId}`);
    }
  }

  /**
   * Collect a coin for a player
   * @param {string} coinId - The ID of the coin to collect
   * @param {string} playerId - The ID of the player collecting the coin
   * @returns {Object|null} The collected coin or null if it doesn't exist
   */
  collectCoin(coinId, playerId) {
    const coin = this.coins[coinId];
    if (!coin) {
      console.log(`Tried to collect non-existent coin: ${coinId} by player ${playerId}`);
      return null;
    }
    
    console.log(`Coin ${coinId} being collected by player ${playerId}`);
    
    // Store coin value to return after removal
    const coinValue = coin.value;
    
    // Remove the coin
    delete this.coins[coinId];
    
    // Broadcast coin collection to all clients
    this.io.emit('coinCollected', {
      coinId: coinId,
      playerId: playerId,
      value: coinValue
    });
    
    console.log(`Coin ${coinId} collected by player ${playerId} with value ${coinValue}`);
    
    // Return the coin with its value for score updating
    return { id: coinId, value: coinValue };
  }

  /**
   * Get all coins for serialization - used when sending initial state to clients
   * @returns {Array} Array of coin objects
   */
  getSerializedCoins() {
    // Important: Clean up the formatting of coins before sending them to avoid format issues
    const coins = Object.values(this.coins).map(coin => ({
      id: coin.id,
      x: Number(coin.x),
      y: Number(coin.y),
      size: Number(coin.size || 15),
      value: Number(coin.value || 1),
      createdAt: coin.createdAt
    }));
    
    // Send a fixed number of coins per update to avoid overwhelming the client
    return coins.slice(0, 20);
  }
}

module.exports = CoinManager;