/**
 * AnimationManager class responsible for creating and managing game animations.
 */
class AnimationManager {
    /**
     * Creates all character and projectile animations.
     * @param {Phaser.Scene} scene - The scene to create animations in
     */
    static createAnimations(scene) {
        // Row 1: Up animation
        scene.anims.create({
            key: 'walk-up',
            frames: scene.anims.generateFrameNumbers('character', { 
                start: 0, 
                end: 3
            }),
            frameRate: 10,
            repeat: -1
        });

        // Row 2: Right animation
        scene.anims.create({
            key: 'walk-right',
            frames: scene.anims.generateFrameNumbers('character', { 
                start: 4, 
                end: 7
            }),
            frameRate: 10,
            repeat: -1
        });

        // Row 3: Down animation
        scene.anims.create({
            key: 'walk-down',
            frames: scene.anims.generateFrameNumbers('character', { 
                start: 8, 
                end: 11
            }),
            frameRate: 10,
            repeat: -1
        });

        // Row 4: Left animation
        scene.anims.create({
            key: 'walk-left',
            frames: scene.anims.generateFrameNumbers('character', { 
                start: 12, 
                end: 15
            }),
            frameRate: 10,
            repeat: -1
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
} 