/**
 * AssetLoader class responsible for loading game assets.
 */
class AssetLoader {
    /**
     * Preloads all game assets.
     * @param {Phaser.Scene} scene - The scene to load assets into
     */
    static preloadAssets(scene) {
        console.log('AssetLoader.preloadAssets started');
        try {
            // Load character sprite sheet
            console.log('Loading character sprite sheet');
            scene.load.spritesheet('character', 
                'sprites/character_1.png', 
                { 
                    frameWidth: 18,
                    frameHeight: 20
                }
            );
            
            // Load projectile both as spritesheet and as image for fallback
            console.log('Loading projectile spritesheet');
            scene.load.spritesheet('projectile', 
                'sprites/ball.png', 
                {
                    frameWidth: 99,
                    frameHeight: 99
                }
            );
            
            // Log asset loading events
            scene.load.on('filecomplete', function(key, type, data) {
                console.log(`Asset loaded successfully: ${key} (${type})`);
            });
            
            scene.load.on('loaderror', function(file) {
                console.error(`ERROR loading asset: ${file.key} from ${file.url}`);
            });
            
            // Load the same file as a regular image for fallback
            console.log('Loading projectile fallback image');
            scene.load.image('projectile-img', 'sprites/ball.png');
            
            // Load bullet as an alternative projectile
            console.log('Loading bullet image');
            scene.load.image('bullet', 'sprites/ball.png');
            
            // Load coin asset (using a fallback to an available asset)
            console.log('Loading coin asset');
            try {
                scene.load.image('coin', 'assets/Coins/Gold.png');
            } catch (error) {
                console.warn('Could not load coin asset, will use dynamically generated texture instead:', error);
            }
            
            console.log('All assets queued for loading');
        } catch (error) {
            console.error('ERROR in AssetLoader.preloadAssets:', error);
        }
    }
} 