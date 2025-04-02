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
     * @param {boolean} isOutline - Whether this is just an outline of a destroyed obstacle
     * @param {number} respawnIn - Optional, time in ms until respawn (for outlines)
     */
    constructor(scene, x, y, size, id, health, isOutline = false, respawnIn = 0) {
        this.scene = scene;
        this.id = id;
        this.health = health || 2; // Default to 2 hits to destroy
        this.maxHealth = 2;
        this.isOutline = isOutline;
        this.respawnIn = respawnIn;
        this.respawnTimer = null;
        this.respawnText = null;
        
        // If this is an outline, we don't need a physics body
        if (!isOutline) {
            // Create the physics sprite for solid obstacles
            this.sprite = scene.physics.add.sprite(x, y, null);
            this.sprite.setImmovable(true);
            this.sprite.body.setSize(size, size);
            this.sprite.obstacleId = id; // Store obstacle ID for collision detection
            this.sprite.body.setCircle(size / 2);
        }
        
        // Position for both outlines and normal obstacles
        this.x = x;
        this.y = y;
        this.size = size;
        
        // Create the graphics for the obstacle
        this.graphics = scene.add.graphics();
        this.updateGraphics();
        
        // If this is an outline and respawn time is provided, add a countdown timer
        if (isOutline && respawnIn > 0) {
            this.setupRespawnCounter(respawnIn);
        }
    }
    
    /**
     * Set up a countdown timer for respawn
     * @param {number} respawnTime - Time in ms until respawn
     */
    setupRespawnCounter(respawnTime) {
        // Create the text object for countdown
        this.respawnText = this.scene.add.text(
            this.x, 
            this.y,
            Math.ceil(respawnTime / 1000).toString(),
            {
                fontSize: '16px',
                fontStyle: 'bold',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        this.respawnText.setOrigin(0.5);
        this.respawnText.setDepth(10);
        
        // Initial remaining time
        this.respawnIn = respawnTime;
        this.lastUpdateTime = Date.now();
        
        // Update the counter every second
        this.respawnTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: this.updateRespawnCounter,
            callbackScope: this,
            loop: true
        });
    }
    
    /**
     * Update the respawn countdown timer
     */
    updateRespawnCounter() {
        // Calculate new remaining time
        const now = Date.now();
        const delta = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        
        this.respawnIn -= delta;
        
        if (this.respawnIn <= 0) {
            // Time's up, stop the counter
            if (this.respawnTimer) {
                this.respawnTimer.remove();
                this.respawnTimer = null;
            }
            
            if (this.respawnText) {
                this.respawnText.destroy();
                this.respawnText = null;
            }
            return;
        }
        
        // Update the text
        if (this.respawnText) {
            const secondsLeft = Math.ceil(this.respawnIn / 1000);
            this.respawnText.setText(secondsLeft.toString());
        }
    }
    
    /**
     * Update the obstacle's graphics based on its health or outline status
     */
    updateGraphics() {
        if (!this.graphics) return;
        
        this.graphics.clear();
        
        // Access position directly if this is an outline
        const posX = this.sprite ? this.sprite.x : this.x;
        const posY = this.sprite ? this.sprite.y : this.y;
        const halfSize = this.size / 2;
        
        if (this.isOutline) {
            // Draw as a dashed outline to show where a block was
            this.graphics.lineStyle(2, 0xFFFFFF, 0.7);
            
            // Draw a dashed border by manually creating line segments
            const segments = 16; // Number of dash segments
            const segmentLength = (this.size * 4) / segments;
            const dashLength = segmentLength * 0.6;
            const gapLength = segmentLength - dashLength;
            
            // Draw dashed rect
            for (let i = 0; i < segments; i++) {
                const startPercent = i / segments;
                const endPercent = startPercent + (dashLength / (this.size * 4));
                
                // Draw each side of the rectangle as dashed lines
                this.drawDashedRectSegment(posX, posY, halfSize, startPercent, endPercent);
            }
        } else {
            // Choose color based on health for normal obstacles
            let fillColor;
            if (this.health <= 0) {
                fillColor = 0xFF0000; // Red for destroyed
            } else if (this.health === 1) {
                fillColor = 0xFFAA00; // Orange for damaged
            } else {
                fillColor = 0x888888; // Gray for full health
            }
            
            // Draw obstacle as a box with border
            this.graphics.fillStyle(fillColor, 0.8);
            this.graphics.lineStyle(2, 0x000000, 1);
            
            this.graphics.fillRect(posX - halfSize, posY - halfSize, 
                                   this.size, this.size);
            this.graphics.strokeRect(posX - halfSize, posY - halfSize, 
                                     this.size, this.size);
            
            // Add a little pattern inside
            this.graphics.lineStyle(1, 0x000000, 0.5);
            
            // Horizontal lines
            for (let i = 1; i < 3; i++) {
                const y = posY - halfSize + i * (this.size / 3);
                this.graphics.beginPath();
                this.graphics.moveTo(posX - halfSize, y);
                this.graphics.lineTo(posX + halfSize, y);
                this.graphics.closePath();
                this.graphics.strokePath();
            }
            
            // Vertical lines
            for (let i = 1; i < 3; i++) {
                const x = posX - halfSize + i * (this.size / 3);
                this.graphics.beginPath();
                this.graphics.moveTo(x, posY - halfSize);
                this.graphics.lineTo(x, posY + halfSize);
                this.graphics.closePath();
                this.graphics.strokePath();
            }
        }
    }
    
    /**
     * Draw a segment of a dashed rectangle outline
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} halfSize - Half the size of the rectangle
     * @param {number} startPercent - Start position (0-1)
     * @param {number} endPercent - End position (0-1)
     */
    drawDashedRectSegment(x, y, halfSize, startPercent, endPercent) {
        const perimeter = 8 * halfSize; // Total perimeter length
        const startDist = startPercent * perimeter;
        const endDist = endPercent * perimeter;
        
        // Calculate which side of the rectangle we're on
        // and the position on that side
        let startX, startY, endX, endY;
        
        this.calculateDashCoordinates(x, y, halfSize, startDist, perimeter, (sx, sy) => {
            startX = sx;
            startY = sy;
        });
        
        this.calculateDashCoordinates(x, y, halfSize, endDist, perimeter, (ex, ey) => {
            endX = ex;
            endY = ey;
        });
        
        // Draw the line segment
        this.graphics.beginPath();
        this.graphics.moveTo(startX, startY);
        this.graphics.lineTo(endX, endY);
        this.graphics.strokePath();
    }
    
    /**
     * Calculate coordinates for a point on a rectangle perimeter
     * @param {number} centerX - Center X of the rectangle
     * @param {number} centerY - Center Y of the rectangle
     * @param {number} halfSize - Half the size of the rectangle
     * @param {number} distance - Distance along the perimeter
     * @param {number} perimeter - Total perimeter length
     * @param {Function} callback - Function to call with the coordinates
     */
    calculateDashCoordinates(centerX, centerY, halfSize, distance, perimeter, callback) {
        // Determine which side of the rectangle we're on based on the distance
        const sideLength = 2 * halfSize;
        
        // Top side
        if (distance < sideLength) {
            callback(centerX - halfSize + distance, centerY - halfSize);
        }
        // Right side
        else if (distance < 2 * sideLength) {
            callback(centerX + halfSize, centerY - halfSize + (distance - sideLength));
        }
        // Bottom side
        else if (distance < 3 * sideLength) {
            callback(centerX + halfSize - (distance - 2 * sideLength), centerY + halfSize);
        }
        // Left side
        else {
            callback(centerX - halfSize, centerY + halfSize - (distance - 3 * sideLength));
        }
    }
    
    /**
     * Take a hit and update visuals
     * @param {number} damage - The amount of damage to take
     * @returns {boolean} Whether the obstacle was destroyed
     */
    takeHit(damage = 1) {
        // Outlines can't be hit
        if (this.isOutline) return false;
        
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
        // Skip effects for outlines
        if (this.isOutline) return;
        
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
        
        // Get position - either from sprite or direct properties
        const posX = this.sprite ? this.sprite.x : this.x;
        const posY = this.sprite ? this.sprite.y : this.y;
        
        // Create simple particles instead of using particle system
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const particle = this.scene.add.circle(
                posX,
                posY,
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
        // Skip effects for outlines
        if (this.isOutline) return;
        
        // Get position
        const posX = this.sprite ? this.sprite.x : this.x;
        const posY = this.sprite ? this.sprite.y : this.y;
        
        // Create simple explosion effect with sprites
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            const size = 3 + Math.random() * 5;
            const particle = this.scene.add.circle(
                posX,
                posY,
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
            if (this.sprite) {
                this.sprite.x = x;
                this.sprite.y = y;
            }
            this.x = x;
            this.y = y;
        }
        
        if (health !== undefined && health !== this.health && !this.isOutline) {
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
        // Create destruction effect before destroying (skip for outlines)
        if (!this.isOutline) {
            this.createDestructionEffect();
        }
        
        // Clean up respawn timer if it exists
        if (this.respawnTimer) {
            this.respawnTimer.remove();
            this.respawnTimer = null;
        }
        
        // Clean up respawn text if it exists
        if (this.respawnText) {
            this.respawnText.destroy();
            this.respawnText = null;
        }
        
        // Destroy graphics
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
        
        // Destroy sprite (only for solid obstacles)
        if (this.sprite) {
            if (this.sprite.body) {
                this.sprite.body.enable = false;
            }
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}