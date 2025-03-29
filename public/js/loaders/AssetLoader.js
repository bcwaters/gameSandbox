/**
 * AssetLoader class responsible for loading game assets.
 */
class AssetLoader {
    /**
     * Preloads all game assets.
     * @param {Phaser.Scene} scene - The scene to load assets into
     */
    static preloadAssets(scene) {
        // Load character sprite sheet
        scene.load.spritesheet('character', 
            'sprites/character_1.png', 
            { 
                frameWidth: 18,
                frameHeight: 20
            }
        );
        
        // Load projectile as spritesheet
        scene.load.spritesheet('projectile', 
            'sprites/ball.png', 
            {
                frameWidth: 99,
                frameHeight: 99
            }
        );
    }
} 