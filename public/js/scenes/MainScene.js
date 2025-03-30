/**
 * MainScene - The main game scene
 */
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        
        this.player = null;
        this.otherPlayers = {};
        this.projectiles = {};
        this.lastDirection = 'down';
        this.isDefeated = false;
        this.lastSwordTime = 0;
        this.swordCooldown = 1000;
        this.playersHitBySword = {};
    }
    
    preload() {
        // Load assets
        AssetLoader.preloadAssets(this);
        
        // Load sound effects
        this.load.audio('shoot', 'sounds/shoot.mp3');
        this.load.audio('hit', 'sounds/hit.mp3');
        this.load.audio('sword-slash', 'sounds/sword-slash.mp3');
    }
    
    create() {
        // Initialize networking
        this.socketManager = new SocketManager();
        
        // Create animations
        AnimationManager.createAnimations(this);
        
        // Create physics groups
        this.otherPlayersGroup = this.physics.add.group();
        this.projectilesGroup = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 20,
            runChildUpdate: true
        });
        
        // Initialize sound effects
        this.initSounds();
        
        // Create UI
        this.ui = new UserInterface(this);
        
        // Setup keyboard input
        this.setupInput();
        
        // Setup socket events
        this.setupSocketEvents();
    }
    
    initSounds() {
        try {
            this.shootSound = this.sound.add('shoot');
            this.hitSound = this.sound.add('hit');
            this.swordSound = this.sound.add('sword-slash');
            
            // Add event handlers for when sounds fail to load
            this.sound.once('loaderror', (soundKey, error) => {
                console.error('Error loading sound:', soundKey, error);
            });
        } catch (error) {
            console.error('Error initializing sounds:', error);
            // Set to null to avoid errors when trying to play sounds
            this.shootSound = null;
            this.hitSound = null;
            this.swordSound = null;
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
        });
        
        // When a player is defeated
        this.socketManager.on('playerDefeated', (data) => {
            // If it's another player who was defeated
            if (data.playerId !== this.socketManager.getPlayerId() && this.otherPlayers[data.playerId]) {
                const defeatedPlayer = this.otherPlayers[data.playerId];
                
                // Visual effect for defeated player
                defeatedPlayer.sprite.setTint(0xff0000); // Red tint
                
                // Create a defeat text above the player
                const defeatedText = this.add.text(
                    defeatedPlayer.sprite.x, 
                    defeatedPlayer.sprite.y - 50, 
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
                
                // Show respawn effect
                const respawnEffect = this.add.sprite(
                    respawnedPlayer.sprite.x,
                    respawnedPlayer.sprite.y,
                    'character'
                );
                respawnEffect.setTint(0x00ffff); // Cyan tint
                respawnEffect.setAlpha(0.7);
                respawnEffect.setScale(1.5);
                
                // Animation
                this.tweens.add({
                    targets: respawnEffect,
                    alpha: 0,
                    scale: 0.5,
                    duration: 800,
                    onComplete: function() {
                        respawnEffect.destroy();
                    }
                });
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
        this.ui.updateHealthBar(this.player.health);
        this.ui.updateAmmoCounter(this.player.ammo);
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
        
        // Reset the hit players tracking for this new sword swing
        this.playersHitBySword = {};
        
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
        
        // Disable player visually
        if (this.player) {
            this.player.sprite.setTint(0xff0000); // Make player red
        }
        
        // Show the defeat text
        this.ui.showDefeatText();
        
        // Tell server player was defeated
        this.socketManager.playerDefeated();
        
        // Reset player after delay
        this.time.delayedCall(2000, () => this.resetPlayer());
    }
    
    resetPlayer() {
        // Hide defeat text
        this.ui.hideDefeatText();
        
        // Re-enable player
        if (this.player) {
            this.player.sprite.clearTint();
            
            // Tell server to respawn player
            this.socketManager.respawnPlayer();
        }
        
        this.isDefeated = false;
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
        
        // Send inputs to server
        this.socketManager.sendPlayerInput(inputs);
        
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