/**
 * Obstacle class representing a destructible block
 */
class Obstacle {
    /**
     * Create a new obstacle
     * @param {Phaser.Scene} scene - The scene this obstacle belongs to
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} size - The size of the obstacle
     * @param {string} id - The obstacle's unique ID
     * @param {number} health - The obstacle's health points
     */
    constructor(scene, x, y, size, id, health) {
        this.scene = scene;
        this.id = id;
        this.health = health || 2; // Default to 2 hits to destroy
        this.maxHealth = 2;
        
        // Create the physics sprite
        this.sprite = scene.physics.add.sprite(x, y, null);
        this.sprite.setImmovable(true);
        this.sprite.body.setSize(size, size);
        this.sprite.obstacleId = id; // Store obstacle ID for collision detection
        this.sprite.body.setCircle(size / 2);
        
        // Create the graphics for the obstacle
        this.graphics = scene.add.graphics();
        this.updateGraphics();
    }
    
    /**
     * Update the obstacle's graphics based on its health
     */
    updateGraphics() {
        if (!this.graphics) return;
        
        this.graphics.clear();
        
        // Choose color based on health
        let fillColor;
        if (this.health <= 0) {
            fillColor = 0xFF0000; // Red for destroyed
        } else if (this.health === 1) {
            fillColor = 0xFFAA00; // Orange for damaged
        } else {
            fillColor = 0x888888; // Gray for full health
        }
        
        // Draw obstacle as a gray box with border
        this.graphics.fillStyle(fillColor, 0.8);
        this.graphics.lineStyle(2, 0x000000, 1);
        
        // Draw based on sprite position
        const halfSize = this.sprite.body.width / 2;
        this.graphics.fillRect(this.sprite.x - halfSize, this.sprite.y - halfSize, 
                               this.sprite.body.width, this.sprite.body.height);
        this.graphics.strokeRect(this.sprite.x - halfSize, this.sprite.y - halfSize, 
                                 this.sprite.body.width, this.sprite.body.height);
        
        // Add a little pattern inside
        this.graphics.lineStyle(1, 0x000000, 0.5);
        
        // Horizontal lines
        for (let i = 1; i < 3; i++) {
            const y = this.sprite.y - halfSize + i * (this.sprite.body.height / 3);
            this.graphics.beginPath();
            this.graphics.moveTo(this.sprite.x - halfSize, y);
            this.graphics.lineTo(this.sprite.x + halfSize, y);
            this.graphics.closePath();
            this.graphics.strokePath();
        }
        
        // Vertical lines
        for (let i = 1; i < 3; i++) {
            const x = this.sprite.x - halfSize + i * (this.sprite.body.width / 3);
            this.graphics.beginPath();
            this.graphics.moveTo(x, this.sprite.y - halfSize);
            this.graphics.lineTo(x, this.sprite.y + halfSize);
            this.graphics.closePath();
            this.graphics.strokePath();
        }
    }
    
    /**
     * Take a hit and update visuals
     * @param {number} damage - The amount of damage to take
     * @returns {boolean} Whether the obstacle was destroyed
     */
    takeHit(damage = 1) {
        this.health -= damage;
        
        if (this.health < 0) {
            this.health = 0;
        }
        
        // Update the obstacle's appearance
        this.updateGraphics();
        
        // Create a hit effect
        this.createHitEffect();
        
        // Return whether the obstacle is destroyed
        return this.health <= 0;
    }
    
    /**
     * Create a visual hit effect
     */
    createHitEffect() {
        // Flash the obstacle
        this.scene.tweens.add({
            targets: this.graphics,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (this.graphics) {
                    this.graphics.alpha = 1;
                }
            }
        });
        
        // Create simple particles instead of using particle system
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                3,
                0xffffff,
                0.8
            );
            
            // Make particles move outward
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 500,
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    /**
     * Create a destruction effect
     */
    createDestructionEffect() {
        // Create simple explosion effect with sprites
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            const size = 3 + Math.random() * 5;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                size,
                0xff8800,
                0.9
            );
            
            // Make particles move outward
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 800,
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    /**
     * Update obstacle position from server
     * @param {number} x - The new x coordinate
     * @param {number} y - The new y coordinate
     * @param {number} health - The new health value
     */
    updateFromServer(x, y, health) {
        if (x !== undefined && y !== undefined) {
            this.sprite.x = x;
            this.sprite.y = y;
        }
        
        if (health !== undefined && health !== this.health) {
            const wasDestroyed = this.health > 0 && health <= 0;
            this.health = health;
            this.updateGraphics();
            
            if (wasDestroyed) {
                this.createDestructionEffect();
            }
        }
    }
    
    /**
     * Destroy the obstacle and clean up resources
     */
    destroy() {
        // Create destruction effect before destroying
        this.createDestructionEffect();
        
        // Destroy graphics
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
        
        // Destroy sprite
        if (this.sprite) {
            if (this.sprite.body) {
                this.sprite.body.enable = false;
            }
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}