/**
 * VisibleProjectile - A reliable projectile implementation with proper visual effects
 */
class VisibleProjectile {
    /**
     * Create a new visible projectile
     * @param {Phaser.Scene} scene - The scene this projectile belongs to
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {string} id - The projectile's unique ID
     * @param {string} playerId - The ID of the player who fired this projectile
     * @param {number} velocityX - The x velocity
     * @param {number} velocityY - The y velocity
     */
    constructor(scene, x, y, id, playerId, velocityX, velocityY) {
        this.scene = scene;
        this.id = id;
        this.playerId = playerId;
        
        // Create physics sprite for collision detection
        this.sprite = scene.physics.add.sprite(x, y, null);
        this.sprite.body.setSize(16, 16);
        this.sprite.setVisible(false);
        
        // Set properties on sprite for collision detection
        this.sprite.id = id;
        this.sprite.playerId = playerId;
        
        // Set velocity from server or passed parameters
        this.sprite.setVelocity(velocityX, velocityY);
        
        // Configure physics body
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.onWorldBounds = true;
        
        // Create visual elements
        this.visualContainer = scene.add.container(x, y);
        
        // Main projectile circle
        this.visualSprite = scene.add.circle(0, 0, 8, 0xff0000);
        this.visualContainer.add(this.visualSprite);
        
        // Add border for better visibility
        this.border = scene.add.circle(0, 0, 8, 0x000000, 0);
        this.border.setStrokeStyle(2, 0xffffff);
        this.visualContainer.add(this.border);
        
        // Add highlight in center
        this.highlight = scene.add.circle(0, 0, 4, 0xffff00);
        this.visualContainer.add(this.highlight);
        
        // Set depth to ensure visibility
        this.visualContainer.setDepth(10);
        
        // Create trail elements
        this.trailElements = [];
        for (let i = 0; i < 5; i++) {
            const trailElement = scene.add.circle(
                x - (i * velocityX * 0.05),
                y - (i * velocityY * 0.05),
                8 * (1 - i * 0.15),
                0xff6600,
                0.6 - (i * 0.1)
            );
            trailElement.setDepth(9);
            this.trailElements.push(trailElement);
        }
        
        // Store previous positions for trail
        this.previousPositions = [{ x, y }];
        
        // Add update callback to sync visual elements with physics body
        this.updateCallback = () => {
            if (!this.sprite || !this.sprite.active) return;
            
            // Update container position to match physics body
            this.visualContainer.x = this.sprite.x;
            this.visualContainer.y = this.sprite.y;
            
            // Store current position for trail
            this.previousPositions.unshift({ x: this.sprite.x, y: this.sprite.y });
            if (this.previousPositions.length > 6) {
                this.previousPositions.pop();
            }
            
            // Update trail positions
            for (let i = 0; i < this.trailElements.length; i++) {
                if (this.previousPositions.length > i + 1) {
                    this.trailElements[i].x = this.previousPositions[i + 1].x;
                    this.trailElements[i].y = this.previousPositions[i + 1].y;
                }
            }
            
            // Rotate the projectile for visual effect
            this.visualContainer.angle += 5;
        };
        
        // Register update callback
        scene.events.on('update', this.updateCallback);
        
        // Set up collision with world bounds
        scene.physics.world.on('worldbounds', (body) => {
            if (body.gameObject === this.sprite) {
                this.destroy();
            }
        });
    }
    
    /**
     * Destroy the projectile and clean up resources
     */
    destroy() {
        // Remove update callback
        if (this.updateCallback) {
            this.scene.events.off('update', this.updateCallback);
        }
        
        // Destroy trail elements
        if (this.trailElements) {
            this.trailElements.forEach(element => {
                if (element) element.destroy();
            });
        }
        
        // Destroy container and all visual elements
        if (this.visualContainer) {
            this.visualContainer.destroy();
        }
        
        // Destroy physics sprite
        if (this.sprite) {
            if (this.sprite.body) {
                this.sprite.body.enable = false;
            }
            this.sprite.destroy();
        }
    }
}