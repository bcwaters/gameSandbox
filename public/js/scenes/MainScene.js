/**
 * MainScene - The main game scene
 */
// Define MainScene as a global class and ensure it's loaded before game.js
console.log('Defining MainScene class...');
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        
        this.player = null;
        this.otherPlayers = {};
        this.projectiles = {};
        this.obstacles = {};
        this.coins = {};
        this.lastDirection = 'down';
        this.isDefeated = false;
        this.lastSwordTime = 0;
        this.swordCooldown = 1000;
        this.playersHitBySword = {};
        this.obstaclesHitBySword = {};
        
        console.log('MainScene constructor completed');
    }
    
    preload() {
        console.log('MainScene preload started');
        try {
            // Load assets
            console.log('Loading game assets via AssetLoader');
            AssetLoader.preloadAssets(this);
            
            console.log('Loading sound effects');
            // Load sound effects
            this.load.audio('shoot', 'sounds/shoot.mp3');
            this.load.audio('hit', 'sounds/hit.mp3');
            this.load.audio('sword-slash', 'sounds/sword-slash.mp3');
            this.load.audio('coin-collect', 'sounds/coin.mp3');
            console.log('Sound effects loaded');
        } catch (error) {
            console.error('ERROR in MainScene preload:', error);
        }
        console.log('MainScene preload completed');
    }
    
    create() {
        console.log('MainScene create function started');
        try {
            // Initialize networking
            console.log('Creating SocketManager instance');
            this.socketManager = new SocketManager();
            console.log('SocketManager instance created');
            
            // Handle connection events
            console.log('Setting up socket connection event handlers');
            this.socketManager.on('connect', () => {
                console.log('MainScene: Connected to server');
                this.showConnectionStatus(true);
            });
            
            this.socketManager.on('disconnect', (reason) => {
                console.log('MainScene: Disconnected from server, reason:', reason);
                this.showConnectionStatus(false, reason);
            });
            
            this.socketManager.on('connect_error', (error) => {
                console.error('MainScene: Connection error', error);
                this.showConnectionStatus(false, 'Connection error');
            });
            console.log('Socket event handlers setup completed');
        
  
            // Create animations
            console.log('Creating animations via AnimationManager');
            AnimationManager.createAnimations(this);
            console.log('Animations created successfully');
            
            // Create physics groups
            console.log('Creating physics groups');
            this.otherPlayersGroup = this.physics.add.group();
            this.projectilesGroup = this.physics.add.group({
                classType: Phaser.Physics.Arcade.Sprite,
                maxSize: 20,
                runChildUpdate: true
            });
            this.obstaclesGroup = this.physics.add.group({
                immovable: true
            });
            
            // Re-enable coins
            this.coinsGroup = this.physics.add.group();
            console.log('Physics groups created');
            
            // Initialize sound effects
            console.log('Initializing sound effects');
            this.initSounds();
            console.log('Sound effects initialized');
            
            // Create UI
            console.log('Creating user interface');
            this.ui = new UserInterface(this);
            console.log('User interface created');
            
            // Setup keyboard input
            console.log('Setting up keyboard input');
            this.setupInput();
            console.log('Keyboard input setup completed');
            
            // Setup socket events
            console.log('Setting up socket event handlers');
            this.setupSocketEvents();
            console.log('Socket event handlers setup completed');
            
            // Set world bounds explicitly
            console.log('Setting world bounds');
            this.physics.world.setBounds(0, 0, 800, 600);
            
            // Add background to make sure rendering is working
            console.log('Creating background rectangle');
            const background = this.add.rectangle(
                400, // width/2
                300, // height/2
                800, // width
                600, // height
                0x222222
            );
            background.setDepth(-10);
            
            // Show a text to indicate the game has loaded
            console.log('Creating loading text');
            const loadingText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                'Game loaded! Waiting for players...',
                {
                    fontSize: '24px',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            );
            loadingText.setOrigin(0.5);
            loadingText.setDepth(100);
            
            // Fade out the text after 3 seconds
            this.tweens.add({
                targets: loadingText,
                alpha: 0,
                delay: 3000,
                duration: 1000,
                onComplete: () => loadingText.destroy()
            });
        } catch (error) {
            console.error('ERROR in MainScene create:', error);
            // Try to show error on screen
            try {
                const errorText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    'Error initializing game: ' + error.message,
                    {
                        fontSize: '16px',
                        fill: '#FF0000',
                        backgroundColor: '#000000',
                        padding: { x: 10, y: 10 }
                    }
                );
                errorText.setOrigin(0.5);
                errorText.setDepth(1000);
            } catch (e) {
                console.error('Failed to display error message:', e);
            }
        }
        
        console.log('MainScene create function completed');
    }
    
    initSounds() {
        try {
            this.shootSound = this.sound.add('shoot');
            this.hitSound = this.sound.add('hit');
            this.swordSound = this.sound.add('sword-slash');
            this.coinSound = this.sound.add('coin-collect');
            
            // Add event handlers for when sounds fail to load
            this.sound.once('loaderror', (soundKey, error) => {
                console.error('Error loading sound:', soundKey, error);
            });
            
            // Setup safe play method for each sound
            const sounds = ['shootSound', 'hitSound', 'swordSound', 'coinSound'];
            sounds.forEach(soundName => {
                const originalSound = this[soundName];
                if (originalSound) {
                    // Override the sound's play method with a safe version
                    const originalPlay = originalSound.play.bind(originalSound);
                    originalSound.play = (config) => {
                        try {
                            return originalPlay(config);
                        } catch (error) {
                            console.warn(`Error playing ${soundName}:`, error);
                            return null;
                        }
                    };
                }
            });
        } catch (error) {
            console.error('Error initializing sounds:', error);
            // Set to null to avoid errors when trying to play sounds
            this.shootSound = null;
            this.hitSound = null;
            this.swordSound = null;
            this.coinSound = null;
        }
    }
    
    setupInput() {
        // Setup cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add reload key
        this.reloadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.reloadKey.on('down', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Only reload if we're not at max ammo
            if (this.player && this.player.ammo < this.player.maxAmmo) {
                // Reset ammo to max
                this.player.setAmmo(this.player.maxAmmo);
                this.ui.updateAmmoCounter(this.player.ammo);
                
                // Send reload event to server
                this.socketManager.reloadAmmo();
            }
        });
        
        // Add sword key
        this.swordKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.swordKey.on('down', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Use the sword
            this.useSword();
        });
        
        // Add shooting key
        this.input.keyboard.on('keydown-SPACE', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Check if player exists and has ammo
            if (this.player && this.player.ammo > 0) {
                this.fireProjectile();
                this.player.setAmmo(this.player.ammo - 1);
                this.ui.updateAmmoCounter(this.player.ammo);
            }
        });
    }
    
    setupSocketEvents() {
        // When current players data is received
        this.socketManager.on('currentPlayers', (players) => {
            Object.keys(players).forEach((id) => {
                const playerInfo = players[id];
                
                if (id === this.socketManager.getPlayerId()) {
                    // Create our player
                    this.createPlayer(playerInfo);
                } else {
                    // Create other players
                    this.addOtherPlayer(playerInfo);
                }
            });
            
            // Setup collisions
            this.setupCollisions();
        });
        
        // When current obstacles data is received
        this.socketManager.on('currentObstacles', (obstacles) => {
            // Clear any existing obstacles
            Object.values(this.obstacles).forEach(obstacle => obstacle.destroy());
            this.obstacles = {};
            
            // Create all obstacles
            obstacles.forEach(obstacleInfo => {
                this.createObstacle(obstacleInfo);
            });
        });
        
        // When an obstacle is hit
        this.socketManager.on('obstacleHit', (hitInfo) => {
            const obstacle = this.obstacles[hitInfo.obstacleId];
            if (obstacle) {
                // Update health from server
                obstacle.updateFromServer(undefined, undefined, hitInfo.health);
                
                // Play hit sound if it's our hit
                if (hitInfo.playerId === this.socketManager.getPlayerId()) {
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.5 });
                    }
                }
            }
        });
        
        // When an obstacle is destroyed
        this.socketManager.on('obstacleDestroyed', (destroyInfo) => {
            const obstacle = this.obstacles[destroyInfo.obstacleId];
            if (obstacle) {
                // Create destruction effect
                obstacle.destroy();
                delete this.obstacles[destroyInfo.obstacleId];
                
                // Play hit sound if it's our hit
                if (destroyInfo.playerId === this.socketManager.getPlayerId()) {
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                }
            }
        });
        
        // When a projectile hits something
        this.socketManager.on('projectileImpact', (impactInfo) => {
            this.createHitImpact(impactInfo.x, impactInfo.y);
        });
        
        // When a new obstacle is spawned
        this.socketManager.on('newObstacle', (obstacleInfo) => {
            // Create the new obstacle
            this.createObstacle(obstacleInfo);
            
            // Add a visual spawning effect
            const spawnEffect = this.add.circle(
                obstacleInfo.x,
                obstacleInfo.y,
                obstacleInfo.size * 1.5,
                0x00ffff,
                0.7
            );
            
            // Animate the spawn effect
            this.tweens.add({
                targets: spawnEffect,
                alpha: 0,
                scale: 1.5,
                duration: 1000,
                onComplete: () => spawnEffect.destroy()
            });
            
            // Add a text notification
            const notification = this.add.text(
                this.cameras.main.width / 2,
                50,
                'New Obstacle Spawned!',
                {
                    fontSize: '24px',
                    fontStyle: 'bold',
                    fill: '#00ffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            );
            notification.setOrigin(0.5);
            notification.setScrollFactor(0);
            notification.setDepth(100);
            
            // Animate and remove the notification
            this.tweens.add({
                targets: notification,
                alpha: 0,
                y: 20,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => notification.destroy()
            });
        });
        
        // Coin-related events
        // When getting all current coins
        this.socketManager.on('currentCoins', (coins) => {
            console.log('Received current coins:', coins);
            
            // Clear any existing coins
            Object.values(this.coins).forEach(coin => {
                if (coin && typeof coin.destroy === 'function') {
                    coin.destroy();
                }
            });
            this.coins = {};
            
            // Create all coins
            if (Array.isArray(coins)) {
                coins.forEach(coinInfo => {
                    if (coinInfo && coinInfo.id) {
                        this.createCoin(coinInfo);
                    }
                });
            }
        });
        
        // When a new coin is spawned
        this.socketManager.on('coinSpawned', (coinInfo) => {
            // Create the new coin
            this.createCoin(coinInfo);
        });
        
        // When a coin is collected by any player
        this.socketManager.on('coinCollected', (collectionInfo) => {
            const coinId = collectionInfo.coinId;
            const playerId = collectionInfo.playerId;
            
            // Only show collection effect if collected by another player
            // (We already handled our own collection in the overlap handler)
            if (playerId !== this.socketManager.getPlayerId() && this.coins[coinId]) {
                this.coins[coinId].destroy(true);
                delete this.coins[coinId];
            }
        });
        
        // When a coin is removed (expired)
        this.socketManager.on('coinRemoved', (removalInfo) => {
            const coinId = removalInfo.coinId;
            
            // If expired, don't show the collection effect
            if (this.coins[coinId]) {
                this.coins[coinId].destroy(false);
                delete this.coins[coinId];
            }
        });
        
        // When a player's score is updated
        this.socketManager.on('playerScoreUpdate', (scoreInfo) => {
            // If it's our score, update the UI
            if (scoreInfo.playerId === this.socketManager.getPlayerId() && this.player) {
                this.player.score = scoreInfo.score;
                this.ui.updateScoreCounter(scoreInfo.score);
            } else if (this.otherPlayers[scoreInfo.playerId]) {
                // Update other player's score
                this.otherPlayers[scoreInfo.playerId].score = scoreInfo.score;
            }
        });
        
        // When a new player joins
        this.socketManager.on('newPlayer', (playerInfo) => {
            this.addOtherPlayer(playerInfo);
        });
        
        // When a player disconnects
        this.socketManager.on('playerDisconnected', (id) => {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].destroy();
                delete this.otherPlayers[id];
            }
        });
        
        // When a player moves
        this.socketManager.on('playerMoved', (playerInfo) => {
            if (this.otherPlayers[playerInfo.id]) {
                const otherPlayer = this.otherPlayers[playerInfo.id];
                otherPlayer.sprite.x = playerInfo.x;
                otherPlayer.sprite.y = playerInfo.y;
                otherPlayer.playAnimation(playerInfo.direction, playerInfo.moving);
            }
        });
        
        // When a player's name is updated
        this.socketManager.on('playerNameUpdate', (playerInfo) => {
            if (playerInfo.id === this.socketManager.getPlayerId()) {
                // Update our player name
                if (this.player) {
                    this.player.setName(playerInfo.name);
                }
            } else if (this.otherPlayers[playerInfo.id]) {
                // Update other player's name
                this.otherPlayers[playerInfo.id].setName(playerInfo.name);
            }
        });
        
        // When a projectile is fired by another player
        this.socketManager.on('projectileFired', (projectileInfo) => {
            if (projectileInfo.playerId !== this.socketManager.getPlayerId()) {
                this.createProjectile(projectileInfo);
            }
        });
        
        // When a projectile is destroyed
        this.socketManager.on('projectileDestroyed', (projectileId) => {
            console.log('Server requested projectile destruction:', projectileId);
            
            const projectile = this.projectiles[projectileId];
            if (projectile) {
                // Try to gracefully destroy
                if (typeof projectile.destroy === 'function') {
                    projectile.destroy();
                } else {
                    // Fallback if the destroy method doesn't exist
                    if (projectile.sprite) {
                        projectile.sprite.destroy();
                    }
                }
                
                // Remove from the map
                delete this.projectiles[projectileId];
                console.log('Projectile destroyed:', projectileId);
            }
        });
        
        // When a player is hit
        this.socketManager.on('playerHit', (hitInfo) => {
            // If we were hit
            if (hitInfo.hitPlayerId === this.socketManager.getPlayerId()) {
                if (this.player) {
                    // Update health
                    this.player.setHealth(this.player.health - 1);
                    this.ui.updateHealthBar(this.player.health);
                    
                    // Play hit sound effect
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                    
                    // Check if player is defeated
                    if (this.player.health <= 0 && !this.isDefeated) {
                        this.handlePlayerDefeat();
                    }
                    
                    // Create visual effect
                    this.player.createHitEffect();
                }
            } else if (this.otherPlayers[hitInfo.hitPlayerId]) {
                // Create visual effect for the hit player
                this.otherPlayers[hitInfo.hitPlayerId].createHitEffect();
            }
        });
        
        // When a player is hit by a sword
        this.socketManager.on('playerSwordHit', (hitInfo) => {
            // If we were hit
            if (hitInfo.hitPlayerId === this.socketManager.getPlayerId()) {
                if (this.player) {
                    // Update health
                    this.player.setHealth(this.player.health - 4);
                    this.ui.updateHealthBar(this.player.health);
                    
                    // Play hit sound effect
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                    
                    // Check if player is defeated
                    if (this.player.health <= 0 && !this.isDefeated) {
                        this.handlePlayerDefeat();
                    }
                    
                    // Create visual effect
                    this.player.createHitEffect();
                }
            } else if (this.otherPlayers[hitInfo.hitPlayerId]) {
                // Create visual effect for the hit player
                this.otherPlayers[hitInfo.hitPlayerId].createHitEffect();
            }
        });
        
        // When receiving game state update
        this.socketManager.on('gameState', (gameState) => {
            // Update players
            gameState.players.forEach((serverPlayer) => {
                if (serverPlayer.id === this.socketManager.getPlayerId()) {
                    // Update our player from server
                    if (this.player) {
                        this.player.sprite.x = serverPlayer.x;
                        this.player.sprite.y = serverPlayer.y;
                        
                        // Update health and ammo if they're different
                        if (this.player.health !== serverPlayer.health) {
                            this.player.setHealth(serverPlayer.health);
                            this.ui.updateHealthBar(this.player.health);
                        }
                        
                        if (this.player.ammo !== serverPlayer.ammo) {
                            this.player.setAmmo(serverPlayer.ammo);
                            this.ui.updateAmmoCounter(this.player.ammo);
                        }
                    }
                } else {
                    // Update other players
                    if (this.otherPlayers[serverPlayer.id]) {
                        const otherPlayer = this.otherPlayers[serverPlayer.id];
                        otherPlayer.sprite.x = serverPlayer.x;
                        otherPlayer.sprite.y = serverPlayer.y;
                        otherPlayer.setHealth(serverPlayer.health);
                        otherPlayer.setAmmo(serverPlayer.ammo);
                        
                        if (serverPlayer.moving) {
                            otherPlayer.playAnimation(serverPlayer.direction, true);
                        } else {
                            otherPlayer.playAnimation(serverPlayer.direction, false);
                        }
                    }
                }
            });
            
            // Update projectiles
            if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
                gameState.projectiles.forEach(serverProjectile => {
                    // Check if we already have this projectile
                    if (this.projectiles[serverProjectile.id]) {
                        // Update existing projectile position
                        const projectile = this.projectiles[serverProjectile.id];
                        
                        if (projectile.sprite) {
                            // Update the physics position
                            projectile.sprite.x = serverProjectile.x;
                            projectile.sprite.y = serverProjectile.y;
                            
                            // Update velocity if it's provided
                            if (serverProjectile.velocityX !== undefined && serverProjectile.velocityY !== undefined) {
                                projectile.sprite.setVelocity(serverProjectile.velocityX, serverProjectile.velocityY);
                            }
                        }
                    } else {
                        // Create a new projectile if we don't have it yet
                        this.createProjectile({
                            id: serverProjectile.id,
                            x: serverProjectile.x,
                            y: serverProjectile.y,
                            velocityX: serverProjectile.velocityX || 0,
                            velocityY: serverProjectile.velocityY || 0,
                            playerId: serverProjectile.playerId
                        });
                    }
                });
                
                // Remove projectiles that are no longer in the game state
                Object.keys(this.projectiles).forEach(id => {
                    if (!gameState.projectiles.some(p => p.id === id)) {
                        if (this.projectiles[id]) {
                            this.projectiles[id].destroy();
                            delete this.projectiles[id];
                        }
                    }
                });
            }
            
            // Update obstacles
            if (gameState.obstacles && Array.isArray(gameState.obstacles)) {
                // Track which obstacles exist in the new state
                const currentObstacleIds = new Set();
                
                gameState.obstacles.forEach(serverObstacle => {
                    currentObstacleIds.add(serverObstacle.id);
                    
                    // Check if we already have this obstacle
                    if (this.obstacles[serverObstacle.id]) {
                        // Update existing obstacle
                        this.obstacles[serverObstacle.id].updateFromServer(
                            serverObstacle.x,
                            serverObstacle.y,
                            serverObstacle.health
                        );
                    } else {
                        // Create a new obstacle if we don't have it yet
                        this.createObstacle(serverObstacle);
                    }
                });
                
                // Remove obstacles that are no longer in the game state
                Object.keys(this.obstacles).forEach(id => {
                    if (!currentObstacleIds.has(id)) {
                        if (this.obstacles[id]) {
                            this.obstacles[id].destroy();
                            delete this.obstacles[id];
                        }
                    }
                });
            }
            
            // Update coins if they're included in this update
            if (gameState.coins && Array.isArray(gameState.coins)) {
                // Track which coins exist in the new state
                const currentCoinIds = new Set();
                
                gameState.coins.forEach(serverCoin => {
                    currentCoinIds.add(serverCoin.id);
                    
                    // Check if we already have this coin
                    if (this.coins[serverCoin.id]) {
                        // Update existing coin position if needed
                        this.coins[serverCoin.id].updatePosition(
                            serverCoin.x,
                            serverCoin.y
                        );
                    } else {
                        // Create a new coin if we don't have it yet
                        this.createCoin(serverCoin);
                    }
                });
                
                // Note: We DO NOT remove coins that are not in the update
                // since coins may not be included in every update
                // Coin removal is handled by explicit coinRemoved and coinCollected events
            }
        });
        
        // When a player is defeated
        this.socketManager.on('playerDefeated', (data) => {
            // If it's another player who was defeated
            if (data.playerId !== this.socketManager.getPlayerId() && this.otherPlayers[data.playerId]) {
                const defeatedPlayer = this.otherPlayers[data.playerId];
                
                // Store position before hiding the player
                const playerX = defeatedPlayer.sprite.x;
                const playerY = defeatedPlayer.sprite.y;
                
                // Create death explosion effect
                this.createDeathExplosion(playerX, playerY);
                
                // Hide the player sprite and disable physics
                defeatedPlayer.sprite.setVisible(false);
                defeatedPlayer.sprite.body.enable = false;
                
                // Create a defeat text above the player
                const defeatedText = this.add.text(
                    playerX, 
                    playerY - 50, 
                    'DEFEATED', 
                    {
                        fontSize: '20px',
                        fontWeight: 'bold',
                        fill: '#ff0000',
                        stroke: '#000',
                        strokeThickness: 3
                    }
                );
                defeatedText.setOrigin(0.5);
                defeatedText.setDepth(20);
                
                // Animate and remove after 2 seconds
                this.tweens.add({
                    targets: defeatedText,
                    y: defeatedText.y - 30,
                    alpha: 0,
                    duration: 2000,
                    onComplete: function() {
                        defeatedText.destroy();
                    }
                });
            }
        });
        
        // When a player respawns
        this.socketManager.on('playerRespawned', (data) => {
            if (data.playerId === this.socketManager.getPlayerId()) {
                // Update our player position after respawn
                if (this.player) {
                    this.player.sprite.x = data.x;
                    this.player.sprite.y = data.y;
                    this.player.setHealth(data.health);
                    this.player.setAmmo(data.ammo);
                    this.ui.updateHealthBar(this.player.health);
                    this.ui.updateAmmoCounter(this.player.ammo);
                }
            } else if (this.otherPlayers[data.playerId]) {
                // Update other player
                const respawnedPlayer = this.otherPlayers[data.playerId];
                respawnedPlayer.sprite.x = data.x;
                respawnedPlayer.sprite.y = data.y;
                respawnedPlayer.setHealth(data.health);
                respawnedPlayer.setAmmo(data.ammo);
                respawnedPlayer.sprite.clearTint(); // Remove red tint
                respawnedPlayer.sprite.setVisible(true); // Make player visible again
                respawnedPlayer.sprite.body.enable = true; // Re-enable physics
                
                // Show respawn effect
                this.createRespawnEffect(
                    respawnedPlayer.sprite.x,
                    respawnedPlayer.sprite.y
                );
            }
        });
        
        // When a sword is used by another player
        this.socketManager.on('swordUsed', (swordData) => {
            if (swordData.playerId !== this.socketManager.getPlayerId()) {
                // Create sword for other player
                const otherPlayer = this.otherPlayers[swordData.playerId];
                if (otherPlayer) {
                    // Create a simple sword for the other player
                    new SimpleSword(
                        this,
                        otherPlayer.sprite,
                        swordData.direction,
                        swordData.playerId
                    );
                }
            }
        });
    }
    
    setupCollisions() {
        if (this.player) {
            // Setup collision between player and other players
            this.physics.add.collider(
                this.player.sprite,
                this.otherPlayersGroup
            );
            
            // Setup collision between player and obstacles
            this.physics.add.collider(
                this.player.sprite,
                this.obstaclesGroup
            );
            
            // Setup overlap between projectiles and the local player
            this.physics.add.overlap(
                this.projectilesGroup,
                this.player.sprite,
                this.handleProjectileHit,
                (projectileSprite, playerSprite) => {
                    console.log('Testing projectile-player collision:', projectileSprite.playerId, this.socketManager.getPlayerId());
                    // Make sure local player can't be hit by own projectile
                    return projectileSprite.playerId !== this.socketManager.getPlayerId();
                },
                this
            );
            
            // Enable coin collection
            this.physics.add.overlap(
                this.player.sprite,
                this.coinsGroup,
                this.handleCoinCollection,
                null,
                this
            );
        }
        
        // Setup overlap between projectiles and other players
        this.physics.add.overlap(
            this.projectilesGroup,
            this.otherPlayersGroup,
            this.handleProjectileHit,
            (projectileSprite, otherPlayerSprite) => {
                console.log('Testing projectile-otherPlayer collision:', projectileSprite.playerId, otherPlayerSprite.playerId);
                // Only register collisions for projectiles that weren't fired by the hit player
                return projectileSprite.playerId !== otherPlayerSprite.playerId;
            },
            this
        );
        
        // Setup collision between projectiles and obstacles
        this.physics.add.collider(
            this.projectilesGroup,
            this.obstaclesGroup,
            this.handleProjectileObstacleHit,
            null,
            this
        );
        
        // Setup collision between other players and obstacles
        this.physics.add.collider(
            this.otherPlayersGroup,
            this.obstaclesGroup
        );
    }
    
    /**
     * Create a new coin
     * @param {Object} coinInfo - The coin data from server
     */
    createCoin(coinInfo) {
        try {
            // Validate coin data
            if (!coinInfo || !coinInfo.id) {
                console.error('Invalid coin data:', coinInfo);
                return null;
            }
            
            // Ensure we have valid coordinates
            const x = Number(coinInfo.x) || 0;
            const y = Number(coinInfo.y) || 0;
            const size = Number(coinInfo.size) || 15;
            
            console.log('Creating coin:', coinInfo.id, 'at position:', x, y);
            
            // If this coin already exists, update position and return the existing coin
            if (this.coins[coinInfo.id]) {
                this.coins[coinInfo.id].updatePosition(x, y);
                return this.coins[coinInfo.id];
            }
            
            // Get coin type (player_drop or regular)
            const coinType = coinInfo.type || 'regular';
            
            // Create a new coin instance using our simplified and reliable implementation
            const coin = new Coin(this, x, y, size, coinInfo.id, coinType);
            
            // Add to tracking objects
            this.coins[coinInfo.id] = coin;
            
            // Add to physics group if sprite was created successfully
            if (coin.sprite && coin.sprite.body) {
                this.coinsGroup.add(coin.sprite);
                
                // Add a simple scaling effect on creation
                this.tweens.add({
                    targets: coin.sprite,
                    scale: { from: 0, to: 1 },
                    duration: 300,
                    ease: 'Back.out'
                });
            } else {
                console.error('Coin sprite or body not created properly. Will retry creation.');
                
                // Remove the failed coin
                delete this.coins[coinInfo.id];
                
                // Create an emergency fallback coin using a completely different approach
                this.createEmergencyCoin(x, y, coinInfo.id);
            }
            
            return coin;
        } catch (error) {
            console.error('Error creating coin:', error);
            return null;
        }
    }
    
    /**
     * Emergency coin creation - fallback method for when normal coin creation fails
     */
    createEmergencyCoin(x, y, coinId) {
        // Create an absolute fallback coin using the simplest possible approach
        console.log('Creating emergency coin fallback at:', x, y);
        
        // Just use a basic yellow circle
        const sprite = this.physics.add.sprite(x, y, '');
        sprite.coinId = coinId;
        
        // Make it a basic yellow circle if there's no texture
        const circle = this.add.circle(x, y, 15, 0xffff00);
        
        // Store in our coins object with a minimal API
        this.coins[coinId] = {
            id: coinId,
            sprite: sprite,
            updatePosition: (newX, newY) => {
                if (sprite) sprite.setPosition(newX, newY);
                if (circle) circle.setPosition(newX, newY);
            },
            destroy: (collected) => {
                if (sprite) sprite.destroy();
                if (circle) circle.destroy();
                delete this.coins[coinId];
            }
        };
        
        // Add to the physics group
        this.coinsGroup.add(sprite);
        
        return this.coins[coinId];
    }
    
    /**
     * Handle coin collection by the player
     * @param {Phaser.GameObjects.Sprite} playerSprite - The player sprite
     * @param {Phaser.GameObjects.Sprite} coinSprite - The coin sprite
     */
    handleCoinCollection(playerSprite, coinSprite) {
        // Skip collection if player is in defeated state
        if (this.isDefeated) {
            console.log('Cannot collect coin while defeated');
            return;
        }
        
        // Get coin ID
        const coinId = coinSprite.coinId;
        
        if (!coinId || !this.coins[coinId]) {
            console.log('Invalid coin collection attempt:', coinId);
            return;
        }
        
        console.log('Collecting coin:', coinId);
        
        // Notify server that coin was collected
        this.socketManager.collectCoin(coinId);
        
        // Play coin collection sound
        if (this.coinSound) {
            this.coinSound.play({ volume: 0.5 });
        }
        
        // Create collection effect and destroy coin locally
        // Server will broadcast the update to remove it for all players
        this.coins[coinId].destroy(true);
        delete this.coins[coinId];
    }
    
    /**
     * Create a new obstacle
     * @param {Object} obstacleInfo - The obstacle data from server
     */
    createObstacle(obstacleInfo) {
        // Create obstacle instance
        const obstacle = new Obstacle(
            this,
            obstacleInfo.x,
            obstacleInfo.y,
            obstacleInfo.size,
            obstacleInfo.id,
            obstacleInfo.health
        );
        
        // Add to tracking objects
        this.obstacles[obstacleInfo.id] = obstacle;
        this.obstaclesGroup.add(obstacle.sprite);
    }
    
    /**
     * Handle collision between projectile and obstacle
     * @param {Phaser.GameObjects.Sprite} projectileSprite - The projectile sprite
     * @param {Phaser.GameObjects.Sprite} obstacleSprite - The obstacle sprite
     */
    handleProjectileObstacleHit(projectileSprite, obstacleSprite) {
        // Find projectile instance
        let projectileId = null;
        for (const id in this.projectiles) {
            if (this.projectiles[id].sprite === projectileSprite) {
                projectileId = id;
                break;
            }
        }
        
        if (projectileId) {
            // Find and destroy the projectile
            const projectile = this.projectiles[projectileId];
            if (projectile) {
                projectile.destroy();
                delete this.projectiles[projectileId];
            }
            
            // Notify server to destroy projectile
            this.socketManager.destroyProjectile(projectileId);
            
            // Create impact effect
            this.createHitImpact(projectileSprite.x, projectileSprite.y);
        }
    }
    
    createPlayer(playerInfo) {
        // Create the local player
        this.player = new Player(
            this,
            playerInfo.x,
            playerInfo.y,
            'character',
            true,
            playerInfo.id,
            playerInfo.name
        );
        
        // Use player name from server if available
        if (playerInfo.name) {
            this.player.setName(playerInfo.name);
            this.ui.setNameInputValue(playerInfo.name);
        }
        
        // Initialize player properties
        this.player.setHealth(playerInfo.health);
        this.player.setAmmo(playerInfo.ammo);
        this.player.score = playerInfo.score || 0;
        this.ui.updateHealthBar(this.player.health);
        this.ui.updateAmmoCounter(this.player.ammo);
        this.ui.updateScoreCounter(this.player.score);
    }
    
    addOtherPlayer(playerInfo) {
        // Create a new player instance for another player
        const otherPlayer = new Player(
            this,
            playerInfo.x,
            playerInfo.y,
            'character',
            false,
            playerInfo.id,
            playerInfo.name
        );
        
        // Add to tracking objects
        this.otherPlayers[playerInfo.id] = otherPlayer;
        this.otherPlayersGroup.add(otherPlayer.sprite);
        
        // Store player ID on sprite for collision handling
        otherPlayer.sprite.playerId = playerInfo.id;
    }
    
    createProjectile(projectileInfo) {
        console.log('Creating projectile:', projectileInfo);
        
        // Use the VisibleProjectile class for reliable rendering
        const projectile = new VisibleProjectile(
            this,
            projectileInfo.x,
            projectileInfo.y,
            projectileInfo.id,
            projectileInfo.playerId,
            projectileInfo.velocityX,
            projectileInfo.velocityY
        );
        
        // Store in the projectiles map
        this.projectiles[projectileInfo.id] = projectile;
        
        // Add to physics group for collision detection
        if (projectile.sprite) {
            this.projectilesGroup.add(projectile.sprite);
            
            // Set the sprite to be interactive for debugging
            projectile.sprite.setInteractive();
            
            // Add debug event to log info when clicked
            projectile.sprite.on('pointerdown', () => {
                console.log('Projectile clicked:', {
                    id: projectile.id,
                    position: { x: projectile.sprite.x, y: projectile.sprite.y },
                    velocity: { x: projectile.sprite.body.velocity.x, y: projectile.sprite.body.velocity.y },
                    active: projectile.sprite.active,
                    visible: projectile.sprite.visible
                });
            });
        }
        
        return projectile;
    }
    
    fireProjectile() {
        // Don't fire if player is defeated
        if (this.isDefeated || !this.player) return;
        
        // Play shoot sound effect
        if (this.shootSound) {
            this.shootSound.play({ volume: 0.5 });
        }
        
        // Send to server - only send the direction, server will handle creation
        this.socketManager.fireProjectile(this.lastDirection);
    }
    
    handleProjectileHit(projectileSprite, playerHit) {
        // Skip if projectile is already inactive
        if (!projectileSprite.active) return;
        
        // Get the projectile ID and owner ID from the sprite
        const projectileId = projectileSprite.id;
        const projectileOwnerId = projectileSprite.playerId;
        
        console.log('Projectile hit detected:', {
            projectileId,
            projectileOwnerId,
            hitPlayerId: playerHit.playerId || this.socketManager.getPlayerId()
        });
        
        if (!projectileId || !projectileOwnerId) {
            console.error('Missing projectile ID or owner ID on sprite:', projectileSprite);
            return;
        }
        
        // Get hit player ID
        const hitPlayerId = playerHit.playerId || this.socketManager.getPlayerId();
        
        // Ignore self-hits
        if (projectileOwnerId === hitPlayerId) {
            console.log('Ignoring self-hit');
            return;
        }
        
        // Find and destroy the projectile
        const projectile = this.projectiles[projectileId];
        if (projectile) {
            if (typeof projectile.destroy === 'function') {
                projectile.destroy();
            } else {
                // Fallback if the destroy method doesn't exist
                if (projectile.sprite) {
                    projectile.sprite.destroy();
                }
            }
            delete this.projectiles[projectileId];
        }
        
        // Notify server to destroy projectile
        this.socketManager.destroyProjectile(projectileId);
        
        // Notify server about hit
        this.socketManager.playerHit(hitPlayerId, projectileOwnerId);
        
        // Create a hit impact effect
        this.createHitImpact(playerHit.x, playerHit.y);
    }
    
    /**
     * Create a visual impact effect when a projectile hits something
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    createHitImpact(x, y) {
        // Create a visual impact effect
        const impact = this.add.circle(x, y, 20, 0xffff00, 0.8);
        impact.setDepth(15);
        
        // Animate and destroy
        this.tweens.add({
            targets: impact,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => impact.destroy()
        });
    }
    
    useSword() {
        // Don't use sword if player is defeated
        if (this.isDefeated || !this.player) return;
        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastSwordTime < this.swordCooldown) {
            return;
        }
        
        // Update last sword time
        this.lastSwordTime = currentTime;
        
        // Play sword sound effect
        if (this.swordSound) {
            this.swordSound.play({ volume: 0.6 });
        }
        
        // Reset the hit tracking for this new sword swing
        this.playersHitBySword = {};
        this.obstaclesHitBySword = {};
        
        // Create a simple sword using our new class
        const sword = new SimpleSword(
            this,
            this.player.sprite,
            this.lastDirection,
            this.socketManager.getPlayerId()
        );
        
        // Get the hitbox for collision detection
        const swordHitbox = sword.getHitbox();
        
        // Check for sword hits on other players
        this.physics.add.overlap(
            swordHitbox,
            this.otherPlayersGroup,
            (sword, otherPlayerSprite) => {
                // Get other player ID
                const otherPlayerId = otherPlayerSprite.playerId;
                
                // Check if this player was already hit by this sword swing
                if (this.playersHitBySword[otherPlayerId]) return;
                
                // Mark this player as hit by this sword swing
                this.playersHitBySword[otherPlayerId] = true;
                
                // Notify server about the sword hit
                this.socketManager.swordHit(otherPlayerId);
                
                // Create hit effect on the other player
                if (this.otherPlayers[otherPlayerId]) {
                    this.otherPlayers[otherPlayerId].createHitEffect();
                }
            }
        );
        
        // Check for sword hits on obstacles
        this.physics.add.overlap(
            swordHitbox,
            this.obstaclesGroup,
            (sword, obstacleSprite) => {
                // Get obstacle ID
                const obstacleId = obstacleSprite.obstacleId;
                
                // Check if this obstacle was already hit by this sword swing
                if (this.obstaclesHitBySword[obstacleId]) return;
                
                // Mark this obstacle as hit by this sword swing
                this.obstaclesHitBySword[obstacleId] = true;
                
                // Notify server about the sword hit on obstacle
                this.socketManager.obstacleHit(obstacleId);
                
                // Create temporary visual effect locally - actual change will come from server
                const obstacle = this.obstacles[obstacleId];
                if (obstacle) {
                    obstacle.createHitEffect();
                }
            }
        );
        
        // Notify server that sword was used - using the hitbox position as the sword tip
        this.socketManager.swordUsed(
            swordHitbox.x, 
            swordHitbox.y, 
            0, // Rotation doesn't matter for simple sword
            this.lastDirection
        );
    }
    
    // createSwordVisual method removed as we now use SimpleSword class
    
    handlePlayerDefeat() {
        this.isDefeated = true;
        
        // Create particle explosion at player position
        if (this.player) {
            const playerX = this.player.sprite.x;
            const playerY = this.player.sprite.y;
            
            // Create explosion particles
            this.createDeathExplosion(playerX, playerY);
            
            // Hide the player sprite immediately and disable physics
            this.player.sprite.setVisible(false);
            
            // Disable the player's physics body to prevent any collision detection
            this.player.sprite.body.enable = false;
        }
        
        // Show the defeat text
        this.ui.showDefeatText();
        
        // Tell server player was defeated
        this.socketManager.playerDefeated();
        
        // Reset player after delay
        this.time.delayedCall(2000, () => this.resetPlayer());
    }
    
    /**
     * Create particle explosion for player death that transitions into a coin
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createDeathExplosion(x, y) {
        // Create particle colors (player colors + gold for transition to coin)
        const colors = [0xff0000, 0xffff00, 0x00ffff, 0xffffff, 0xFFD700];
        
        // Create particles flying outward
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            const size = 3 + Math.random() * 5;
            
            // Choose random color from array
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = this.add.circle(
                x, 
                y, 
                size, 
                color
            );
            particle.setDepth(20);
            
            // Animate particle outward
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.5,
                duration: 800,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Create a flash effect
        const flash = this.add.circle(x, y, 50, 0xffffff, 0.8);
        flash.setDepth(19);
        
        // Animate the flash
        this.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });
    }
    
    resetPlayer() {
        // Hide defeat text
        this.ui.hideDefeatText();
        
        // Re-enable player
        if (this.player) {
            this.player.sprite.clearTint();
            this.player.sprite.setVisible(true); // Make player visible again
            this.player.sprite.body.enable = true; // Re-enable physics
            
            // Add a respawn effect
            this.createRespawnEffect(this.player.sprite.x, this.player.sprite.y);
            
            // Tell server to respawn player
            this.socketManager.respawnPlayer();
        }
        
        this.isDefeated = false;
    }
    
    /**
     * Create a visual effect for player respawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createRespawnEffect(x, y) {
        // Create a respawn circle that expands outward
        const respawnCircle = this.add.circle(x, y, 0, 0x00ffff, 0.6);
        respawnCircle.setDepth(5);
        
        // Animate the respawn circle
        this.tweens.add({
            targets: respawnCircle,
            radius: 50,
            alpha: 0,
            duration: 800,
            onComplete: () => respawnCircle.destroy()
        });
        
        // Create some small particles
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 10;
            const size = 2 + Math.random() * 3;
            
            const particle = this.add.circle(
                x + Math.cos(angle) * distance, 
                y + Math.sin(angle) * distance, 
                size, 
                0x00ffff
            );
            particle.setDepth(6);
            particle.setAlpha(0);
            
            // Animate particles moving inward
            this.tweens.add({
                targets: particle,
                x: x,
                y: y,
                alpha: { from: 0, to: 0.8, duration: 300 },
                scale: { from: 0.5, to: 1.5, duration: 400 },
                ease: 'Sine.easeIn',
                duration: 500,
                onComplete: () => {
                    this.tweens.add({
                        targets: particle,
                        alpha: 0,
                        scale: 0,
                        duration: 300,
                        onComplete: () => particle.destroy()
                    });
                }
            });
        }
    }
    
    /**
     * Show the connection status on screen
     * @param {boolean} connected - Whether we're connected to the server
     * @param {string} message - Optional message to show
     */
    showConnectionStatus(connected, message = '') {
        // Remove existing status text if it exists
        if (this.connectionStatusText) {
            this.connectionStatusText.destroy();
        }
        
        // Create message text
        let statusText = connected ? 'Connected to server' : 'Disconnected from server';
        if (message && !connected) {
            statusText += `: ${message}`;
        }
        
        // Create status text
        this.connectionStatusText = this.add.text(
            10, 
            10, 
            statusText, 
            {
                fontSize: '14px',
                fontStyle: connected ? 'normal' : 'bold',
                fill: connected ? '#00FF00' : '#FF0000',
                stroke: '#000000',
                strokeThickness: 2,
                backgroundColor: '#00000099',
                padding: { x: 5, y: 2 }
            }
        );
        this.connectionStatusText.setScrollFactor(0);
        this.connectionStatusText.setDepth(1000);
        
        // If connected, fade out after 5 seconds
        if (connected) {
            this.time.delayedCall(5000, () => {
                if (this.connectionStatusText) {
                    this.tweens.add({
                        targets: this.connectionStatusText,
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => {
                            if (this.connectionStatusText) {
                                this.connectionStatusText.destroy();
                                this.connectionStatusText = null;
                            }
                        }
                    });
                }
            });
        }
    }
    
    update() {
        // Skip if player not created yet
        if (!this.player) return;
        
        // Update all players' visuals
        this.player.update();
        
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            otherPlayer.update();
        });
        
        // Skip game controls if player is defeated or input is focused
        if (this.isDefeated || this.ui.isInputActive()) return;
        
        // Create input object based on cursor keys
        const inputs = {
            left: this.cursors.left.isDown,
            right: this.cursors.right.isDown,
            up: this.cursors.up.isDown,
            down: this.cursors.down.isDown
        };
        
        // Only send inputs if we're connected
        if (this.socketManager.connected) {
            this.socketManager.sendPlayerInput(inputs);
        }
        
        // Handle local animation based on inputs
        let moving = false;
        
        // Determine new direction based on input combination
        let direction = this.lastDirection; // Start with current direction
        
        if (inputs.up && inputs.left) {
            direction = 'up-left';
            moving = true;
        } else if (inputs.up && inputs.right) {
            direction = 'up-right';
            moving = true;
        } else if (inputs.down && inputs.left) {
            direction = 'down-left';
            moving = true;
        } else if (inputs.down && inputs.right) {
            direction = 'down-right';
            moving = true;
        } else if (inputs.left) {
            direction = 'left';
            moving = true;
        } else if (inputs.right) {
            direction = 'right';
            moving = true;
        } else if (inputs.up) {
            direction = 'up';
            moving = true;
        } else if (inputs.down) {
            direction = 'down';
            moving = true;
        }
        
        // Update lastDirection if we're moving
        if (moving) {
            this.lastDirection = direction;
        }
        
        // Play appropriate animation
        this.player.playAnimation(direction, moving);
    }
}