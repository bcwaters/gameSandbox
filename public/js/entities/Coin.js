/**
 * Coin class representing a collectible coin
 * Simple implementation ensuring visual representation works in all cases
 */
class Coin {
    /**
     * Create a new coin
     * @param {Phaser.Scene} scene - The scene this coin belongs to
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} size - The size of the coin
     * @param {string} id - The coin's unique ID
     * @param {string} type - The type of coin ('regular' or 'player_drop')
     */
    constructor(scene, x, y, size, id, type = 'regular') {
        this.scene = scene;
        this.id = id;
        this.size = size || 15;
        this.type = type;
        
        // Create the simplest possible sprite for guaranteed visibility
        this.createSimpleCoin(x, y, type);
    }
    
    /**
     * Create a simple coin using basic graphics for guaranteed visibility
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    createSimpleCoin(x, y, type = 'regular') {
        // Create a simple circle for the coin
        const graphics = this.scene.add.graphics();
        
        // Use different colors based on coin type
        if (type === 'player_drop') {
            // Special player-dropped coin (red-gold)
            graphics.fillStyle(0xFFD700, 1); // Gold fill
            graphics.lineStyle(3, 0xFF0000, 1); // Red border (thicker)
            
            // Make it a bit larger for player drops
            this.size = Math.max(this.size, 20);
        } else {
            // Regular coin (gold)
            graphics.fillStyle(0xFFD700, 1); // Gold fill
            graphics.lineStyle(2, 0xFFA500, 1); // Orange border
        }
        
        graphics.fillCircle(0, 0, this.size/2);
        graphics.strokeCircle(0, 0, this.size/2);
        
        // Generate a texture from the graphics
        const textureName = `coin_${this.id}`;
        graphics.generateTexture(textureName, this.size, this.size);
        graphics.destroy();
        
        // Create the actual sprite using the generated texture
        this.sprite = this.scene.physics.add.sprite(x, y, textureName);
        this.sprite.coinId = this.id;
        this.sprite.setDepth(5);
        
        // Create a dollar sign in the middle
        this.text = this.scene.add.text(x, y, '$', {
            fontSize: Math.floor(this.size * 0.7) + 'px',
            fontFamily: 'Arial',
            color: '#885000',
            fontStyle: 'bold'
        });
        this.text.setOrigin(0.5);
        this.text.setDepth(6);
        
        // Add a bobbing animation
        this.scene.tweens.add({
            targets: [this.sprite, this.text],
            y: y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add a rotating animation to the coin
        this.scene.tweens.add({
            targets: this.sprite,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        console.log(`Created coin ${this.id} at (${x}, ${y}) with size ${this.size}`);
    }
    
    /**
     * Update the coin's position
     * @param {number} x - The new x coordinate
     * @param {number} y - The new y coordinate
     */
    updatePosition(x, y) {
        if (this.sprite) {
            this.sprite.x = x;
            this.sprite.y = y;
        }
        if (this.text) {
            this.text.x = x;
            this.text.y = y;
        }
    }
    
    /**
     * Create a collection effect
     */
    createCollectionEffect() {
        // Get coin position before destroying it
        const coinX = this.sprite.x;
        const coinY = this.sprite.y;
        
        // Determine if this is a player-dropped coin (adjust particles accordingly)
        const isPlayerDroppedCoin = this.type === 'player_drop';
        const particleCount = isPlayerDroppedCoin ? 20 : 10;
        const particleColor = isPlayerDroppedCoin ? 0xFF5500 : 0xFFD700;
        const scoreValue = isPlayerDroppedCoin ? '+5' : '+1';
        const textColor = isPlayerDroppedCoin ? '#FF5500' : '#FFFF00';
        
        // Create particle effect (small gold/red circles flying outward)
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const particleSize = 2 + Math.random() * 4;
            
            const particle = this.scene.add.circle(
                coinX, 
                coinY, 
                particleSize, 
                particleColor
            );
            
            this.scene.tweens.add({
                targets: particle,
                x: coinX + Math.cos(angle) * speed,
                y: coinY + Math.sin(angle) * speed - 50, // Bias upward
                alpha: 0,
                scale: 0.5,
                duration: 600,
                onComplete: () => particle.destroy()
            });
        }
        
        // Create score text that floats up
        const scoreText = this.scene.add.text(
            coinX, 
            coinY - 10, 
            scoreValue, 
            {
                fontSize: isPlayerDroppedCoin ? '24px' : '18px',
                fontStyle: 'bold',
                fill: textColor,
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        scoreText.setOrigin(0.5);
        
        // Animate score text
        this.scene.tweens.add({
            targets: scoreText,
            y: scoreText.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => scoreText.destroy()
        });
    }
    
    /**
     * Destroy the coin and clean up resources
     * @param {boolean} collected - Whether the coin was collected
     */
    destroy(collected = false) {
        try {
            // Create collection effect if the coin was collected
            if (collected) {
                this.createCollectionEffect();
            }
            
            // Destroy sprite
            if (this.sprite) {
                this.sprite.destroy();
                this.sprite = null;
            }
            
            // Destroy text
            if (this.text) {
                this.text.destroy();
                this.text = null;
            }
            
            console.log(`Destroyed coin ${this.id}, collected: ${collected}`);
        } catch (error) {
            console.error('Error destroying coin:', error);
        }
    }
}