/**
 * GameConfig class to handle game configuration settings.
 */
class GameConfig {
    /**
     * Returns the game configuration object.
     * @returns {Object} Phaser game configuration
     */
    static getConfig() {
        return {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            scene: {
                preload: preload,
                create: create,
                update: update
            },
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                    gravity: { y: 0 }
                }
            }
        };
    }
} 