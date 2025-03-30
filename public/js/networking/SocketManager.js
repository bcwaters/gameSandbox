/**
 * Socket Manager - Handles all socket.io communication with the server
 */
class SocketManager {
    constructor() {
        this.socket = io();
        this.callbacks = {
            currentPlayers: [],
            newPlayer: [],
            playerDisconnected: [],
            playerMoved: [],
            projectileFired: [],
            projectileDestroyed: [],
            playerHit: [],
            playerSwordHit: [],
            gameState: [],
            playerDefeated: [],
            playerRespawned: [],
            swordUsed: [],
            playerNameUpdate: []
        };
        
        this.playerId = null;
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up all socket event listeners
     */
    setupEventListeners() {
        // Store player ID when connected
        this.socket.on('connect', () => {
            this.playerId = this.socket.id;
            console.log('Connected to server with ID:', this.playerId);
        });
        
        // Handle incoming events from server
        this.socket.on('currentPlayers', (players) => {
            this.callbacks.currentPlayers.forEach(callback => callback(players));
        });
        
        this.socket.on('newPlayer', (playerInfo) => {
            this.callbacks.newPlayer.forEach(callback => callback(playerInfo));
        });
        
        this.socket.on('playerDisconnected', (playerId) => {
            this.callbacks.playerDisconnected.forEach(callback => callback(playerId));
        });
        
        this.socket.on('playerMoved', (playerInfo) => {
            this.callbacks.playerMoved.forEach(callback => callback(playerInfo));
        });
        
        this.socket.on('projectileFired', (projectileInfo) => {
            this.callbacks.projectileFired.forEach(callback => callback(projectileInfo));
        });
        
        this.socket.on('projectileDestroyed', (projectileId) => {
            this.callbacks.projectileDestroyed.forEach(callback => callback(projectileId));
        });
        
        this.socket.on('playerHit', (hitInfo) => {
            this.callbacks.playerHit.forEach(callback => callback(hitInfo));
        });
        
        this.socket.on('playerSwordHit', (hitInfo) => {
            this.callbacks.playerSwordHit.forEach(callback => callback(hitInfo));
        });
        
        this.socket.on('gameState', (gameState) => {
            this.callbacks.gameState.forEach(callback => callback(gameState));
        });
        
        this.socket.on('playerDefeated', (data) => {
            this.callbacks.playerDefeated.forEach(callback => callback(data));
        });
        
        this.socket.on('playerRespawned', (data) => {
            this.callbacks.playerRespawned.forEach(callback => callback(data));
        });
        
        this.socket.on('swordUsed', (swordData) => {
            this.callbacks.swordUsed.forEach(callback => callback(swordData));
        });
        
        this.socket.on('playerNameUpdate', (playerInfo) => {
            this.callbacks.playerNameUpdate.forEach(callback => callback(playerInfo));
        });
    }
    
    /**
     * Register a callback for a specific event
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    /**
     * Get the player ID
     * @returns {string} The player ID
     */
    getPlayerId() {
        return this.playerId;
    }
    
    /**
     * Send player input to the server
     * @param {Object} inputs - The input state
     */
    sendPlayerInput(inputs) {
        this.socket.emit('playerInput', inputs);
    }
    
    /**
     * Send projectile fire event to the server
     * @param {string} direction - The direction to fire
     */
    fireProjectile(direction) {
        this.socket.emit('fireProjectile', {
            direction: direction,
            playerId: this.playerId
        });
    }
    
    /**
     * Send reload ammo event to the server
     */
    reloadAmmo() {
        this.socket.emit('reloadAmmo');
    }
    
    /**
     * Send player hit notification to the server
     * @param {string} hitPlayerId - The ID of the hit player
     * @param {string} shooterId - The ID of the player who shot
     */
    playerHit(hitPlayerId, shooterId) {
        this.socket.emit('playerHit', {
            hitPlayerId: hitPlayerId,
            shooterId: shooterId || this.playerId
        });
    }
    
    /**
     * Send destroy projectile event to the server
     * @param {string} projectileId - The ID of the projectile to destroy
     */
    destroyProjectile(projectileId) {
        this.socket.emit('destroyProjectile', {
            projectileId: projectileId
        });
    }
    
    /**
     * Send sword used event to the server
     * @param {number} x - The x position
     * @param {number} y - The y position
     * @param {number} rotation - The rotation angle
     * @param {string} direction - The direction
     */
    swordUsed(x, y, rotation, direction) {
        this.socket.emit('swordUsed', {
            playerId: this.playerId,
            x: x,
            y: y,
            rotation: rotation,
            direction: direction
        });
    }
    
    /**
     * Send sword hit event to the server
     * @param {string} hitPlayerId - The ID of the hit player
     */
    swordHit(hitPlayerId) {
        this.socket.emit('swordHit', {
            hitPlayerId: hitPlayerId,
            attackerId: this.playerId
        });
    }
    
    /**
     * Send set player name event to the server
     * @param {string} name - The new player name
     */
    setPlayerName(name) {
        this.socket.emit('setPlayerName', {
            name: name
        });
    }
    
    /**
     * Send player defeated event to the server
     */
    playerDefeated() {
        this.socket.emit('playerDefeated', {
            playerId: this.playerId
        });
    }
    
    /**
     * Send respawn player event to the server
     */
    respawnPlayer() {
        this.socket.emit('respawnPlayer', {
            playerId: this.playerId
        });
    }
}