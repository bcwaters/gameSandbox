/**
 * Socket Manager - Handles all socket.io communication with the server
 */
class SocketManager {
    constructor() {
        console.log('Initializing SocketManager...');
        
        try {
            console.log('Attempting to connect to server with socket.io');
            // Connect to the server using default URL (current host)
            this.socket = io({
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
            console.log('Socket.io connection object created successfully');
        } catch (error) {
            console.error('CRITICAL ERROR: Failed to create socket.io connection:', error);
            // Create a fallback socket object to prevent undefined errors
            this.socket = {
                on: () => console.error('Socket not available'),
                emit: () => console.error('Socket not available'),
                id: 'socket-error'
            };
            
            // Show error to user
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.background = 'rgba(255,0,0,0.8)';
            errorDiv.style.padding = '20px';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.color = 'white';
            errorDiv.style.zIndex = 9999;
            errorDiv.innerHTML = `<h2>Connection Failed</h2><p>Failed to connect to game server: ${error.message}</p>`;
            document.body.appendChild(errorDiv);
        }
        
        this.callbacks = {
            connect: [],
            disconnect: [],
            reconnect: [],
            reconnect_attempt: [],
            reconnect_error: [],
            connect_error: [],
            currentPlayers: [],
            newPlayer: [],
            playerDisconnected: [],
            playerMoved: [],
            projectileFired: [],
            projectileDestroyed: [],
            projectileImpact: [],
            playerHit: [],
            playerSwordHit: [],
            gameState: [],
            playerDefeated: [],
            playerRespawned: [],
            swordUsed: [],
            playerNameUpdate: [],
            playerScoreUpdate: [],
            currentObstacles: [],
            newObstacle: [],
            obstacleHit: [],
            obstacleDestroyed: [],
            currentCoins: [],
            coinSpawned: [],
            coinCollected: [],
            coinRemoved: [],
            circleCreated: [],
            circleRemoved: []
        };
        
        this.playerId = null;
        this.connected = false;
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up all socket event listeners
     */
    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            this.playerId = this.socket.id;
            this.connected = true;
            console.log('Connected to server with ID:', this.playerId);
            
            // Trigger callbacks
            this.callbacks.connect.forEach(callback => callback());
        });
        
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('Disconnected from server:', reason);
            
            // Trigger callbacks
            this.callbacks.disconnect.forEach(callback => callback(reason));
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            
            // Trigger callbacks
            this.callbacks.connect_error.forEach(callback => callback(error));
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Attempting to reconnect:', attemptNumber);
            
            // Trigger callbacks
            this.callbacks.reconnect_attempt.forEach(callback => callback(attemptNumber));
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after attempts:', attemptNumber);
            
            // Trigger callbacks
            this.callbacks.reconnect.forEach(callback => callback(attemptNumber));
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
            
            // Trigger callbacks
            this.callbacks.reconnect_error.forEach(callback => callback(error));
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
        
        this.socket.on('projectileImpact', (impactInfo) => {
            this.callbacks.projectileImpact.forEach(callback => callback(impactInfo));
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
        
        // Obstacle-specific events
        this.socket.on('currentObstacles', (obstacles) => {
            this.callbacks.currentObstacles.forEach(callback => callback(obstacles));
        });
        
        this.socket.on('newObstacle', (obstacleInfo) => {
            this.callbacks.newObstacle.forEach(callback => callback(obstacleInfo));
        });
        
        this.socket.on('obstacleHit', (hitInfo) => {
            this.callbacks.obstacleHit.forEach(callback => callback(hitInfo));
        });
        
        this.socket.on('obstacleDestroyed', (destroyInfo) => {
            this.callbacks.obstacleDestroyed.forEach(callback => callback(destroyInfo));
        });
        
        // Coin-specific events
        this.socket.on('currentCoins', (coins) => {
            this.callbacks.currentCoins.forEach(callback => callback(coins));
        });
        
        this.socket.on('coinSpawned', (coinInfo) => {
            this.callbacks.coinSpawned.forEach(callback => callback(coinInfo));
        });
        
        this.socket.on('coinCollected', (collectionInfo) => {
            this.callbacks.coinCollected.forEach(callback => callback(collectionInfo));
        });
        
        this.socket.on('coinRemoved', (removalInfo) => {
            this.callbacks.coinRemoved.forEach(callback => callback(removalInfo));
        });
        
        // Player score update
        this.socket.on('playerScoreUpdate', (scoreInfo) => {
            this.callbacks.playerScoreUpdate.forEach(callback => callback(scoreInfo));
        });
        
        // Circle events
        this.socket.on('circleCreated', (circleData) => {
            this.callbacks.circleCreated.forEach(callback => callback(circleData));
        });
        
        this.socket.on('circleRemoved', (circleId) => {
            this.callbacks.circleRemoved.forEach(callback => callback(circleId));
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
     * Send obstacle hit event to the server
     * @param {string} obstacleId - The ID of the hit obstacle
     */
    obstacleHit(obstacleId) {
        this.socket.emit('obstacleHit', {
            obstacleId: obstacleId,
            playerId: this.playerId
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
    
    /**
     * Send coin collection event to the server
     * @param {string} coinId - The ID of the collected coin
     */
    collectCoin(coinId) {
        this.socket.emit('collectCoin', {
            coinId: coinId,
            playerId: this.playerId
        });
    }
    
    /**
     * Send circle creation to server
     * @param {Object} circleData - Data for the circle
     */
    createCircle(circleData) {
        this.socket.emit('createCircle', circleData);
    }
    
    /**
     * Send circle removal to server
     * @param {string} circleId - ID of the circle to remove
     */
    removeCircle(circleId) {
        this.socket.emit('removeCircle', {
            circleId: circleId,
            playerId: this.playerId
        });
    }
}