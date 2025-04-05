/**
 * GameConfig class to handle game configuration settings.
 */
class GameConfig {
    // Available character types that match with AnimationManager
    static PLAYER_CHARACTERS = {
        MAGIC: 'magic',
        CHARACTER: 'character',
        DINOSAUR: 'dinosaur'
    };
    
    // The currently selected player character
    static current = {
        playerCharacter: 'dinosaur'
    };
    
    /**
     * Set the current player character type
     * @param {string} characterType - The character type to use
     */
    static setPlayerCharacter(characterType) {
        if (Object.values(GameConfig.PLAYER_CHARACTERS).includes(characterType)) {
            GameConfig.current.playerCharacter = characterType;
        } else {
            console.warn(`Invalid character type: ${characterType}. Using default.`);
            GameConfig.current.playerCharacter = GameConfig.PLAYER_CHARACTERS.CHARACTER;
        }
    }
    
    /**
     * Get the current player character type
     * @returns {string} The current character type
     */
    static getPlayerCharacter() {
        return GameConfig.current.playerCharacter;
    }
    
    /**
     * Returns the game configuration object.
     * @returns {Object} Phaser game configuration
     */
    static getConfig() {
        return {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            // World size is larger than the viewport
            worldWidth: 1600,
            worldHeight: 1600,
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