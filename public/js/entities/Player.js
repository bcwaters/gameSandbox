/**
 * Player class representing a game player
 */
class Player {
    /**
     * Create a new player
     * @param {Phaser.Scene} scene - The scene this player belongs to
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {string} charType - The character type to use for animations
     * @param {boolean} isLocalPlayer - Whether this is the local player
     * @param {string} id - The player's ID
     * @param {string} name - The player's name
     */
    constructor(scene, x, y, charType, isLocalPlayer, id, name) {
        this.scene = scene;
        this.isLocalPlayer = isLocalPlayer;
        this.id = id;
        this.name = name || "Player";
        this.charType = charType || AnimationManager.CHARACTER_TYPES.CHARACTER;
        
        // Get animation configuration for this character type
        const animConfig = AnimationManager.getAnimationConfig(this.charType);
        
        // Create the sprite with the appropriate texture
        this.sprite = scene.physics.add.sprite(x, y, animConfig.texture);
        this.sprite.setCollideWorldBounds(true);
        
        // Set up physics body using configuration
        this.sprite.body.setSize(
            animConfig.physicsSize.width, 
            animConfig.physicsSize.height
        );
        this.sprite.body.setOffset(
            animConfig.physicsOffset.x, 
            animConfig.physicsOffset.y
        );
        
        // Set appropriate physics properties
        if (isLocalPlayer) {
            this.sprite.body.mass = 10;
            this.sprite.setDepth(10);
        } else {
            this.sprite.body.immovable = true;
            this.sprite.setDepth(10);
        }
        
        // Add player name text
        this.nameText = scene.add.text(x, y - 30, name, {
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        });
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(11);
        
        // Set up health properties
        this.maxHealth = 5;
        this.health = this.maxHealth;
        
        // Set up ammo properties
        this.maxAmmo = 10;
        this.ammo = this.maxAmmo;
        
        // Create health bar for other players
        if (!isLocalPlayer) {
            this.createHealthBar();
        }
    }
    
    /**
     * Create a health bar for this player
     */
    createHealthBar() {
        // Create a container to hold health bar elements
        this.healthBarContainer = this.scene.add.container(this.sprite.x, this.sprite.y - 35);
        
        // Create health bar background
        const barWidth = 40;
        const barHeight = 5;
        this.healthBarBg = this.scene.add.rectangle(
            0, 0, barWidth, barHeight, 0x000000, 0.8
        );
        
        // Create health bar fill
        this.healthBarFill = this.scene.add.rectangle(
            0, 0, barWidth, barHeight, 0x00ff00, 1
        );
        
        // Add elements to container
        this.healthBarContainer.add(this.healthBarBg);
        this.healthBarContainer.add(this.healthBarFill);
        
        // Set initial health display
        this.updateHealthBar();
        
        // Set container depth to be above player
        this.healthBarContainer.setDepth(15);
    }
    
    /**
     * Update the health bar display
     */
    updateHealthBar() {
        if (this.healthBarFill) {
            // Calculate health percentage
            const healthPercent = this.health / this.maxHealth;
            
            // Update fill width based on health
            const barWidth = 40;
            this.healthBarFill.width = barWidth * healthPercent;
            
            // Update color based on health level
            if (healthPercent > 0.6) {
                this.healthBarFill.fillColor = 0x00ff00; // Green
            } else if (healthPercent > 0.3) {
                this.healthBarFill.fillColor = 0xffff00; // Yellow
            } else {
                this.healthBarFill.fillColor = 0xff0000; // Red
            }
        }
    }
    
    /**
     * Update player position and visuals
     */
    update() {
        // Update name text position
        if (this.nameText) {
            this.nameText.x = this.sprite.x;
            this.nameText.y = this.sprite.y - 30;
        }
        
        // Update health bar position
        if (this.healthBarContainer) {
            this.healthBarContainer.x = this.sprite.x;
            this.healthBarContainer.y = this.sprite.y - 35;
        }
    }
    
    /**
     * Play the appropriate animation based on direction and movement
     * @param {string} direction - The direction to animate
     * @param {boolean} moving - Whether the player is moving
     */
    playAnimation(direction, moving) {
        if (moving) {
            // For diagonal directions, choose the dominant animation
            if (direction.includes('-')) {
                // Extract the primary direction for animation
                const primaryDir = direction.split('-')[0]; // 'up', 'down'
                this.sprite.anims.play(`walk-${primaryDir}-${this.charType}`, true);
            } else {
                this.sprite.anims.play(`walk-${direction}-${this.charType}`, true);
            }
        } else {
            this.sprite.anims.pause();
        }
    }
    
    /**
     * Set player health
     * @param {number} health - The new health value
     */
    setHealth(health) {
        this.health = Math.max(0, Math.min(health, this.maxHealth));
        this.updateHealthBar();
    }
    
    /**
     * Set player ammo
     * @param {number} ammo - The new ammo value
     */
    setAmmo(ammo) {
        this.ammo = Math.max(0, Math.min(ammo, this.maxAmmo));
    }
    
    /**
     * Set player name
     * @param {string} name - The new name
     */
    setName(name) {
        this.name = name;
        if (this.nameText) {
            this.nameText.setText(name);
        }
    }
    
    /**
     * Create a hit effect on the player
     */
    createHitEffect() {
        // Create a separate sprite for the hit effect
        const hitEffect = this.scene.add.sprite(
            this.sprite.x, 
            this.sprite.y, 
            this.sprite.texture.key
        );
        
        // Match the appearance of the player
        hitEffect.setFrame(this.sprite.frame.name);
        hitEffect.setScale(this.sprite.scaleX, this.sprite.scaleY);
        hitEffect.setFlipX(this.sprite.flipX);
        hitEffect.setFlipY(this.sprite.flipY);
        
        // Set the effect above the player
        hitEffect.setDepth(this.sprite.depth + 1);
        hitEffect.setAlpha(0.7);
        hitEffect.setTint(0xff0000);
        
        // Create a fade-out effect
        this.scene.tweens.add({
            targets: hitEffect,
            alpha: 0,
            duration: 200,
            onComplete: function() {
                hitEffect.destroy();
            }
        });
        
        // Track the player if it moves during the effect
        const tracker = this.scene.time.addEvent({
            delay: 10,
            repeat: 19,
            callback: () => {
                if (hitEffect.active && this.sprite.active) {
                    hitEffect.x = this.sprite.x;
                    hitEffect.y = this.sprite.y;
                    hitEffect.setFrame(this.sprite.frame.name);
                }
            }
        });
    }
    
    /**
     * Destroy the player and clean up resources
     */
    destroy() {
        if (this.nameText) {
            this.nameText.destroy();
        }
        
        if (this.healthBarContainer) {
            this.healthBarContainer.destroy();
        }
        
        this.sprite.destroy();
    }
}