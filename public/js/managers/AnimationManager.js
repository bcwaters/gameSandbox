/**
 * AnimationManager class responsible for creating and managing game animations.
 */
class AnimationManager {
    /**
     * Animation character types - helps organize and reference different animation sets
     */
    static CHARACTER_TYPES = {
        MAGIC: 'magic',
        CHARACTER: 'character',
        DINOSAUR: 'dinosaur'
    };

    /**
     * Animation frame configurations for different character types
     */
    static ANIMATION_CONFIGS = {
        // Magic sprite animations
        [AnimationManager.CHARACTER_TYPES.MAGIC]: {
            texture: 'magic',
            animations: {
                'walk-up': { start: 0, end: 4 },
                'walk-right': { start: 5, end: 9 },
                'walk-down': { start: 10, end: 14 },
                'walk-left': { start: 15, end: 19 }
            },
            frameRate: 10,
            physicsOffset: { x: 2, y: 6 },
            physicsSize: { width: 12, height: 12 }
        },
        // Character animations
        [AnimationManager.CHARACTER_TYPES.CHARACTER]: {
            texture: 'character',
            animations: {
                'walk-up': { start: 0, end: 3 },
                'walk-right': { start: 4, end: 7 },
                'walk-down': { start: 8, end: 11 },
                'walk-left': { start: 12, end: 15 }
            },
            frameRate: 10,
            physicsOffset: { x: 2, y: 6 },
            physicsSize: { width: 12, height: 12 }
        },
        // Dinosaur animations
        [AnimationManager.CHARACTER_TYPES.DINOSAUR]: {
            texture: 'dinosaur',
            animations: {
                'walk-up': { start: 8, end: 11 },
                'walk-right': { start: 4, end: 7 },
                'walk-down': { start: 0, end: 3 },
                'walk-left': { start: 12, end: 15 }
            },
            frameRate: 10,
            physicsOffset: { x: 8, y: 16 },
            physicsSize: { width: 16, height: 16 }
        }
    };

    /**
     * Creates all character and projectile animations.
     * @param {Phaser.Scene} scene - The scene to create animations in
     */
    static createAnimations(scene) {
        // Create animations for each character type
        Object.values(AnimationManager.CHARACTER_TYPES).forEach(charType => {
            const config = AnimationManager.ANIMATION_CONFIGS[charType];
            
            // Skip if the config doesn't exist
            if (!config) return;
            
            // Create each animation direction for this character type
            Object.entries(config.animations).forEach(([direction, frames]) => {
                // Create animation with character-specific key
                const animKey = `${direction}-${charType}`;
                scene.anims.create({
                    key: animKey,
                    frames: scene.anims.generateFrameNumbers(config.texture, { 
                        start: frames.start, 
                        end: frames.end
                    }),
                    frameRate: config.frameRate || 10,
                    repeat: -1
                });
            });
        });
        
        // Projectile animation - ensure we have the right frames
        scene.anims.create({
            key: 'projectile-spin',
            frames: scene.anims.generateFrameNumbers('projectile', { 
                start: 0,
                end: 2
            }),
            frameRate: 10,
            repeat: -1
        });
        
        // Add a simple fallback animation in case the spritesheet doesn't work
        scene.anims.create({
            key: 'projectile-default',
            frames: [ { key: 'projectile', frame: 0 } ],
            frameRate: 10
        });
    }

    /**
     * Get animation configuration for a specific character type
     * @param {string} charType - Character type from CHARACTER_TYPES
     * @returns {Object} Animation configuration object
     */
    static getAnimationConfig(charType) {
        return AnimationManager.ANIMATION_CONFIGS[charType] || AnimationManager.ANIMATION_CONFIGS[AnimationManager.CHARACTER_TYPES.CHARACTER];
    }
}