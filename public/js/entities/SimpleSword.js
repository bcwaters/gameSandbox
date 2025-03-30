/**
 * SimpleSword - A minimalist line-based sword implementation that moves with the player
 */
class SimpleSword {
    /**
     * Create a new simple sword
     * @param {Phaser.Scene} scene - The scene this sword belongs to
     * @param {Phaser.GameObjects.Sprite} ownerSprite - The sprite of the player using the sword
     * @param {string} direction - The direction the sword is pointing
     * @param {string} ownerId - The ID of the player using the sword
     */
    constructor(scene, ownerSprite, direction, ownerId) {
        this.scene = scene;
        this.ownerSprite = ownerSprite;
        this.direction = direction;
        this.ownerId = ownerId;
        this.active = true;
        
        // Calculate sword length and position based on direction
        const swordLength = 40; // Length of the sword
        
        // Calculate the offset for the sword end point
        if (direction === 'up') {
            this.offsetX = 0;
            this.offsetY = -swordLength;
        } else if (direction === 'down') {
            this.offsetX = 0;
            this.offsetY = swordLength;
        } else if (direction === 'left') {
            this.offsetX = -swordLength;
            this.offsetY = 0;
        } else if (direction === 'right') {
            this.offsetX = swordLength;
            this.offsetY = 0;
        } else if (direction === 'up-left') {
            this.offsetX = -swordLength * 0.7;
            this.offsetY = -swordLength * 0.7;
        } else if (direction === 'up-right') {
            this.offsetX = swordLength * 0.7;
            this.offsetY = -swordLength * 0.7;
        } else if (direction === 'down-left') {
            this.offsetX = -swordLength * 0.7;
            this.offsetY = swordLength * 0.7;
        } else if (direction === 'down-right') {
            this.offsetX = swordLength * 0.7;
            this.offsetY = swordLength * 0.7;
        }
        
        // Calculate initial end point of the sword
        const swordEndX = ownerSprite.x + this.offsetX;
        const swordEndY = ownerSprite.y + this.offsetY;
        
        // Create the hitbox at the end of the sword
        this.hitbox = scene.physics.add.sprite(swordEndX, swordEndY, null);
        this.hitbox.setVisible(false); // Make hitbox invisible
        this.hitbox.body.setSize(20, 20); // Size of hitbox
        this.hitbox.ownerId = ownerId; // Store owner ID for collision detection
        
        // Create graphics object for the line
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(15);
        
        // Draw the initial sword line
        this.updateSwordLine();
        
        // Setup update callback to keep sword aligned with player
        this.updateCallback = () => {
            if (this.active && this.ownerSprite.active) {
                // Update hitbox position to follow the player
                this.hitbox.x = this.ownerSprite.x + this.offsetX;
                this.hitbox.y = this.ownerSprite.y + this.offsetY;
                
                // Redraw the sword line
                this.updateSwordLine();
            }
        };
        
        // Register update callback
        scene.events.on('update', this.updateCallback);
        
        // Auto-destroy after a short duration
        this.destroyTimer = scene.time.delayedCall(200, () => {
            this.destroy();
        });
    }
    
    /**
     * Update the sword line graphics
     */
    updateSwordLine() {
        if (!this.graphics || !this.ownerSprite) return;
        
        // Clear previous line
        this.graphics.clear();
        
        // Calculate current end point
        const endX = this.ownerSprite.x + this.offsetX;
        const endY = this.ownerSprite.y + this.offsetY;
        
        // Draw a clean line for the sword
        this.graphics.lineStyle(4, 0xffffff, 1); // Thicker white line
        this.graphics.beginPath();
        this.graphics.moveTo(this.ownerSprite.x, this.ownerSprite.y);
        this.graphics.lineTo(endX, endY);
        this.graphics.strokePath();
    }
    
    /**
     * Get the hitbox for collision detection
     * @returns {Phaser.GameObjects.Sprite} The hitbox sprite
     */
    getHitbox() {
        return this.hitbox;
    }
    
    /**
     * Check if the sword is still active
     * @returns {boolean} Whether the sword is active
     */
    isActive() {
        return this.active;
    }
    
    /**
     * Destroy the sword and clean up resources
     */
    destroy() {
        // Remove update callback
        if (this.updateCallback) {
            this.scene.events.off('update', this.updateCallback);
        }
        
        // Cancel destroy timer if it's still running
        if (this.destroyTimer && this.destroyTimer.getProgress() < 1) {
            this.destroyTimer.remove();
        }
        
        // Destroy graphics
        if (this.graphics) {
            this.graphics.destroy();
        }
        
        // Destroy hitbox
        if (this.hitbox) {
            if (this.hitbox.body) {
                this.hitbox.body.enable = false;
            }
            this.hitbox.destroy();
        }
        
        this.active = false;
    }
}