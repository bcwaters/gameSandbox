/**
 * MainScene - The main game scene
 */
// Define MainScene as a global class and ensure it's loaded before game.js
console.log('Defining MainScene class...');
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        this.player = null;
        this.otherPlayers = {};
        this.projectiles = {};
        this.obstacles = {};
        this.coins = {};
        this.lastDirection = 'down';
        this.isDefeated = false;
        this.lastSwordTime = 0;
        this.swordCooldown = 300;
        this.playersHitBySword = {};
        this.obstaclesHitBySword = {};
        this.playerCircle = null; // Store the player's active circle
        this.otherPlayerCircles = {}; // Store circles from other players
        
        // Define SimplexNoise as a class within MainScene
        this.SimplexNoise = class SimplexNoise {
            constructor(randomOrSeed) {
                let random;
                if (typeof randomOrSeed == 'function') {
                    random = randomOrSeed;
                }
                else if (randomOrSeed) {
                    random = this.alea(randomOrSeed);
                }
                else {
                    random = Math.random;
                }
                
                this.p = this.buildPermutationTable(random);
                this.perm = new Uint8Array(512);
                this.permMod12 = new Uint8Array(512);
                for (let i = 0; i < 512; i++) {
                    this.perm[i] = this.p[i & 255];
                    this.permMod12[i] = this.perm[i] % 12;
                }
                
                // Initialize grad3 array
                this.grad3 = [1,1,0,-1,1,0,1,-1,0,-1,-1,0,
                             1,0,1,-1,0,1,1,0,-1,-1,0,-1,
                             0,1,1,0,-1,1,0,1,-1,0,-1,-1];
            }

            noise2D(xin, yin) {
                return 0;
                // Skew the input space to determine which simplex cell we're in
                const F2 = 0.5 * (Math.sqrt(3) - 1);
                const s = (xin + yin) * F2; // Hairy factor for 2D
                const i = Math.floor(xin + s);
                const j = Math.floor(yin + s);
                
                const G2 = (3 - Math.sqrt(3)) / 6;
                const t = (i + j) * G2;
                const X0 = i - t; // Unskew the cell origin back to (x,y) space
                const Y0 = j - t;
                const x0 = xin - X0; // The x,y distances from the cell origin
                const y0 = yin - Y0;
                
                // Determine which simplex we are in
                let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
                if (x0 > y0) { i1 = 1; j1 = 0; } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
                else { i1 = 0; j1 = 1; } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
                
                // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
                // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
                // c = (3-sqrt(3))/6
                const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
                const y1 = y0 - j1 + G2;
                const x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
                const y2 = y0 - 1 + 2 * G2;
                
                // Work out the hashed gradient indices of the three simplex corners
                const ii = i & 255;
                const jj = j & 255;
                
                // Calculate the contribution from the three corners
                let t0 = 0.5 - x0 * x0 - y0 * y0;
                let n0 = 0;
                if (t0 >= 0) {
                    const gi0 = this.permMod12[ii + this.perm[jj]] * 3;
                    t0 *= t0;
                    n0 = t0 * t0 * (this.grad3[gi0] * x0 + this.grad3[gi0 + 1] * y0);
                }
                
                let t1 = 0.5 - x1 * x1 - y1 * y1;
                let n1 = 0;
                if (t1 >= 0) {
                    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3;
                    t1 *= t1;
                    n1 = t1 * t1 * (this.grad3[gi1] * x1 + this.grad3[gi1 + 1] * y1);
                }
                
                let t2 = 0.5 - x2 * x2 - y2 * y2;
                let n2 = 0;
                if (t2 >= 0) {
                    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3;
                    t2 *= t2;
                    n2 = t2 * t2 * (this.grad3[gi2] * x2 + this.grad3[gi2 + 1] * y2);
                }
                
                // Add contributions from each corner to get the final noise value.
                // The result is scaled to return values in the interval [-1,1].
                return 70 * (n0 + n1 + n2);
            }

            buildPermutationTable(random) {
                const p = new Uint8Array(256);
                for (let i = 0; i < 256; i++) {
                    p[i] = i;
                }
                
                for (let i = 0; i < 255; i++) {
                    const r = i + ~~(random() * (256 - i));
                    const aux = p[i];
                    p[i] = p[r];
                    p[r] = aux;
                }
                
                return p;
            }

            alea(seed) {
                let s0 = 0;
                let s1 = 0;
                let s2 = 0;
                let c = 1;
                
                if (seed === undefined) {
                    seed = Math.random();
                }
                
                const mash = function(data) {
                    data = data.toString();
                    for (let i = 0; i < data.length; i++) {
                        const n = data.charCodeAt(i);
                        s0 -= mash.mash(n);
                        if (s0 < 0) s0 += 1;
                        s1 -= mash.mash(n);
                        if (s1 < 0) s1 += 1;
                        s2 -= mash.mash(n);
                        if (s2 < 0) s2 += 1;
                    }
                };
                
                mash.mash = function(data) {
                    const n = data.toString();
                    for (let i = 0; i < n.length; i++) {
                        c += n.charCodeAt(i);
                        const h = c * 0.02519603282416938;
                        c = h >>> 0;
                        const k = h - c;
                        s0 = s1;
                        s1 = s2;
                        s2 = k - c;
                        if (s2 < 0) s2 += 1;
                    }
                    return s2;
                };
                
                mash(seed);
                return function() {
                    const t = 2091639 * s0 + c * 2.3283064365386963e-10;
                    s0 = s1;
                    s1 = s2;
                    return s2 = t - (c = t | 0);
                };
            }
        };
        
        console.log('MainScene constructor completed');
    }
    
    preload() {
        console.log('MainScene preload started');
        try {
            // Load assets
            console.log('Loading game assets via AssetLoader');
            AssetLoader.preloadAssets(this);
            
            console.log('Loading sound effects');
            // Load sound effects
            this.load.audio('shoot', 'sounds/shoot.mp3');
            this.load.audio('hit', 'sounds/hit.mp3');
            this.load.audio('sword-slash', 'sounds/sword-slash.mp3');
            this.load.audio('coin-collect', 'sounds/coin.mp3');
            console.log('Sound effects loaded');
        } catch (error) {
            console.error('ERROR in MainScene preload:', error);
        }
        console.log('MainScene preload completed');
    }
    
    create() {
        console.log('MainScene create function started');
        try {
            // Hide default cursor
            this.input.setDefaultCursor('none');
            
            // Create a custom crosshair
            this.createCustomCrosshair();
            
            // Initialize networking
            console.log('Creating SocketManager instance');
            this.socketManager = new SocketManager();
            console.log('SocketManager instance created');
            
            // Handle connection events
            console.log('Setting up socket connection event handlers');
            this.socketManager.on('connect', () => {
                console.log('MainScene: Connected to server');
                this.showConnectionStatus(true);
            });
            
            this.socketManager.on('disconnect', (reason) => {
                console.log('MainScene: Disconnected from server, reason:', reason);
                this.showConnectionStatus(false, reason);
            });
            
            this.socketManager.on('connect_error', (error) => {
                console.error('MainScene: Connection error', error);
                this.showConnectionStatus(false, 'Connection error');
            });
            console.log('Socket event handlers setup completed');
        
  
            // Create animations
            console.log('Creating animations via AnimationManager');
            AnimationManager.createAnimations(this);
            console.log('Animations created successfully');
            
            // Create physics groups
            console.log('Creating physics groups');
            this.otherPlayersGroup = this.physics.add.group();
            this.projectilesGroup = this.physics.add.group({
                classType: Phaser.Physics.Arcade.Sprite,
                maxSize: 20,
                runChildUpdate: true
            });
            this.obstaclesGroup = this.physics.add.group({
                immovable: true
            });
            
            // Re-enable coins
            this.coinsGroup = this.physics.add.group();
            console.log('Physics groups created');
            
            // Initialize sound effects
            console.log('Initializing sound effects');
            this.initSounds();
            console.log('Sound effects initialized');
            
            // Setup keyboard input
            console.log('Setting up keyboard input');
            this.setupInput();
            console.log('Keyboard input setup completed');
            
            // Setup socket events
            console.log('Setting up socket event handlers');
            this.setupSocketEvents();
            console.log('Socket event handlers setup completed');
            
            // Create UI first so we can get its height
            console.log('Creating user interface');
            this.ui = new UserInterface(this);
            console.log('User interface created');
            
            // Set world bounds explicitly - adjust for UI height and use larger world size with 30px padding
            console.log('Setting world bounds adjusted for UI and padding');
            const uiHeight = this.ui.UI_HEIGHT;
            const gameWidth = this.scale.width;
            const gameHeight = this.scale.height;
            const worldWidth = 1600;  // Larger world width
            const worldHeight = 1600; // Larger world height
            const PADDING = 30; // Add padding around the world
            console.log(`Game dimensions: ${gameWidth}x${gameHeight}, World dimensions: ${worldWidth}x${worldHeight}, Padding: ${PADDING}px`);
            
            // Set physics world bounds with padding
            this.physics.world.setBounds(PADDING, uiHeight + PADDING, worldWidth - (PADDING * 2), worldHeight - uiHeight - (PADDING * 2));
            
            // Create visual barriers at the edges of the playable area
            this.createWorldBarrier(PADDING, uiHeight + PADDING, worldWidth - (PADDING * 2), 5, 0x888888); // Top
            this.createWorldBarrier(PADDING, worldHeight - PADDING, worldWidth - (PADDING * 2), 5, 0x888888); // Bottom
            this.createWorldBarrier(PADDING, uiHeight + PADDING, 5, worldHeight - uiHeight - (PADDING * 2), 0x888888); // Left
            this.createWorldBarrier(worldWidth - PADDING, uiHeight + PADDING, 5, worldHeight - uiHeight - (PADDING * 2), 0x888888); // Right
            
            // Create a terrain-like background
            console.log('Creating terrain background');
            
            // Full background (base ground layer)
            const fullBackground = this.add.rectangle(
                worldWidth / 2, // Center horizontally in world
                uiHeight + (worldHeight - uiHeight) / 2, // Center of game area (below UI)
                worldWidth, // Full world width
                worldHeight - uiHeight, // World height (adjusted for UI)
                0x164814 // Dark green base (grass)
            );
            fullBackground.setDepth(-30);
            
            // Create a terrain grid
            const gridSize = 40; // Size of each terrain "cell"
            const playableAreaWidth = worldWidth - (PADDING * 2);
            const playableAreaHeight = worldHeight - uiHeight - (PADDING * 2);
            const startX = PADDING;
            const startY = uiHeight + PADDING;
            
            // Create paths for more organized terrain
            const pathsGraphics = this.add.graphics();
            pathsGraphics.fillStyle(0x795548, 0.7); // Brown dirt color for paths
            pathsGraphics.setDepth(-26);
            
            // Create horizontal path
            const horizontalPathY = startY + Math.floor(playableAreaHeight / 2);
            pathsGraphics.fillRect(startX, horizontalPathY - 20, playableAreaWidth, 40);
            
            // Create vertical path
            const verticalPathX = startX + Math.floor(playableAreaWidth / 2);
            pathsGraphics.fillRect(verticalPathX - 20, startY, 40, playableAreaHeight);
            
            // Create a central circular area where paths meet
            const centerX = startX + Math.floor(playableAreaWidth / 2);
            const centerY = startY + Math.floor(playableAreaHeight / 2);
            pathsGraphics.fillCircle(centerX, centerY, 80);
            
            // Generate noise-based terrain
            const simplexNoise = new this.SimplexNoise();
            
            // // Generate different types of terrain cells
            // for (let x = 0; x < playableAreaWidth; x += gridSize) {
            //     for (let y = 0; y < playableAreaHeight; y += gridSize) {
            //         // Position of the current cell
            //         const cellX = startX + x + gridSize/2;
            //         const cellY = startY + y + gridSize/2;
                    
            //         // Size variation for natural look
            //         const sizeVariation = 0.8 + Math.random() * 0.4;
            //         const cellWidth = gridSize * sizeVariation;
            //         const cellHeight = gridSize * sizeVariation;
                    
            //         // Use noise to create natural terrain clusters
            //         const noiseValue = (simplexNoise.noise2D(x * 0.01, y * 0.01) + 1) / 2;
                    
            //         // Check if we're on or near a path
            //         const distToHorizPath = Math.abs(cellY - horizontalPathY);
            //         const distToVertPath = Math.abs(cellX - verticalPathX);
            //         const distToCenter = Math.sqrt(Math.pow(cellX - centerX, 2) + Math.pow(cellY - centerY, 2));
            //         const onPath = distToHorizPath < 25 || distToVertPath < 25 || distToCenter < 85;
                    
            //         // Skip cells that are on the paths
            //         if (onPath) continue;
                    
            //         // Create different terrain types based on noise value
            //         if (noiseValue < 0.3) {
            //             // Standard grass (slightly varied)
            //             const grassShade = Math.random() * 0.2;
            //             const color = Phaser.Display.Color.HSVToRGB(0.3, 0.3 + grassShade, 0.3 + grassShade).color;
            //             const grass = this.add.rectangle(cellX, cellY, cellWidth, cellHeight, color);
            //             grass.setDepth(-25);
            //             grass.setAlpha(0.5 + Math.random() * 0.5);
            //         } else if (noiseValue < 0.6) {
            //             // Dirt patches
            //             const dirtColor = Phaser.Display.Color.HSVToRGB(0.08, 0.3 + Math.random() * 0.1, 0.2 + Math.random() * 0.1).color;
            //             const dirt = this.add.rectangle(cellX, cellY, cellWidth, cellHeight, dirtColor);
            //             dirt.setDepth(-24);
            //             dirt.setAlpha(0.6 + Math.random() * 0.4);
            //         } else if (noiseValue < 0.8) {
            //             // Scattered rocks
            //             const rockColor = Phaser.Display.Color.HSVToRGB(0, 0, 0.2 + Math.random() * 0.15).color;
            //             const rock = this.add.circle(cellX, cellY, cellWidth/3, rockColor);
            //             rock.setDepth(-22);
            //         } else if (noiseValue < 0.95 && distToCenter > 200) {
            //             // Water puddles, but not near the center
            //             const waterColor = Phaser.Display.Color.HSVToRGB(0.6, 0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.2).color;
            //             const water = this.add.circle(cellX, cellY, cellWidth/2, waterColor);
            //             water.setDepth(-23);
            //             water.setAlpha(0.4 + Math.random() * 0.3);
            //         } else {
            //             // Dense vegetation
            //             const vegColor = Phaser.Display.Color.HSVToRGB(0.3, 0.8, 0.3 + Math.random() * 0.2).color;
            //             const veg = this.add.rectangle(cellX, cellY, cellWidth * 0.8, cellHeight * 0.8, vegColor);
            //             veg.setDepth(-22);
            //             veg.setAlpha(0.7 + Math.random() * 0.3);
            //         }
            //     }
            // }
            
            // Add grid lines for playable area (optional, more subtle)
            const gridGraphics = this.add.graphics();
            gridGraphics.lineStyle(1, 0x333333, 0.1);
            
            // Draw horizontal lines
            for (let y = startY; y <= startY + playableAreaHeight; y += gridSize) {
                gridGraphics.moveTo(startX, y);
                gridGraphics.lineTo(startX + playableAreaWidth, y);
            }
            
            // Draw vertical lines
            for (let x = startX; x <= startX + playableAreaWidth; x += gridSize) {
                gridGraphics.moveTo(x, startY);
                gridGraphics.lineTo(x, startY + playableAreaHeight);
            }
            
            gridGraphics.setDepth(-20);
            
            // Add decorative terrain elements (grass tufts, flowers, stones)
            for (let i = 0; i < 200; i++) {
                // Random position within the playable area
                const x = startX + Math.random() * playableAreaWidth;
                const y = startY + Math.random() * playableAreaHeight;
                
                // Determine what decorative element to create
                const elementType = Math.random();
                
                if (elementType < 0.5) {
                    // // Grass tuft
                    // const grassHeight = 3 + Math.random() * 5;
                    // const grassWidth = 1 + Math.random() * 2;
                    // const grassX = x;
                    // const grassY = y;
                    
                    // const grassGraphics = this.add.graphics();
                    // const grassColor = 0x1d5e1c + Math.floor(Math.random() * 0x111111);
                    // grassGraphics.fillStyle(grassColor, 0.7 + Math.random() * 0.3);
                    
                    // // Draw a few blades for each tuft
                    // for (let blade = 0; blade < 3 + Math.floor(Math.random() * 3); blade++) {
                    //     const bladeX = grassX + Math.random() * 4 - 2;
                    //     const bendDirection = Math.random() > 0.5 ? 1 : -1;
                        
                    //     grassGraphics.beginPath();
                    //     grassGraphics.moveTo(bladeX - grassWidth/2, grassY);
                    //     grassGraphics.lineTo(bladeX + grassWidth/2 * bendDirection, grassY - grassHeight/2);
                    //     grassGraphics.lineTo(bladeX, grassY - grassHeight);
                    //     grassGraphics.lineTo(bladeX - grassWidth/2 * bendDirection, grassY - grassHeight/2);
                    //     grassGraphics.closePath();
                    //     grassGraphics.fill();
                    // }
                    
                    // grassGraphics.setDepth(-15);
                }
                else if (elementType < 0.7) {
                    // Flowers
                    const flowerSize = 2 + Math.random() * 2;
                    
                    // Randomly choose flower color
                    const flowerColors = [0xFFFF99, 0xFF99CC, 0xCC99FF, 0x99CCFF, 0xFFFFFF];
                    const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                    
                    // Create flower petals
                    const flowerGraphics = this.add.graphics();
                    flowerGraphics.fillStyle(flowerColor, 0.8);
                    
                    // Draw 5-6 petals
                    const numPetals = 5 + Math.floor(Math.random() * 2);
                    for (let p = 0; p < numPetals; p++) {
                        const angle = (p / numPetals) * Math.PI * 2;
                        const petalX = x + Math.cos(angle) * flowerSize;
                        const petalY = y + Math.sin(angle) * flowerSize;
                        
                        flowerGraphics.fillCircle(petalX, petalY, flowerSize);
                    }
                    
                    // Add flower center
                    flowerGraphics.fillStyle(0xFFCC00, 1.0);
                    flowerGraphics.fillCircle(x, y, flowerSize * 0.6);
                    
                    flowerGraphics.setDepth(-14);
                }
                else {
                    // Pebbles/small stones
                    const stoneSize = 1 + Math.random() * 3;
                    const stoneColor = 0x666666 + Math.floor(Math.random() * 0x222222);
                    
                    const stone = this.add.circle(x, y, stoneSize, stoneColor);
                    stone.setAlpha(0.5 + Math.random() * 0.5);
                    stone.setDepth(-13);
                }
            }
            
            // Show a text to indicate the game has loaded
            console.log('Creating loading text');
            const loadingText = this.add.text(
                this.cameras.main.width / 2,
                uiHeight + (this.cameras.main.height - uiHeight) / 2, // Center in game area below UI
                'Game loaded! Waiting for players...',
                {
                    fontSize: '24px',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            );
            loadingText.setOrigin(0.5);
            loadingText.setDepth(100);
            
            // Fade out the text after 3 seconds
            this.tweens.add({
                targets: loadingText,
                alpha: 0,
                delay: 3000,
                duration: 1000,
                onComplete: () => loadingText.destroy()
            });
        } catch (error) {
            console.error('ERROR in MainScene create:', error);
            // Try to show error on screen
            try {
                const errorText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    'Error initializing game: ' + error.message,
                    {
                        fontSize: '16px',
                        fill: '#FF0000',
                        backgroundColor: '#000000',
                        padding: { x: 10, y: 10 }
                    }
                );
                errorText.setOrigin(0.5);
                errorText.setDepth(1000);
            } catch (e) {
                console.error('Failed to display error message:', e);
            }
        }
        
        console.log('MainScene create function completed');
    }
    
    initSounds() {
        try {
            this.shootSound = this.sound.add('shoot');
            this.hitSound = this.sound.add('hit');
            this.swordSound = this.sound.add('sword-slash');
            this.coinSound = this.sound.add('coin-collect');
            
            // Add event handlers for when sounds fail to load
            this.sound.once('loaderror', (soundKey, error) => {
                console.error('Error loading sound:', soundKey, error);
            });
            
            // Setup safe play method for each sound
            const sounds = ['shootSound', 'hitSound', 'swordSound', 'coinSound'];
            sounds.forEach(soundName => {
                const originalSound = this[soundName];
                if (originalSound) {
                    // Override the sound's play method with a safe version
                    const originalPlay = originalSound.play.bind(originalSound);
                    originalSound.play = (config) => {
                        try {
                            return originalPlay(config);
                        } catch (error) {
                            console.warn(`Error playing ${soundName}:`, error);
                            return null;
                        }
                    };
                }
            });
        } catch (error) {
            console.error('Error initializing sounds:', error);
            // Set to null to avoid errors when trying to play sounds
            this.shootSound = null;
            this.hitSound = null;
            this.swordSound = null;
            this.coinSound = null;
        }
    }
    
    setupInput() {
        // Setup cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add reload key
        this.reloadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.reloadKey.on('down', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Only reload if we're not at max ammo
            if (this.player && this.player.ammo < this.player.maxAmmo) {
                // Reset ammo to max
                this.player.setAmmo(this.player.maxAmmo);
                this.ui.updateAmmoCounter(this.player.ammo);
                
                // Send reload event to server
                this.socketManager.reloadAmmo();
            }
        });
        
        // Add sword key
        this.swordKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.swordKey.on('down', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Use the sword
            this.useSword();
        });
        
        // Add circle drawing key (Spacebar)
        this.input.keyboard.on('keydown-SPACE', () => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Skip if player is defeated
            if (this.isDefeated) return;
            
            // Get cursor position for the circle
            const mousePointer = this.input.activePointer;
            if (mousePointer) {
                const worldX = mousePointer.worldX;
                const worldY = mousePointer.worldY;
                
                // Draw a circle at the cursor position (send to server)
                this.createPlayerCircle(worldX, worldY);
            }
        });
        
        // Setup mouse click handlers
        this.input.on('pointerdown', (pointer) => {
            // Skip if text input is focused
            if (this.ui.isInputActive()) return;
            
            // Skip if player is defeated
            if (this.isDefeated) return;
            
            // Left click (button 0) - Shoot
            if (pointer.button === 0) {
                // Check if player exists and has ammo
                if (this.player && this.player.ammo > 0) {
                    this.fireProjectile();
                    this.player.setAmmo(this.player.ammo - 1);
                    this.ui.updateAmmoCounter(this.player.ammo);
                }
            }
            // Right click (button 2) - Sword
            else if (pointer.button === 2) {
                this.useSword();
            }
        });
        
        // Prevent the browser context menu on right click
        this.game.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Add mobile touch controls for small screens or mobile devices
        this.setupMobileControls();
        
        // Add WASD movement
        this.wasdKeys = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }
    
    setupMobileControls() {
        // Detect if we're on a mobile device or small screen
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         (window.innerWidth < 800);
        
        if (!isMobile) return;
        
        console.log('Setting up mobile touch controls');
        
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const uiHeight = this.ui ? this.ui.UI_HEIGHT : 50;
        
        // Create transparent buttons for mobile controls
        
        // Movement joystick (left side)
        const joystickRadius = 50;
        const joystickX = joystickRadius + 20;
        const joystickY = gameHeight - joystickRadius - 20;
        
        // Base circle for joystick
        const joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0xffffff, 0.3);
        joystickBase.setDepth(100);
        joystickBase.setScrollFactor(0);
        joystickBase.setInteractive();
        
        // Thumb indicator for joystick
        const joystickThumb = this.add.circle(joystickX, joystickY, joystickRadius/2, 0xffffff, 0.5);
        joystickThumb.setDepth(101);
        joystickThumb.setScrollFactor(0);
        
        // Action buttons (right side) - more spaced out
        const buttonRadius = 40;
        const buttonSpacing = 30; // Increased spacing between buttons
        
        // Shoot button (bottom right)
        const shootButtonX = gameWidth - buttonRadius - 20;
        const shootButtonY = gameHeight - buttonRadius - 20;
        const shootButton = this.add.circle(shootButtonX, shootButtonY, buttonRadius, 0xff0000, 0.3);
        shootButton.setDepth(100);
        shootButton.setScrollFactor(0);
        shootButton.setInteractive();
        
        // Sword button (to the left of shoot button)
        const swordButtonX = shootButtonX - (buttonRadius * 2 + buttonSpacing);
        const swordButtonY = shootButtonY;
        const swordButton = this.add.circle(swordButtonX, swordButtonY, buttonRadius, 0x00ff00, 0.3);
        swordButton.setDepth(100);
        swordButton.setScrollFactor(0);
        swordButton.setInteractive();
        
        // Circle button (above shoot button)
        const circleButtonX = shootButtonX;
        const circleButtonY = shootButtonY - (buttonRadius * 2 + buttonSpacing);
        const circleButton = this.add.circle(circleButtonX, circleButtonY, buttonRadius, 0x0000ff, 0.3);
        circleButton.setDepth(100);
        circleButton.setScrollFactor(0);
        circleButton.setInteractive();
        
        // Reload button (above circle button)
        const reloadButtonX = circleButtonX;
        const reloadButtonY = circleButtonY - (buttonRadius * 2 + buttonSpacing);
        const reloadButton = this.add.circle(reloadButtonX, reloadButtonY, buttonRadius, 0x9900ff, 0.3);
        reloadButton.setDepth(100);
        reloadButton.setScrollFactor(0);
        reloadButton.setInteractive();
        
        // Add text labels to the buttons - larger font for better readability
        const shootLabel = this.add.text(shootButtonX, shootButtonY, 'SHOOT', {
            fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        shootLabel.setDepth(101);
        shootLabel.setScrollFactor(0);
        
        const swordLabel = this.add.text(swordButtonX, swordButtonY, 'SWORD', {
            fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        swordLabel.setDepth(101);
        swordLabel.setScrollFactor(0);
        
        const circleLabel = this.add.text(circleButtonX, circleButtonY, 'CIRCLE', {
            fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        circleLabel.setDepth(101);
        circleLabel.setScrollFactor(0);
        
        const reloadLabel = this.add.text(reloadButtonX, reloadButtonY, 'RELOAD', {
            fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        reloadLabel.setDepth(101);
        reloadLabel.setScrollFactor(0);
        
        // Create a separate floating joystick that follows initial touch
        this.floatingJoystick = true; // Enable floating joystick mode
        
        // Initialize touch states
        this.joystickActive = false;
        this.joystickPointer = null;
        this.joystickInputX = 0;
        this.joystickInputY = 0;
        
        // Set up auto-fire and button indicators
        this.autoFireEnabled = false;
        this.autoFireInterval = null;
        this.buttonStates = {
            shoot: false,
            sword: false,
            circle: false,
            reload: false
        };
        
        // Add direct button handlers (separate from pointer events)
        shootButton.on('pointerdown', () => {
            if (this.canPressShoot) {
                this.buttonStates.shoot = true;
                // Start auto-fire if player has ammo
                this.startAutoFire();
            }
        });
        
        shootButton.on('pointerout', () => {
            this.buttonStates.shoot = false;
            this.stopAutoFire();
        });
        
        shootButton.on('pointerup', () => {
            this.buttonStates.shoot = false;
            this.stopAutoFire();
        });
        
        swordButton.on('pointerdown', () => {
            if (this.canPressSword) {
                this.buttonStates.sword = true;
                this.canPressSword = false;
                this.useSword();
                
                // Add cooldown
                this.time.delayedCall(100, () => {
                    this.canPressSword = true;
                    // If button is still being held, use sword again
                    if (this.buttonStates.sword) {
                        this.useSword();
                    }
                });
            }
        });
        
        swordButton.on('pointerout', () => {
            this.buttonStates.sword = false;
        });
        
        swordButton.on('pointerup', () => {
            this.buttonStates.sword = false;
        });
        
        // Circle button handler
        circleButton.on('pointerdown', () => {
            if (this.canPressCircle) {
                this.buttonStates.circle = true;
                this.canPressCircle = false;
                
                // On mobile, use the center of screen as a fallback for cursor position
                const camera = this.cameras.main;
                // Calculate the center of the screen in world coordinates
                const worldX = camera.scrollX + camera.width / 2;
                const worldY = camera.scrollY + camera.height / 2;
                
                // Create a circle at the calculated position
                this.createPlayerCircle(worldX, worldY);
                
                // Add cooldown
                this.time.delayedCall(500, () => {
                    this.canPressCircle = true;
                });
            }
        });
        
        circleButton.on('pointerout', () => {
            this.buttonStates.circle = false;
        });
        
        circleButton.on('pointerup', () => {
            this.buttonStates.circle = false;
        });
        
        // Reload button handler
        reloadButton.on('pointerdown', () => {
            if (this.canPressReload) {
                this.buttonStates.reload = true;
                this.canPressReload = false;
                
                // Only reload if we're not at max ammo
                if (this.player && this.player.ammo < this.player.maxAmmo) {
                    // Reset ammo to max
                    this.player.setAmmo(this.player.maxAmmo);
                    this.ui.updateAmmoCounter(this.player.ammo);
                    
                    // Send reload event to server
                    this.socketManager.reloadAmmo();
                }
                
                // Add cooldown
                this.time.delayedCall(500, () => {
                    this.canPressReload = true;
                });
            }
        });
        
        reloadButton.on('pointerout', () => {
            this.buttonStates.reload = false;
        });
        
        reloadButton.on('pointerup', () => {
            this.buttonStates.reload = false;
        });
        
        // Joystick handlers (independent from buttons)
        this.input.on('pointerdown', (pointer) => {
            // Only handle left side touches for joystick
            if (pointer.x < gameWidth / 2 && !this.joystickActive) {
                this.joystickActive = true;
                this.joystickPointer = pointer;
                
                if (this.floatingJoystick) {
                    // For floating joystick, center is at touch point
                    this.joystickStartX = pointer.x;
                    this.joystickStartY = pointer.y;
                    joystickBase.x = pointer.x;
                    joystickBase.y = pointer.y;
                    joystickThumb.x = pointer.x;
                    joystickThumb.y = pointer.y;
                } else {
                    // For fixed joystick, use predefined position
                    this.joystickStartX = joystickX;
                    this.joystickStartY = joystickY;
                }
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            // Only update joystick if this is the active joystick pointer
            if (this.joystickActive && this.joystickPointer && this.joystickPointer.id === pointer.id) {
                // Calculate joystick position
                const dx = pointer.x - this.joystickStartX;
                const dy = pointer.y - this.joystickStartY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = joystickRadius;
                
                // Normalize and cap distance
                const normalizedDistance = Math.min(distance, maxDistance);
                const angle = Math.atan2(dy, dx);
                
                // Calculate new thumb position
                const thumbX = this.joystickStartX + normalizedDistance * Math.cos(angle);
                const thumbY = this.joystickStartY + normalizedDistance * Math.sin(angle);
                
                // Update thumb position
                joystickThumb.x = thumbX;
                joystickThumb.y = thumbY;
                
                // Calculate input values (-1 to 1)
                this.joystickInputX = (thumbX - this.joystickStartX) / maxDistance;
                this.joystickInputY = (thumbY - this.joystickStartY) / maxDistance;
            }
        });
        
        this.input.on('pointerup', (pointer) => {
            // Reset joystick if this is the active joystick pointer
            if (this.joystickActive && this.joystickPointer && this.joystickPointer.id === pointer.id) {
                this.joystickActive = false;
                this.joystickPointer = null;
                this.joystickInputX = 0;
                this.joystickInputY = 0;
                
                // Reset joystick visuals
                if (!this.floatingJoystick) {
                    // Fixed joystick returns to center
                    joystickThumb.x = joystickX;
                    joystickThumb.y = joystickY;
                } else {
                    // Floating joystick hides until next use
                    joystickBase.alpha = 0.3;
                    joystickThumb.alpha = 0.3;
                    // Reset position to default
                    joystickBase.x = joystickX; 
                    joystickBase.y = joystickY;
                    joystickThumb.x = joystickX;
                    joystickThumb.y = joystickY;
                }
            }
        });
        
        // Initialize button cooldowns
        this.canPressShoot = true;
        this.canPressSword = true;
        this.canPressCircle = true;
        this.canPressReload = true;
        
        // Auto-fire implementation for shoot button
        this.startAutoFire = () => {
            // Clear any existing interval
            this.stopAutoFire();
            
            // Fire immediately
            this.tryFireProjectile();
            
            // Set up interval for continuous firing
            this.autoFireInterval = setInterval(() => {
                if (this.buttonStates.shoot) {
                    this.tryFireProjectile();
                } else {
                    this.stopAutoFire();
                }
            }, 200); // Fire every 200ms
        };
        
        this.stopAutoFire = () => {
            if (this.autoFireInterval) {
                clearInterval(this.autoFireInterval);
                this.autoFireInterval = null;
            }
        };
        
        this.tryFireProjectile = () => {
            // Check if player exists and has ammo
            if (this.player && this.player.ammo > 0) {
                // For mobile auto-fire, we'll aim toward the center of the view
                const camera = this.cameras.main;
                if (camera) {
                    // Call modified fireProjectile method that supports targeting
                    this.fireProjectile();
                }
                
                this.player.setAmmo(this.player.ammo - 1);
                this.ui.updateAmmoCounter(this.player.ammo);
            }
        };
        
        // Store mobile controls references
        this.mobileControls = {
            joystickBase,
            joystickThumb,
            shootButton,
            swordButton,
            circleButton,
            reloadButton,
            shootLabel,
            swordLabel,
            circleLabel,
            reloadLabel
        };
    }
    
    setupSocketEvents() {
        // When current players data is received
        this.socketManager.on('currentPlayers', (players) => {
            // Store the player info for when character is selected
            this.pendingPlayerInfo = null;
            
            Object.keys(players).forEach((id) => {
                const playerInfo = players[id];
                
                if (id === this.socketManager.getPlayerId()) {
                    // Store player info but don't create player yet
                    this.pendingPlayerInfo = playerInfo;
                    
                    // Show character selection screen
                    this.ui.showCharacterSelectionScreen();
                } else {
                    // Create other players immediately
                    this.addOtherPlayer(playerInfo);
                }
            });
        });
        
        // When current obstacles data is received
        this.socketManager.on('currentObstacles', (data) => {
            // Clear any existing obstacles and outlines
            Object.values(this.obstacles).forEach(obstacle => obstacle.destroy());
            this.obstacles = {};
            
            // Create active obstacles
            if (data.obstacles) {
                data.obstacles.forEach(obstacleInfo => {
                    this.createObstacle(obstacleInfo);
                });
            }
            
            // Create outlines for destroyed obstacles
            if (data.outlines) {
                data.outlines.forEach(outlineInfo => {
                    this.createObstacleOutline(outlineInfo);
                });
            }
            
            // Update minimap obstacles
            if (this.ui) {
                this.ui.updateMinimapObstacles();
            }
        });
        
        // When an obstacle is hit
        this.socketManager.on('obstacleHit', (hitInfo) => {
            const obstacle = this.obstacles[hitInfo.obstacleId];
            if (obstacle) {
                // Update health from server
                obstacle.updateFromServer(undefined, undefined, hitInfo.health);
                
                // Play hit sound if it's our hit
                if (hitInfo.playerId === this.socketManager.getPlayerId()) {
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.5 });
                    }
                }
            }
        });
        
        // When an obstacle is destroyed
        this.socketManager.on('obstacleDestroyed', (destroyInfo) => {
            const obstacle = this.obstacles[destroyInfo.obstacleId];
            if (obstacle) {
                // Create destruction effect
                obstacle.destroy();
                delete this.obstacles[destroyInfo.obstacleId];
                
                // Play hit sound if it's our hit
                if (destroyInfo.playerId === this.socketManager.getPlayerId()) {
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                }
                
                // Create outline if requested (when destroyed by a player)
                if (destroyInfo.createOutline) {
                    this.createObstacleOutline({
                        id: destroyInfo.outlineId,
                        x: destroyInfo.x,
                        y: destroyInfo.y,
                        size: destroyInfo.size,
                        isOutline: true,
                        respawnIn: destroyInfo.respawnIn // Pass the respawn time to show countdown
                    });
                }
                
                // Update minimap obstacles
                if (this.ui) {
                    this.ui.updateMinimapObstacles();
                }
            }
        });
        
        // When a projectile hits something
        this.socketManager.on('projectileImpact', (impactInfo) => {
            this.createHitImpact(impactInfo.x, impactInfo.y);
        });
        
        // When a new obstacle is spawned
        this.socketManager.on('newObstacle', (obstacleInfo) => {
            // Create the new obstacle
            this.createObstacle(obstacleInfo);
            
            // Update minimap obstacles
            if (this.ui) {
                this.ui.updateMinimapObstacles();
            }
            
            // Add a visual spawning effect
            const spawnEffect = this.add.circle(
                obstacleInfo.x,
                obstacleInfo.y,
                obstacleInfo.size * 1.5,
                0x00ffff,
                0.7
            );
            
            // Animate the spawn effect
            this.tweens.add({
                targets: spawnEffect,
                alpha: 0,
                scale: 1.5,
                duration: 1000,
                onComplete: () => spawnEffect.destroy()
            });
            
            // Add a text notification
            const notification = this.add.text(
                this.cameras.main.width / 2,
                50,
                'New Obstacle Spawned!',
                {
                    fontSize: '24px',
                    fontStyle: 'bold',
                    fill: '#00ffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            );
            notification.setOrigin(0.5);
            notification.setScrollFactor(0);
            notification.setDepth(100);
            
            // Animate and remove the notification
            this.tweens.add({
                targets: notification,
                alpha: 0,
                y: 20,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => notification.destroy()
            });
        });
        
        // When an obstacle respawns
        this.socketManager.on('obstacleRespawned', (obstacleInfo) => {
            // Use specific method for respawning to ensure exact position
            this.createRespawnedObstacle(obstacleInfo);
            
            // Add a visual respawn effect - green energy ring
            const respawnEffect = this.add.circle(
                obstacleInfo.x,
                obstacleInfo.y,
                obstacleInfo.size * 1.5,
                0x00ff00, // Green for respawn
                0.7
            );
            
            // Animate the respawn effect
            this.tweens.add({
                targets: respawnEffect,
                alpha: 0,
                scale: 1.5,
                duration: 1000,
                onComplete: () => respawnEffect.destroy()
            });
            
            // Create multiple particles converging toward the center
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const distance = obstacleInfo.size * 3;
                const particle = this.add.circle(
                    obstacleInfo.x + Math.cos(angle) * distance,
                    obstacleInfo.y + Math.sin(angle) * distance,
                    4,
                    0x00ff00, // Green
                    1
                );
                
                // Particles converge toward the center
                this.tweens.add({
                    targets: particle,
                    x: obstacleInfo.x,
                    y: obstacleInfo.y,
                    alpha: 0,
                    duration: 800,
                    ease: 'Cubic.in',
                    onComplete: () => particle.destroy()
                });
            }
            
            // Add a text effect showing "RESPAWNED"
            const respawnText = this.add.text(
                obstacleInfo.x,
                obstacleInfo.y - 30,
                "RESPAWNED",
                {
                    fontSize: '14px',
                    fontStyle: 'bold',
                    fill: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            );
            respawnText.setOrigin(0.5);
            respawnText.setDepth(100);
            
            // Animate text
            this.tweens.add({
                targets: respawnText,
                y: respawnText.y - 20,
                alpha: 0,
                duration: 1500,
                onComplete: () => respawnText.destroy()
            });
        });
        
        // When an outline is removed (due to obstacle respawn)
        this.socketManager.on('outlineRemoved', (outlineId) => {
            // Remove the outline if it exists
            if (this.obstacles[outlineId]) {
                // Store position before destroying for any effects
                const x = this.obstacles[outlineId].x;
                const y = this.obstacles[outlineId].y;
                
                // Destroy the outline
                this.obstacles[outlineId].destroy();
                delete this.obstacles[outlineId];
                
                // Add a subtle effect to show the outline disappearing
                const outlineFadeEffect = this.add.circle(x, y, 15, 0xffffff, 0.5);
                this.tweens.add({
                    targets: outlineFadeEffect,
                    alpha: 0,
                    scale: 0.5,
                    duration: 300,
                    onComplete: () => outlineFadeEffect.destroy()
                });
            }
        });
        
        // Coin-related events
        // When getting all current coins
        this.socketManager.on('currentCoins', (coins) => {
            console.log('Received current coins:', coins);
            
            // Clear any existing coins
            Object.values(this.coins).forEach(coin => {
                if (coin && typeof coin.destroy === 'function') {
                    coin.destroy();
                }
            });
            this.coins = {};
            
            // Create all coins
            if (Array.isArray(coins)) {
                coins.forEach(coinInfo => {
                    if (coinInfo && coinInfo.id) {
                        this.createCoin(coinInfo);
                    }
                });
            }
        });
        
        // When a new coin is spawned
        this.socketManager.on('coinSpawned', (coinInfo) => {
            // Create the new coin
            this.createCoin(coinInfo);
        });
        
        // When a coin is collected by any player
        this.socketManager.on('coinCollected', (collectionInfo) => {
            const coinId = collectionInfo.coinId;
            const playerId = collectionInfo.playerId;
            
            // Only show collection effect if collected by another player
            // (We already handled our own collection in the overlap handler)
            if (playerId !== this.socketManager.getPlayerId() && this.coins[coinId]) {
                this.coins[coinId].destroy(true);
                delete this.coins[coinId];
            }
        });
        
        // When a coin is removed (expired)
        this.socketManager.on('coinRemoved', (removalInfo) => {
            const coinId = removalInfo.coinId;
            
            // If expired, don't show the collection effect
            if (this.coins[coinId]) {
                this.coins[coinId].destroy(false);
                delete this.coins[coinId];
            }
        });
        
        // When a player's score is updated
        this.socketManager.on('playerScoreUpdate', (scoreInfo) => {
            // If it's our score, update the UI
            if (scoreInfo.playerId === this.socketManager.getPlayerId() && this.player) {
                this.player.score = scoreInfo.score;
                this.ui.updateScoreCounter(scoreInfo.score);
            } else if (this.otherPlayers[scoreInfo.playerId]) {
                // Update other player's score
                this.otherPlayers[scoreInfo.playerId].score = scoreInfo.score;
            }
        });
        
        // When a new player joins
        this.socketManager.on('newPlayer', (playerInfo) => {
            this.addOtherPlayer(playerInfo);
            
            // Check if new player is visible in viewport
            const isVisible = playerInfo.x !== undefined && 
                            playerInfo.y !== undefined && 
                            this.isPositionVisible(playerInfo.x, playerInfo.y);
            
            // Add new player to minimap (only visible if in viewport)
            if (this.ui && playerInfo.x !== undefined && playerInfo.y !== undefined) {
                this.ui.updateMinimapPlayer(
                    playerInfo.id,
                    playerInfo.x,
                    playerInfo.y,
                    false, // Not the local player
                    isVisible // Only show if visible in viewport
                );
            }
        });
        
        // When a player disconnects
        this.socketManager.on('playerDisconnected', (id) => {
            if (this.otherPlayers[id]) {
                this.otherPlayers[id].destroy();
                delete this.otherPlayers[id];
                
                // Remove player from minimap
                if (this.ui) {
                    this.ui.removeMinimapPlayer(id);
                }
            }
        });
        
        // When a player moves
        this.socketManager.on('playerMoved', (playerInfo) => {
            if (this.otherPlayers[playerInfo.id]) {
                const otherPlayer = this.otherPlayers[playerInfo.id];
                otherPlayer.sprite.x = playerInfo.x;
                otherPlayer.sprite.y = playerInfo.y;
                // Use the other player's actual character type for animation
                otherPlayer.playAnimation(playerInfo.direction, playerInfo.moving);
                
                // Check if moved player is visible in viewport
                const isVisible = this.isPositionVisible(playerInfo.x, playerInfo.y);
                
                // Update minimap position (only visible if in viewport)
                if (this.ui) {
                    this.ui.updateMinimapPlayer(
                        playerInfo.id,
                        playerInfo.x,
                        playerInfo.y,
                        false, // Not the local player
                        isVisible // Only show if visible in viewport
                    );
                }
            }
        });
        
        // When a player's name is updated
        this.socketManager.on('playerNameUpdate', (playerInfo) => {
            if (playerInfo.id === this.socketManager.getPlayerId()) {
                // Update our player name
                if (this.player) {
                    this.player.setName(playerInfo.name);
                }
            } else if (this.otherPlayers[playerInfo.id]) {
                // Update other player's name
                this.otherPlayers[playerInfo.id].setName(playerInfo.name);
            }
        });
        
        // When a player's character type is updated
        this.socketManager.on('playerCharTypeUpdate', (charTypeInfo) => {
            const playerId = charTypeInfo.playerId;
            const charType = charTypeInfo.charType;
            
            // Only update other players, not ourselves
            if (playerId !== this.socketManager.getPlayerId() && this.otherPlayers[playerId]) {
                const otherPlayer = this.otherPlayers[playerId];
                const playerX = otherPlayer.sprite.x;
                const playerY = otherPlayer.sprite.y;
                const playerName = otherPlayer.name;
                const playerHealth = otherPlayer.health;
                const playerAmmo = otherPlayer.ammo;
                
                // Remove the old player instance
                otherPlayer.destroy();
                
                // Create a new player with the updated character type
                this.otherPlayers[playerId] = new Player(
                    this,
                    playerX,
                    playerY,
                    charType,
                    false,
                    playerId,
                    playerName
                );
                
                // Restore player properties
                this.otherPlayers[playerId].setHealth(playerHealth);
                this.otherPlayers[playerId].setAmmo(playerAmmo);
                
                // Add to physics group
                this.otherPlayersGroup.add(this.otherPlayers[playerId].sprite);
                
                // Store player ID on sprite for collision handling
                this.otherPlayers[playerId].sprite.playerId = playerId;
                
                // Create a character change effect
                this.createCharacterChangeEffect(playerX, playerY, charType);
            }
        });
        
        // When a projectile is fired by another player
        this.socketManager.on('projectileFired', (projectileInfo) => {
            if (projectileInfo.playerId !== this.socketManager.getPlayerId()) {
                this.createProjectile(projectileInfo);
            }
        });
        
        // When a projectile is destroyed
        this.socketManager.on('projectileDestroyed', (projectileId) => {
            console.log('Server requested projectile destruction:', projectileId);
            
            const projectile = this.projectiles[projectileId];
            if (projectile) {
                // Try to gracefully destroy
                if (typeof projectile.destroy === 'function') {
                    projectile.destroy();
                } else {
                    // Fallback if the destroy method doesn't exist
                    if (projectile.sprite) {
                        projectile.sprite.destroy();
                    }
                }
                
                // Remove from the map
                delete this.projectiles[projectileId];
                console.log('Projectile destroyed:', projectileId);
            }
        });
        
        // When a player is hit
        this.socketManager.on('playerHit', (hitInfo) => {
            // If we were hit
            if (hitInfo.hitPlayerId === this.socketManager.getPlayerId()) {
                if (this.player) {
                    // Update health
                    this.player.setHealth(this.player.health - 1);
                    this.ui.updateHealthBar(this.player.health);
                    
                    // Play hit sound effect
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                    
                    // Check if player is defeated
                    if (this.player.health <= 0 && !this.isDefeated) {
                        this.handlePlayerDefeat();
                    }
                    
                    // Create visual effect
                    this.player.createHitEffect();
                }
            } else if (this.otherPlayers[hitInfo.hitPlayerId]) {
                // Create visual effect for the hit player
                this.otherPlayers[hitInfo.hitPlayerId].createHitEffect();
            }
        });
        
        // When a player is hit by a sword
        this.socketManager.on('playerSwordHit', (hitInfo) => {
            // If we were hit
            if (hitInfo.hitPlayerId === this.socketManager.getPlayerId()) {
                if (this.player) {
                    // Update health
                    this.player.setHealth(this.player.health - 4);
                    this.ui.updateHealthBar(this.player.health);
                    
                    // Play hit sound effect
                    if (this.hitSound) {
                        this.hitSound.play({ volume: 0.8 });
                    }
                    
                    // Check if player is defeated
                    if (this.player.health <= 0 && !this.isDefeated) {
                        this.handlePlayerDefeat();
                    }
                    
                    // Create visual effect
                    this.player.createHitEffect();
                }
            } else if (this.otherPlayers[hitInfo.hitPlayerId]) {
                // Create visual effect for the hit player
                this.otherPlayers[hitInfo.hitPlayerId].createHitEffect();
            }
        });
        
        // When receiving game state update
        this.socketManager.on('gameState', (gameState) => {
            // Update players
            gameState.players.forEach((serverPlayer) => {
                if (serverPlayer.id === this.socketManager.getPlayerId()) {
                    // Update our player from server
                    if (this.player) {
                        this.player.sprite.x = serverPlayer.x;
                        this.player.sprite.y = serverPlayer.y;
                        
                        // Update health and ammo if they're different
                        if (this.player.health !== serverPlayer.health) {
                            this.player.setHealth(serverPlayer.health);
                            this.ui.updateHealthBar(this.player.health);
                        }
                        
                        if (this.player.ammo !== serverPlayer.ammo) {
                            this.player.setAmmo(serverPlayer.ammo);
                            this.ui.updateAmmoCounter(this.player.ammo);
                        }
                    }
                } else {
                    // Update other players
                    if (this.otherPlayers[serverPlayer.id]) {
                        const otherPlayer = this.otherPlayers[serverPlayer.id];
                        otherPlayer.sprite.x = serverPlayer.x;
                        otherPlayer.sprite.y = serverPlayer.y;
                        otherPlayer.setHealth(serverPlayer.health);
                        otherPlayer.setAmmo(serverPlayer.ammo);
                        
                        if (serverPlayer.moving) {
                            otherPlayer.playAnimation(serverPlayer.direction, true);
                        } else {
                            otherPlayer.playAnimation(serverPlayer.direction, false);
                        }
                        
                        // Check if player is visible in viewport for minimap
                        const isVisible = this.isPositionVisible(serverPlayer.x, serverPlayer.y);
                        
                        // Update minimap position (only visible if in viewport)
                        if (this.ui) {
                            this.ui.updateMinimapPlayer(
                                serverPlayer.id,
                                serverPlayer.x,
                                serverPlayer.y,
                                false, // Not the local player
                                isVisible // Only show if visible in viewport
                            );
                        }
                    }
                }
            });
            
            // Update projectiles
            if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
                gameState.projectiles.forEach(serverProjectile => {
                    // Check if we already have this projectile
                    if (this.projectiles[serverProjectile.id]) {
                        // Update existing projectile position
                        const projectile = this.projectiles[serverProjectile.id];
                        
                        if (projectile.sprite) {
                            // Update the physics position
                            projectile.sprite.x = serverProjectile.x;
                            projectile.sprite.y = serverProjectile.y;
                            
                            // Update velocity if it's provided
                            if (serverProjectile.velocityX !== undefined && serverProjectile.velocityY !== undefined) {
                                projectile.sprite.setVelocity(serverProjectile.velocityX, serverProjectile.velocityY);
                            }
                        }
                    } else {
                        // Create a new projectile if we don't have it yet
                        this.createProjectile({
                            id: serverProjectile.id,
                            x: serverProjectile.x,
                            y: serverProjectile.y,
                            velocityX: serverProjectile.velocityX || 0,
                            velocityY: serverProjectile.velocityY || 0,
                            playerId: serverProjectile.playerId
                        });
                    }
                });
                
                // Remove projectiles that are no longer in the game state
                Object.keys(this.projectiles).forEach(id => {
                    if (!gameState.projectiles.some(p => p.id === id)) {
                        if (this.projectiles[id]) {
                            this.projectiles[id].destroy();
                            delete this.projectiles[id];
                        }
                    }
                });
            }
            
            // Update obstacles
            if (gameState.obstacles && Array.isArray(gameState.obstacles)) {
                // Track which obstacles exist in the new state
                const currentObstacleIds = new Set();
                
                gameState.obstacles.forEach(serverObstacle => {
                    currentObstacleIds.add(serverObstacle.id);
                    
                    // Check if we already have this obstacle
                    if (this.obstacles[serverObstacle.id]) {
                        // Update existing obstacle
                        this.obstacles[serverObstacle.id].updateFromServer(
                            serverObstacle.x,
                            serverObstacle.y,
                            serverObstacle.health
                        );
                    } else {
                        // Create a new obstacle if we don't have it yet
                        this.createObstacle(serverObstacle);
                    }
                });
                
                // Update outlines if provided
                if (gameState.outlines && Array.isArray(gameState.outlines)) {
                    gameState.outlines.forEach(serverOutline => {
                        currentObstacleIds.add(serverOutline.id);
                        
                        // Check if we already have this outline
                        if (this.obstacles[serverOutline.id]) {
                            // Update existing outline
                            this.obstacles[serverOutline.id].updateFromServer(
                                serverOutline.x,
                                serverOutline.y
                            );
                        } else {
                            // Create a new outline if we don't have it yet
                            this.createObstacleOutline(serverOutline);
                        }
                    });
                }
                
                // Remove obstacles and outlines that are no longer in the game state
                Object.keys(this.obstacles).forEach(id => {
                    if (!currentObstacleIds.has(id)) {
                        if (this.obstacles[id]) {
                            this.obstacles[id].destroy();
                            delete this.obstacles[id];
                        }
                    }
                });
                
                // Update the minimap after processing all obstacles
                if (this.ui) {
                    this.ui.updateMinimapObstacles();
                    
                    // Ensure local player is always visible on minimap
                    if (this.player) {
                        this.ui.updateMinimapPlayer(
                            this.socketManager.getPlayerId(),
                            this.player.sprite.x,
                            this.player.sprite.y,
                            true,  // isLocalPlayer
                            true   // isVisible (always true for local player)
                        );
                    }
                }
            }
            
            // Update coins if they're included in this update
            if (gameState.coins && Array.isArray(gameState.coins)) {
                // Track which coins exist in the new state
                const currentCoinIds = new Set();
                
                gameState.coins.forEach(serverCoin => {
                    currentCoinIds.add(serverCoin.id);
                    
                    // Check if we already have this coin
                    if (this.coins[serverCoin.id]) {
                        // Update existing coin position if needed
                        this.coins[serverCoin.id].updatePosition(
                            serverCoin.x,
                            serverCoin.y
                        );
                    } else {
                        // Create a new coin if we don't have it yet
                        this.createCoin(serverCoin);
                    }
                });
                
                // Note: We DO NOT remove coins that are not in the update
                // since coins may not be included in every update
                // Coin removal is handled by explicit coinRemoved and coinCollected events
            }
        });
        
        // When a player is defeated
        this.socketManager.on('playerDefeated', (data) => {
            // If it's another player who was defeated
            if (data.playerId !== this.socketManager.getPlayerId() && this.otherPlayers[data.playerId]) {
                const defeatedPlayer = this.otherPlayers[data.playerId];
                
                // Store position before hiding the player
                const playerX = defeatedPlayer.sprite.x;
                const playerY = defeatedPlayer.sprite.y;
                
                // Create death explosion effect
                this.createDeathExplosion(playerX, playerY);
                
                // Hide the player sprite and disable physics
                defeatedPlayer.sprite.setVisible(false);
                defeatedPlayer.sprite.body.enable = false;
                
                // Create a defeat text above the player
                const defeatedText = this.add.text(
                    playerX, 
                    playerY - 50, 
                    'DEFEATED', 
                    {
                        fontSize: '20px',
                        fontWeight: 'bold',
                        fill: '#ff0000',
                        stroke: '#000',
                        strokeThickness: 3
                    }
                );
                defeatedText.setOrigin(0.5);
                defeatedText.setDepth(20);
                
                // Animate and remove after 2 seconds
                this.tweens.add({
                    targets: defeatedText,
                    y: defeatedText.y - 30,
                    alpha: 0,
                    duration: 2000,
                    onComplete: function() {
                        defeatedText.destroy();
                    }
                });
            }
        });
        
        // When a player respawns
        this.socketManager.on('playerRespawned', (data) => {
            if (data.playerId === this.socketManager.getPlayerId()) {
                // Update our player position after respawn
                if (this.player) {
                    this.player.sprite.x = data.x;
                    this.player.sprite.y = data.y;
                    this.player.setHealth(data.health);
                    this.player.setAmmo(data.ammo);
                    this.ui.updateHealthBar(this.player.health);
                    this.ui.updateAmmoCounter(this.player.ammo);
                }
            } else if (this.otherPlayers[data.playerId]) {
                // Update other player
                const respawnedPlayer = this.otherPlayers[data.playerId];
                respawnedPlayer.sprite.x = data.x;
                respawnedPlayer.sprite.y = data.y;
                respawnedPlayer.setHealth(data.health);
                respawnedPlayer.setAmmo(data.ammo);
                respawnedPlayer.sprite.clearTint(); // Remove red tint
                respawnedPlayer.sprite.setVisible(true); // Make player visible again
                respawnedPlayer.sprite.body.enable = true; // Re-enable physics
                
                // Show respawn effect
                this.createRespawnEffect(
                    respawnedPlayer.sprite.x,
                    respawnedPlayer.sprite.y
                );
                
                // Check if respawned player is visible in viewport
                const isVisible = this.isPositionVisible(data.x, data.y);
                
                // Update minimap with respawned player (only visible if in viewport)
                if (this.ui) {
                    this.ui.updateMinimapPlayer(
                        data.playerId,
                        data.x,
                        data.y,
                        false, // Not the local player
                        isVisible // Only show if visible in viewport
                    );
                }
            }
        });
        
        // When a sword is used by another player
        this.socketManager.on('swordUsed', (swordData) => {
            if (swordData.playerId !== this.socketManager.getPlayerId()) {
                // Create sword for other player
                const otherPlayer = this.otherPlayers[swordData.playerId];
                if (otherPlayer) {
                    // Check if cursor targeting was used
                    if (swordData.useTargetPosition && swordData.targetX !== null && swordData.targetY !== null) {
                        // Create a simple sword for the other player with target position
                        new SimpleSword(
                            this,
                            otherPlayer.sprite,
                            swordData.direction, // Legacy direction as fallback
                            swordData.playerId,
                            { x: swordData.targetX, y: swordData.targetY } // Target position
                        );
                    } else {
                        // Fallback to legacy direction-based sword
                        new SimpleSword(
                            this,
                            otherPlayer.sprite,
                            swordData.direction,
                            swordData.playerId
                        );
                    }
                }
            }
        });
        
        // Circle events
        this.socketManager.on('circleCreated', (circleData) => {
            this.drawCircleFromServer(circleData);
        });
        
        this.socketManager.on('circleRemoved', (circleId) => {
            // Check if it's our circle
            if (this.playerCircle && this.playerCircle.id === circleId) {
                // Clear our reference but don't notify server (to avoid loop)
                if (this.playerCircle.graphics) {
                    this.playerCircle.graphics.destroy();
                }
                this.playerCircle = null;
            } else {
                // Remove from other players' circles
                this.removeCircle(circleId);
            }
        });
    }
    
    /**
     * Handle character selection from the selection screen
     * @param {string} charType - The selected character type
     */
    onCharacterSelected(charType) {
        // Make sure we have pending player info
        if (!this.pendingPlayerInfo) {
            console.error('No pending player info found when character selected');
            return;
        }
        
        // Get the player name from the UI
        const playerName = this.ui.getInitialPlayerName();
        
        // Create a copy of the pending player info
        const playerInfo = { ...this.pendingPlayerInfo, name: playerName };
        
        // Create the player with the selected character
        this.createPlayer(playerInfo);
        
        // Tell the server about the character and name
        this.socketManager.setPlayerCharType(charType);
        this.socketManager.setPlayerName(playerName);
        
        // Setup collisions now that the player exists
        this.setupCollisions();
        
        // Create selection effect
        this.createCharacterChangeEffect(playerInfo.x, playerInfo.y, charType);
    }
    
    setupCollisions() {
        if (this.player) {
            // Setup collision between player and other players
            this.physics.add.collider(
                this.player.sprite,
                this.otherPlayersGroup
            );
            
            // Setup collision between player and obstacles
            this.physics.add.collider(
                this.player.sprite,
                this.obstaclesGroup
            );
            
            // Setup overlap between projectiles and the local player
            this.physics.add.overlap(
                this.projectilesGroup,
                this.player.sprite,
                this.handleProjectileHit,
                (projectileSprite, playerSprite) => {
                    console.log('Testing projectile-player collision:', projectileSprite.playerId, this.socketManager.getPlayerId());
                    // Make sure local player can't be hit by own projectile
                    return projectileSprite.playerId !== this.socketManager.getPlayerId();
                },
                this
            );
            
            // Enable coin collection
            this.physics.add.overlap(
                this.player.sprite,
                this.coinsGroup,
                this.handleCoinCollection,
                null,
                this
            );
        }
        
        // Setup overlap between projectiles and other players
        this.physics.add.overlap(
            this.projectilesGroup,
            this.otherPlayersGroup,
            this.handleProjectileHit,
            (projectileSprite, otherPlayerSprite) => {
                console.log('Testing projectile-otherPlayer collision:', projectileSprite.playerId, otherPlayerSprite.playerId);
                // Only register collisions for projectiles that weren't fired by the hit player
                return projectileSprite.playerId !== otherPlayerSprite.playerId;
            },
            this
        );
        
        // Setup collision between projectiles and obstacles
        this.physics.add.collider(
            this.projectilesGroup,
            this.obstaclesGroup,
            this.handleProjectileObstacleHit,
            null,
            this
        );
        
        // Setup collision between other players and obstacles
        this.physics.add.collider(
            this.otherPlayersGroup,
            this.obstaclesGroup
        );
    }
    
    /**
     * Create a new coin
     * @param {Object} coinInfo - The coin data from server
     */
    createCoin(coinInfo) {
        try {
            // Validate coin data
            if (!coinInfo || !coinInfo.id) {
                console.error('Invalid coin data:', coinInfo);
                return null;
            }
            
            // Ensure we have valid coordinates
            const x = Number(coinInfo.x) || 0;
            const y = Number(coinInfo.y) || 0;
            const size = Number(coinInfo.size) || 15;
            
            console.log('Creating coin:', coinInfo.id, 'at position:', x, y);
            
            // If this coin already exists, update position and return the existing coin
            if (this.coins[coinInfo.id]) {
                this.coins[coinInfo.id].updatePosition(x, y);
                return this.coins[coinInfo.id];
            }
            
            // Get coin type (player_drop or regular)
            const coinType = coinInfo.type || 'regular';
            
            // Create a new coin instance using our simplified and reliable implementation
            const coin = new Coin(this, x, y, size, coinInfo.id, coinType);
            
            // Add to tracking objects
            this.coins[coinInfo.id] = coin;
            
            // Add to physics group if sprite was created successfully
            if (coin.sprite && coin.sprite.body) {
                this.coinsGroup.add(coin.sprite);
                
                // Add a simple scaling effect on creation
                this.tweens.add({
                    targets: coin.sprite,
                    scale: { from: 0, to: 1 },
                    duration: 300,
                    ease: 'Back.out'
                });
            } else {
                console.error('Coin sprite or body not created properly. Will retry creation.');
                
                // Remove the failed coin
                delete this.coins[coinInfo.id];
                
                // Create an emergency fallback coin using a completely different approach
                this.createEmergencyCoin(x, y, coinInfo.id);
            }
            
            return coin;
        } catch (error) {
            console.error('Error creating coin:', error);
            return null;
        }
    }
    
    /**
     * Emergency coin creation - fallback method for when normal coin creation fails
     */
    createEmergencyCoin(x, y, coinId) {
        // Create an absolute fallback coin using the simplest possible approach
        console.log('Creating emergency coin fallback at:', x, y);
        
        // Just use a basic yellow circle
        const sprite = this.physics.add.sprite(x, y, '');
        sprite.coinId = coinId;
        
        // Make it a basic yellow circle if there's no texture
        const circle = this.add.circle(x, y, 15, 0xffff00);
        
        // Store in our coins object with a minimal API
        this.coins[coinId] = {
            id: coinId,
            sprite: sprite,
            updatePosition: (newX, newY) => {
                if (sprite) sprite.setPosition(newX, newY);
                if (circle) circle.setPosition(newX, newY);
            },
            destroy: (collected) => {
                if (sprite) sprite.destroy();
                if (circle) circle.destroy();
                delete this.coins[coinId];
            }
        };
        
        // Add to the physics group
        this.coinsGroup.add(sprite);
        
        return this.coins[coinId];
    }
    
    /**
     * Handle coin collection by the player
     * @param {Phaser.GameObjects.Sprite} playerSprite - The player sprite
     * @param {Phaser.GameObjects.Sprite} coinSprite - The coin sprite
     */
    handleCoinCollection(playerSprite, coinSprite) {
        // Skip collection if player is in defeated state
        if (this.isDefeated) {
            console.log('Cannot collect coin while defeated');
            return;
        }
        
        // Get coin ID
        const coinId = coinSprite.coinId;
        
        if (!coinId || !this.coins[coinId]) {
            console.log('Invalid coin collection attempt:', coinId);
            return;
        }
        
        console.log('Collecting coin:', coinId);
        
        // Notify server that coin was collected
        this.socketManager.collectCoin(coinId);
        
        // Play coin collection sound
        if (this.coinSound) {
            this.coinSound.play({ volume: 0.5 });
        }
        
        // Create collection effect and destroy coin locally
        // Server will broadcast the update to remove it for all players
        this.coins[coinId].destroy(true);
        delete this.coins[coinId];
    }
    
    /**
     * Create a new obstacle
     * @param {Object} obstacleInfo - The obstacle data from server
     */
    createObstacle(obstacleInfo) {
        // Create obstacle instance
        const obstacle = new Obstacle(
            this,
            obstacleInfo.x,
            obstacleInfo.y,
            obstacleInfo.size,
            obstacleInfo.id,
            obstacleInfo.health,
            false // Not an outline
        );
        
        // Add to tracking objects
        this.obstacles[obstacleInfo.id] = obstacle;
        this.obstaclesGroup.add(obstacle.sprite);
    }
    
    /**
     * Create an outline of a destroyed obstacle
     * @param {Object} outlineInfo - The outline data from server
     */
    createObstacleOutline(outlineInfo) {
        // Create outline instance (using same Obstacle class with isOutline=true)
        const outline = new Obstacle(
            this,
            outlineInfo.x,
            outlineInfo.y,
            outlineInfo.size,
            outlineInfo.id,
            0, // No health
            true, // This is an outline
            outlineInfo.respawnIn || 0 // Pass respawn time if available
        );
        
        // Add to tracking objects
        this.obstacles[outlineInfo.id] = outline;
    }
    
    /**
     * Create a respawned obstacle at its original exact position
     * @param {Object} obstacleInfo - The obstacle data from server
     */
    createRespawnedObstacle(obstacleInfo) {
        // Explicitly create obstacle at the exact coordinates specified
        // Create obstacle instance with precise position control
        const obstacle = new Obstacle(
            this,
            obstacleInfo.x,
            obstacleInfo.y,
            obstacleInfo.size,
            obstacleInfo.id,
            obstacleInfo.health || 2,
            false // Not an outline
        );
        
        // Force position to be exact
        if (obstacle.sprite) {
            obstacle.sprite.x = obstacleInfo.x;
            obstacle.sprite.y = obstacleInfo.y;
            
            // Ensure physics body is positioned correctly
            if (obstacle.sprite.body) {
                obstacle.sprite.body.reset(obstacleInfo.x, obstacleInfo.y);
            }
        }
        
        // Store original position for reference
        obstacle.originalX = obstacleInfo.x;
        obstacle.originalY = obstacleInfo.y;
        
        // Add to tracking objects
        this.obstacles[obstacleInfo.id] = obstacle;
        this.obstaclesGroup.add(obstacle.sprite);
        
        console.log(`Respawned obstacle at exact position: (${obstacleInfo.x}, ${obstacleInfo.y})`);
        
        return obstacle;
    }
    
    /**
     * Handle collision between projectile and obstacle
     * @param {Phaser.GameObjects.Sprite} projectileSprite - The projectile sprite
     * @param {Phaser.GameObjects.Sprite} obstacleSprite - The obstacle sprite
     */
    handleProjectileObstacleHit(projectileSprite, obstacleSprite) {
        // Skip if sprites are inactive
        if (!projectileSprite.active || !obstacleSprite.active) return;
        
        // Find projectile instance by ID directly
        const projectileId = projectileSprite.id;
        
        if (projectileId && this.projectiles[projectileId]) {
            console.log('Projectile hit obstacle:', projectileId);
            
            // Find and destroy the projectile
            const projectile = this.projectiles[projectileId];
            if (projectile) {
                try {
                    projectile.destroy();
                } catch (error) {
                    console.error('Error destroying projectile:', error);
                    // Fallback destruction if the main method fails
                    if (projectile.sprite && projectile.sprite.body) {
                        projectile.sprite.body.enable = false;
                    }
                    if (projectile.sprite) {
                        projectile.sprite.destroy();
                    }
                }
                
                delete this.projectiles[projectileId];
            }
            
            // Notify server to destroy projectile
            this.socketManager.destroyProjectile(projectileId);
            
            // Create impact effect
            this.createHitImpact(projectileSprite.x, projectileSprite.y);
        }
    }
    
    createPlayer(playerInfo) {
        // Get the character type from game config
        const characterType = GameConfig.getPlayerCharacter();
        
        // Create the local player
        this.player = new Player(
            this,
            playerInfo.x,
            playerInfo.y,
            characterType,
            true,
            playerInfo.id,
            playerInfo.name
        );
        
        // Use player name from server if available
        if (playerInfo.name) {
            this.player.setName(playerInfo.name);
            this.ui.setNameInputValue(playerInfo.name);
        }
        
        // Initialize player properties
        this.player.setHealth(playerInfo.health);
        this.player.setAmmo(playerInfo.ammo);
        this.player.score = playerInfo.score || 0;
        this.ui.updateHealthBar(this.player.health);
        this.ui.updateAmmoCounter(this.player.ammo);
        this.ui.updateScoreCounter(this.player.score);
        
        // Make camera follow the player but don't follow in the UI area (top of screen)
        const uiHeight = this.ui.UI_HEIGHT;
        const PADDING = 30; // Same padding as the world bounds
        this.cameras.main.setBounds(PADDING, uiHeight + PADDING, 1600 - (PADDING * 2), 1600 - uiHeight - (PADDING * 2));
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(100, 100); // Add deadzone for smoother camera movement
    }
    
    addOtherPlayer(playerInfo) {
        // Create a new player instance for another player using their character type
        const otherPlayer = new Player(
            this,
            playerInfo.x,
            playerInfo.y,
            playerInfo.charType || AnimationManager.CHARACTER_TYPES.CHARACTER, // Use the player's character type if available
            false,
            playerInfo.id,
            playerInfo.name
        );
        
        // Add to tracking objects
        this.otherPlayers[playerInfo.id] = otherPlayer;
        this.otherPlayersGroup.add(otherPlayer.sprite);
        
        // Store player ID on sprite for collision handling
        otherPlayer.sprite.playerId = playerInfo.id;
    }
    
    createProjectile(projectileInfo) {
        console.log('Creating projectile:', projectileInfo);
        
        // Use the VisibleProjectile class for reliable rendering
        const projectile = new VisibleProjectile(
            this,
            projectileInfo.x,
            projectileInfo.y,
            projectileInfo.id,
            projectileInfo.playerId,
            projectileInfo.velocityX,
            projectileInfo.velocityY
        );
        
        // Store in the projectiles map
        this.projectiles[projectileInfo.id] = projectile;
        
        // Add to physics group for collision detection
        if (projectile.sprite) {
            this.projectilesGroup.add(projectile.sprite);
            
            // Set the sprite to be interactive for debugging
            projectile.sprite.setInteractive();
            
            // Add debug event to log info when clicked
            projectile.sprite.on('pointerdown', () => {
                console.log('Projectile clicked:', {
                    id: projectile.id,
                    position: { x: projectile.sprite.x, y: projectile.sprite.y },
                    velocity: { x: projectile.sprite.body.velocity.x, y: projectile.sprite.body.velocity.y },
                    active: projectile.sprite.active,
                    visible: projectile.sprite.visible
                });
            });
        }
        
        return projectile;
    }
    
    fireProjectile() {
        // Don't fire if player is defeated
        if (this.isDefeated || !this.player) return;
        
        // Play shoot sound effect
        if (this.shootSound) {
            this.shootSound.play({ volume: 0.5 });
        }
        
        // Get cursor position to determine firing direction
        const mousePointer = this.input.activePointer;
        if (mousePointer) {
            // Create target position object with cursor coordinates
            const targetPosition = {
                x: mousePointer.worldX,
                y: mousePointer.worldY
            };
            
            // Send to server with both direction and target position
            this.socketManager.fireProjectile(this.lastDirection, targetPosition);
            
            // Provide visual feedback on the crosshair
            this.pulseCustomCrosshair();
        } else {
            // Fallback to direction-based firing if cursor position not available
            this.socketManager.fireProjectile(this.lastDirection);
        }
    }
    
    /**
     * Creates a pulsing animation on the crosshair when firing
     */
    pulseCustomCrosshair() {
        if (this.crosshair) {
            // Stop any existing tween to prevent conflicts
            this.tweens.killTweensOf(this.crosshair.scale);
            
            // Reset scale to ensure consistent animation
            this.crosshair.setScale(1);
            
            // Create a quick pulse animation
            this.tweens.add({
                targets: this.crosshair,
                scale: 1.5,
                duration: 100,
                yoyo: true,
                ease: 'Power2',
                onComplete: () => {
                    // Reset scale when animation completes
                    this.crosshair.setScale(1);
                }
            });
        }
    }
    
    /**
     * Creates a sword slash effect on the crosshair
     */
    swordCrosshairEffect() {
        if (this.crosshair) {
            // Stop any existing tween to prevent conflicts
            this.tweens.killTweensOf(this.crosshair);
            
            // Change crosshair color temporarily
            const existingGraphics = this.crosshair.getAt(0);
            if (existingGraphics) {
                // Store original position
                const x = this.crosshair.x;
                const y = this.crosshair.y;
                
                // Create sword slash effect
                const slashEffect = this.add.graphics();
                slashEffect.lineStyle(3, 0x00FF00, 1);
                
                // Draw slash diagonally
                slashEffect.beginPath();
                slashEffect.moveTo(x - 20, y - 20);
                slashEffect.lineTo(x + 20, y + 20);
                slashEffect.strokePath();
                
                // Draw second slash
                slashEffect.beginPath();
                slashEffect.moveTo(x + 20, y - 20);
                slashEffect.lineTo(x - 20, y + 20);
                slashEffect.strokePath();
                
                // Make the crosshair rotate quickly
                this.tweens.add({
                    targets: this.crosshair,
                    angle: 360,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        // Reset rotation when complete
                        this.crosshair.angle = 0;
                    }
                });
                
                // Fade out and remove the slash effect
                this.tweens.add({
                    targets: slashEffect,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => {
                        slashEffect.destroy();
                    }
                });
            }
        }
    }
    
    handleProjectileHit(projectileSprite, playerHit) {
        // Skip if either sprite is inactive or if player is defeated
        if (!projectileSprite.active || !playerHit.active) return;
        
        // Skip if local player is defeated and was hit
        if (this.isDefeated && playerHit === this.player.sprite) {
            console.log('Ignoring hit on defeated player');
            return;
        }
        
        // Get the projectile ID and owner ID from the sprite
        const projectileId = projectileSprite.id;
        const projectileOwnerId = projectileSprite.playerId;
        
        console.log('Projectile hit detected:', {
            projectileId,
            projectileOwnerId,
            hitPlayerId: playerHit.playerId || this.socketManager.getPlayerId()
        });
        
        if (!projectileId || !projectileOwnerId) {
            console.error('Missing projectile ID or owner ID on sprite:', projectileSprite);
            return;
        }
        
        // Get hit player ID
        const hitPlayerId = playerHit.playerId || this.socketManager.getPlayerId();
        
        // Ignore self-hits
        if (projectileOwnerId === hitPlayerId) {
            console.log('Ignoring self-hit');
            return;
        }
        
        // Create impact effect at hit position
        this.createHitImpact(projectileSprite.x, projectileSprite.y);
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play({ volume: 0.5 });
        }
        
        // Find and destroy the projectile
        const projectile = this.projectiles[projectileId];
        if (projectile) {
            try {
                if (typeof projectile.destroy === 'function') {
                    projectile.destroy();
                } else {
                    // Fallback if the destroy method doesn't exist
                    if (projectile.sprite) {
                        projectile.sprite.destroy();
                    }
                }
            } catch (error) {
                console.error('Error destroying projectile:', error);
                // Emergency cleanup if error occurs
                if (projectile.sprite && projectile.sprite.body) {
                    projectile.sprite.body.enable = false;
                }
                if (projectile.sprite) {
                    projectile.sprite.destroy();
                }
            }
            
            delete this.projectiles[projectileId];
        }
        
        // Notify server to destroy projectile
        this.socketManager.destroyProjectile(projectileId);
        
        // Notify server about hit
        this.socketManager.playerHit(hitPlayerId, projectileOwnerId);
        
        // Create a hit impact effect
        this.createHitImpact(playerHit.x, playerHit.y);
    }
    
    /**
     * Create a visual impact effect when a projectile hits something
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     */
    createHitImpact(x, y) {
        // Create a visual impact effect
        const impact = this.add.circle(x, y, 20, 0xffff00, 0.8);
        impact.setDepth(15);
        
        // Animate and destroy
        this.tweens.add({
            targets: impact,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => impact.destroy()
        });
    }
    
    useSword() {
        // Don't use sword if player is defeated
        if (this.isDefeated || !this.player) return;
        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastSwordTime < this.swordCooldown) {
            return;
        }
        
        // Update last sword time
        this.lastSwordTime = currentTime;
        
        // Play sword sound effect
        if (this.swordSound) {
            this.swordSound.play({ volume: 0.6 });
        }
        
        // Show sword animation on crosshair
        this.swordCrosshairEffect();
        
        // Reset the hit tracking for this new sword swing
        this.playersHitBySword = {};
        this.obstaclesHitBySword = {};
        
        // Get cursor position to determine sword direction
        const mousePointer = this.input.activePointer;
        let targetPosition = null;
        
        if (mousePointer) {
            // Create target position object with cursor coordinates
            targetPosition = {
                x: mousePointer.worldX,
                y: mousePointer.worldY
            };
        }
        
        // Create a simple sword using our new class
        const sword = new SimpleSword(
            this,
            this.player.sprite,
            this.lastDirection, // Keep this for backward compatibility
            this.socketManager.getPlayerId(),
            targetPosition // Pass the cursor position
        );
        
        // Get the hitbox for collision detection
        const swordHitbox = sword.getHitbox();
        
        // Check for sword hits on other players
        this.physics.add.overlap(
            swordHitbox,
            this.otherPlayersGroup,
            (sword, otherPlayerSprite) => {
                // Get other player ID
                const otherPlayerId = otherPlayerSprite.playerId;
                
                // Check if this player was already hit by this sword swing
                if (this.playersHitBySword[otherPlayerId]) return;
                
                // Mark this player as hit by this sword swing
                this.playersHitBySword[otherPlayerId] = true;
                
                // Notify server about the sword hit
                this.socketManager.swordHit(otherPlayerId);
                
                // Create hit effect on the other player
                if (this.otherPlayers[otherPlayerId]) {
                    this.otherPlayers[otherPlayerId].createHitEffect();
                }
            }
        );
        
        // Check for sword hits on obstacles
        this.physics.add.overlap(
            swordHitbox,
            this.obstaclesGroup,
            (sword, obstacleSprite) => {
                // Get obstacle ID
                const obstacleId = obstacleSprite.obstacleId;
                
                // Check if this obstacle was already hit by this sword swing
                if (this.obstaclesHitBySword[obstacleId]) return;
                
                // Mark this obstacle as hit by this sword swing
                this.obstaclesHitBySword[obstacleId] = true;
                
                // Notify server about the sword hit on obstacle
                this.socketManager.obstacleHit(obstacleId);
                
                // Create temporary visual effect locally - actual change will come from server
                const obstacle = this.obstacles[obstacleId];
                if (obstacle) {
                    obstacle.createHitEffect();
                }
            }
        );
        
        // Notify server that sword was used - using the hitbox position as the sword tip
        this.socketManager.swordUsed(
            swordHitbox.x, 
            swordHitbox.y, 
            0, // Rotation doesn't matter for simple sword
            this.lastDirection,
            targetPosition // Pass the cursor position
        );
    }
    
    // createSwordVisual method removed as we now use SimpleSword class
    
    /**
     * Create a visual barrier at the world boundaries
     * @param {number} x - X position of the barrier
     * @param {number} y - Y position of the barrier
     * @param {number} width - Width of the barrier
     * @param {number} height - Height of the barrier
     * @param {number} color - Color of the barrier
     * @returns {Phaser.GameObjects.Rectangle} The barrier rectangle
     */
    createWorldBarrier(x, y, width, height, color) {
        const barrier = this.add.rectangle(x, y, width, height, color);
        barrier.setOrigin(0, 0);
        barrier.setDepth(5);
        return barrier;
    }
    
    handlePlayerDefeat() {
        this.isDefeated = true;
        
        // Create particle explosion at player position
        if (this.player) {
            const playerX = this.player.sprite.x;
            const playerY = this.player.sprite.y;
            
            // Create explosion particles
            this.createDeathExplosion(playerX, playerY);
            
            // Hide the player sprite immediately and disable physics
            this.player.sprite.setVisible(false);
            
            // Disable the player's physics body to prevent any collision detection
            this.player.sprite.body.enable = false;
        }
        
        // Show the defeat text
        this.ui.showDefeatText();
        
        // Tell server player was defeated
        this.socketManager.playerDefeated();
        
        // Reset player after delay
        this.time.delayedCall(2000, () => this.resetPlayer());
    }
    
    /**
     * Create particle explosion for player death that transitions into a coin
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createDeathExplosion(x, y) {
        // Create particle colors (player colors + gold for transition to coin)
        const colors = [0xff0000, 0xffff00, 0x00ffff, 0xffffff, 0xFFD700];
        
        // Create particles flying outward
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            const size = 3 + Math.random() * 5;
            
            // Choose random color from array
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = this.add.circle(
                x, 
                y, 
                size, 
                color
            );
            particle.setDepth(20);
            
            // Animate particle outward
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.5,
                duration: 800,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Create a flash effect
        const flash = this.add.circle(x, y, 50, 0xffffff, 0.8);
        flash.setDepth(19);
        
        // Animate the flash
        this.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });
    }
    
    resetPlayer() {
        // Hide defeat text
        this.ui.hideDefeatText();
        
        // Check if the character type has changed
        const currentCharType = this.player ? this.player.charType : null;
        const newCharType = GameConfig.getPlayerCharacter();
        const hasCharChanged = currentCharType !== newCharType;
        
        // Store position for respawn effect
        const playerX = this.player ? this.player.sprite.x : 0;
        const playerY = this.player ? this.player.sprite.y : 0;
        
        // If character type changed, destroy and recreate player with new type
        if (hasCharChanged && this.player) {
            // Clean up old player
            const playerName = this.player.name;
            const playerScore = this.player.score || 0;
            const playerId = this.player.id;
            
            // Destroy the old player instance
            this.player.destroy();
            
            // Create new player with updated character type
            this.player = new Player(
                this,
                playerX,
                playerY,
                newCharType,
                true,
                playerId,
                playerName
            );
            
            // Restore player properties
            this.player.score = playerScore;
            this.player.setHealth(this.player.maxHealth);
            this.player.setAmmo(this.player.maxAmmo);
            
            // Re-setup camera to follow the new player sprite
            this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
            
            // Show notification
            const notification = this.add.text(
                this.cameras.main.width / 2,
                100,
                'Character Changed!',
                {
                    fontSize: '24px',
                    fontStyle: 'bold',
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3,
                    backgroundColor: '#333333'
                }
            );
            notification.setOrigin(0.5);
            notification.setScrollFactor(0);
            notification.setDepth(1000);
            notification.setPadding(10);
            
            // Add fade out animation
            this.tweens.add({
                targets: notification,
                alpha: 0,
                y: 80,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => notification.destroy()
            });
            
            // Tell server about character type change
            this.socketManager.setPlayerCharType(newCharType);
        } else if (this.player) {
            // Just re-enable the existing player
            this.player.sprite.clearTint();
            this.player.sprite.setVisible(true); // Make player visible again
            this.player.sprite.body.enable = true; // Re-enable physics
        }
        
        // Add a respawn effect with enhanced visuals for character changes
        if (hasCharChanged) {
            this.createCharacterChangeEffect(playerX, playerY, newCharType);
        } else {
            this.createRespawnEffect(playerX, playerY);
        }
        
        // Tell server to respawn player
        this.socketManager.respawnPlayer();
        
        this.isDefeated = false;
    }
    
    /**
     * Create a visual effect for player respawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    /**
     * Create a player circle at the specified position
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createPlayerCircle(x, y) {
        // Only allow one circle per player at a time
        if (this.playerCircle) {
            // If player already has an active circle, remove it
            this.removePlayerCircle();
        }
        
        // Create circle data to send to server
        const circleData = {
            x: x,
            y: y,
            radius: 100, // Fixed radius of 100
            playerId: this.socketManager.getPlayerId()
        };
        
        // Show circle creation effect on crosshair
        this.circleCrosshairEffect();
        
        // Send to server
        this.socketManager.createCircle(circleData);
    }
    
    /**
     * Creates a circle effect on the crosshair
     */
    circleCrosshairEffect() {
        if (this.crosshair) {
            // Stop any existing tween to prevent conflicts
            this.tweens.killTweensOf(this.crosshair);
            
            // Store original position
            const x = this.crosshair.x;
            const y = this.crosshair.y;
            
            // Create expanding circle effect
            const circleEffect = this.add.circle(x, y, 5, 0x00AAFF, 0.5);
            circleEffect.setDepth(999); // Just below the crosshair
            
            // Animate the circle expanding
            this.tweens.add({
                targets: circleEffect,
                radius: 30,
                alpha: 0,
                duration: 400,
                onComplete: () => {
                    circleEffect.destroy();
                }
            });
            
            // Make crosshair pulse with blue color
            this.tweens.add({
                targets: this.crosshair,
                scale: 1.3,
                duration: 200,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    /**
     * Remove the player's circle
     */
    removePlayerCircle() {
        if (this.playerCircle) {
            // Remove update callback if exists
            if (this.playerCircle.updateCallback) {
                this.events.off('update', this.playerCircle.updateCallback);
            }
            
            // Destroy all components
            if (this.playerCircle.graphics) this.playerCircle.graphics.destroy();
            if (this.playerCircle.fog) this.playerCircle.fog.destroy();
            if (this.playerCircle.visibleArea) this.playerCircle.visibleArea.destroy();
            
            // Notify server (if implemented)
            this.socketManager.removeCircle(this.playerCircle.id);
            
            // Clear reference
            this.playerCircle = null;
        }
    }
    
    /**
     * Draw a circle from server data
     * @param {Object} circleData - Data about the circle
     */
    drawCircleFromServer(circleData) {
        // If it's from this player, store reference
        const isLocalPlayer = circleData.playerId === this.socketManager.getPlayerId();
        
        // Convert world position to screen position
        const camera = this.cameras.main;
        // Use the click position, not the player position
        const screenX = circleData.x - camera.scrollX;
        const screenY = circleData.y - camera.scrollY;
        
        // Create graphics object for the circle outline
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffffff, 1.0); // Line width, color, alpha
        graphics.strokeCircle(screenX, screenY, circleData.radius);
        graphics.setDepth(200); // Draw above most elements including fog mask
        graphics.setScrollFactor(0); // Fix to camera
        
        // Create a mask for the visible area - will be positioned in screen coordinates
        const visibleArea = this.add.graphics();
        visibleArea.fillStyle(0xffffff, 0.1); // White fill for the mask
        visibleArea.setScrollFactor(0); // Fix to camera
        
        // Draw the circle in screen coordinates
        visibleArea.fillCircle(circleData.x, circleData.y, circleData.radius);
        
        // Create fog overlay covering the camera viewport 
        // (will be updated to follow the camera)
        const worldWidth = 1600; // Match the world size
        const worldHeight = 1600;
        const fog = this.add.graphics();
        fog.fillStyle(0x000000, 1.0); // Black with full opacity
        fog.fillRect(0, 0, worldWidth, worldHeight);
        fog.setDepth(100); // Below the circle outline but above game elements
        fog.setScrollFactor(0); // Make the fog stay fixed to the camera
        
        // Set the mask to show/hide appropriate parts
        const mask = new Phaser.Display.Masks.GeometryMask(this, visibleArea);
        fog.setMask(mask);
        
        // Create a circle object to track all components
        const circleObject = {
            id: circleData.id,
            x: circleData.x,
            y: circleData.y,
            radius: circleData.radius,
            playerId: circleData.playerId,
            graphics: graphics,
            fog: fog,
            visibleArea: visibleArea,
            mask: mask,
            insideCircle: false, // Track if player is inside
            lastCameraX: 0, // Track camera position to detect movement
            lastCameraY: 0
        };
        
        // Store reference
        if (isLocalPlayer) {
            this.playerCircle = circleObject;
        } else {
            this.otherPlayerCircles[circleData.id] = circleObject;
        }
        
        // Update fog mask visibility based on player position immediately
        this.updateCircleVisibility(circleObject);
        
        // Set up continuous visibility check, camera tracking, and circle position updates
        const updateVisibilityAndPosition = () => {
            // Update the circle position based on the camera movement
            if (graphics && visibleArea) {
                // Get current camera position
                const camera = this.cameras.main;
                if (camera) {
                    // Update outline position
                    graphics.clear();
                    graphics.lineStyle(2, 0xffffff, 1.0);
                    
                    // Convert the fixed circle world position to screen space
                    // Use the original click position from circleData, not the player position
                    const screenX = circleData.x - camera.scrollX;
                    const screenY = circleData.y - camera.scrollY;
                    
                    // Draw at screen coordinates
                    graphics.strokeCircle(screenX, screenY, circleData.radius);
                    
                    // Do NOT update circleObject.x/y - it should stay at the original click position
                }
            }
            
            // Then update visibility
            this.updateCircleVisibility(circleObject);
        };
        
        // Add update callback for this circle
        this.events.on('update', updateVisibilityAndPosition);
        circleObject.updateCallback = updateVisibilityAndPosition;
        
        // Auto-remove after 5 seconds
        this.time.delayedCall(5000, () => {
            if (isLocalPlayer) {
                if (this.playerCircle && this.playerCircle.id === circleData.id) {
                    // Remove update callback first
                    if (this.playerCircle.updateCallback) {
                        this.events.off('update', this.playerCircle.updateCallback);
                    }
                    this.removePlayerCircle();
                }
            } else {
                if (this.otherPlayerCircles[circleData.id]) {
                    // Remove update callback first
                    if (this.otherPlayerCircles[circleData.id].updateCallback) {
                        this.events.off('update', this.otherPlayerCircles[circleData.id].updateCallback);
                    }
                    this.removeCircle(circleData.id);
                }
            }
        });
    }
    
    /**
     * Update a circle's fog visibility based on player position
     * @param {Object} circle - The circle to update
     */
    updateCircleVisibility(circle) {
        if (!circle || !this.player || !circle.fog || !this.cameras || !this.cameras.main) return;
        
        const camera = this.cameras.main;
        
        // Track camera position to update fog position if camera moved
        const cameraX = camera.scrollX;
        const cameraY = camera.scrollY;
        const cameraWidth = camera.width;
        const cameraHeight = camera.height;
        
        // Check if camera has moved
        const cameraChanged = (circle.lastCameraX !== cameraX || circle.lastCameraY !== cameraY);
        
        // Calculate distance between player and circle center
        const dist = Phaser.Math.Distance.Between(
            this.player.sprite.x, 
            this.player.sprite.y, 
            circle.x, 
            circle.y
        );
        
        // Check if player is inside the circle
        const isInside = dist <= circle.radius;
        
        // We need to update if either:
        // 1. The circle visibility state has changed (player went in/out of the circle)
        // 2. The camera position has changed (user is exploring the map)
        if (circle.insideCircle !== isInside || cameraChanged) {
            // Save camera position for next comparison
            circle.lastCameraX = cameraX;
            circle.lastCameraY = cameraY;
            
            // Update the fog to match the current viewport and offset for camera position
            circle.fog.clear();
            
            // Update mask position based on camera movement
            circle.visibleArea.clear();
            circle.visibleArea.fillStyle(0xffffff, 0.1);
            
            // Convert original click position from world to screen coordinates
            const screenX = circle.x - camera.scrollX;
            const screenY = circle.y - camera.scrollY;
            
            // Draw the circle in screen coordinates to match the camera
            circle.visibleArea.fillCircle(screenX, screenY, circle.radius);
            
            // Set inside/outside visibility state
            circle.insideCircle = isInside;
            
            // Update fog rendering based on visibility state
            circle.fog.fillStyle(0x000000, 1.0);
            
            // Draw a filled rect covering the entire viewport plus a buffer
            // (Make the fog slightly larger than needed to avoid seeing edges during movement)
            const worldWidth = 1600;
            const worldHeight = 1600;
            circle.fog.fillRect(0, 0, worldWidth, worldHeight);
            
            // Set mask behavior based on whether player is inside or outside the circle
            circle.fog.mask.invertAlpha = isInside;
        }
    }
    
    /**
     * Remove a circle by ID
     * @param {string} circleId - ID of the circle to remove
     */
    removeCircle(circleId) {
        if (this.otherPlayerCircles[circleId]) {
            const circle = this.otherPlayerCircles[circleId];
            
            // Remove update callback if exists
            if (circle.updateCallback) {
                this.events.off('update', circle.updateCallback);
            }
            
            // Destroy all components
            if (circle.graphics) circle.graphics.destroy();
            if (circle.fog) circle.fog.destroy();
            if (circle.visibleArea) circle.visibleArea.destroy();
            
            // Remove reference
            delete this.otherPlayerCircles[circleId];
        }
    }
    
    /**
     * Create a visual effect for player respawn
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createRespawnEffect(x, y) {
        // Create energy ring to show respawn location
        const energyRing = this.add.circle(x, y, 0, 0x00ffff, 0.8);
        energyRing.setDepth(5);
        
        // Animate the ring
        this.tweens.add({
            targets: energyRing,
            radius: 80,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.Out',
            onComplete: () => energyRing.destroy()
        });
        
        // Create energy particles
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const distance = 30;
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                5,
                0x00ffff,
                1
            );
            particle.setDepth(6);
            
            // Animate particles moving inward
            this.tweens.add({
                targets: particle,
                x: x,
                y: y,
                alpha: 0,
                duration: 500,
                ease: 'Cubic.In',
                onComplete: () => particle.destroy()
            });
        }
        
        // Create flash at the end
        this.time.delayedCall(500, () => {
            const flash = this.add.circle(x, y, 60, 0xffffff, 0.8);
            flash.setDepth(7);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 1.5,
                duration: 300,
                onComplete: () => flash.destroy()
            });
        });
    }
    
    /**
     * Create a special visual effect for character change
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} charType - The new character type
     */
    createCharacterChangeEffect(x, y, charType) {
        // Get color based on character type
        let color;
        switch(charType) {
            case 'dinosaur':
                color = 0x00ff00; // Green for dinosaur
                break;
            case 'magic':
                color = 0x9900ff; // Purple for wizard
                break;
            case 'character':
                color = 0xff9900; // Orange for human
                break;
            default:
                color = 0xffff00; // Yellow as fallback
        }
        
        // Create a larger, more dramatic energy ring
        const energyRing = this.add.circle(x, y, 60, color, 0.9);
        energyRing.setDepth(5);
        
        // Animate the ring
        this.tweens.add({
            targets: energyRing,
            radius: 120,
            alpha: 0,
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => energyRing.destroy()
        });
        
        // Create an inner ring with opposite direction animation
        const innerRing = this.add.circle(x, y, 100, 0xffffff, 0.7);
        innerRing.setDepth(5);
        this.tweens.add({
            targets: innerRing,
            radius: 20,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.In',
            onComplete: () => innerRing.destroy()
        });
        
        // Create energy particles - more of them and more dramatic
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const distance = 80;
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                Math.random() * 6 + 2, // Random size for more variety
                color,
                1
            );
            particle.setDepth(6);
            
            // Animate particles moving inward with slight randomness
            this.tweens.add({
                targets: particle,
                x: x + (Math.random() * 20 - 10), // Add a little random offset
                y: y + (Math.random() * 20 - 10),
                alpha: 0,
                scale: Math.random() * 0.5 + 0.5, // Random scale change
                duration: 700 + Math.random() * 300, // Random duration
                ease: 'Cubic.In',
                onComplete: () => particle.destroy()
            });
        }
        
        // Create rotating triangles for a more magical effect
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const distance = 50;
            
            // Create a triangle shape
            const triangle = this.add.triangle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                0, -10, // First point (top)
                -8, 5,  // Second point (bottom left)
                8, 5,   // Third point (bottom right)
                color
            );
            triangle.setAlpha(0.8);
            triangle.setDepth(6);
            triangle.angle = angle * (180 / Math.PI); // Convert radians to degrees
            
            // Animate triangle - rotating and moving inward
            this.tweens.add({
                targets: triangle,
                x: x,
                y: y,
                angle: triangle.angle + 270, // Rotate 3/4 circle
                alpha: 0,
                scale: 0.5,
                duration: 800,
                ease: 'Cubic.In',
                onComplete: () => triangle.destroy()
            });
        }
        
        // Create grand flash at the end
        this.time.delayedCall(750, () => {
            const flash = this.add.circle(x, y, 100, 0xffffff, 0.9);
            flash.setDepth(7);
            
            // Create radial rays emanating from center
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const ray = this.add.rectangle(
                    x, y,
                    10, 1, // Width and height
                    color
                );
                ray.setAlpha(0.8);
                ray.setDepth(6);
                ray.setOrigin(0, 0.5); // Set origin to left center
                ray.rotation = angle;
                
                // Animate rays outward
                this.tweens.add({
                    targets: ray,
                    scaleX: 15, // Stretch outward
                    alpha: 0,
                    duration: 600,
                    ease: 'Cubic.Out',
                    onComplete: () => ray.destroy()
                });
            }
            
            // Animate flash
            this.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 2,
                duration: 500,
                onComplete: () => flash.destroy()
            });
            
            // Play a sound if available
            if (this.shootSound) {
                this.shootSound.play({ volume: 0.5 });
            }
        });
    }
    
    /**
     * Check if a position is visible within the camera's viewport
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @returns {boolean} Whether the position is visible
     */
    isPositionVisible(x, y) {
        if (!this.cameras || !this.cameras.main) return false;
        
        const camera = this.cameras.main;
        
        // Get camera viewport boundaries
        const cameraLeft = camera.scrollX;
        const cameraRight = camera.scrollX + camera.width;
        const cameraTop = camera.scrollY;
        const cameraBottom = camera.scrollY + camera.height;
        
        // Check if the position is within these boundaries
        return (
            x >= cameraLeft && 
            x <= cameraRight && 
            y >= cameraTop && 
            y <= cameraBottom
        );
    }
    
    /**
     * Creates a custom crosshair cursor that follows the mouse
     */
    createCustomCrosshair() {
        // Create a container for the crosshair elements
        this.crosshair = this.add.container(0, 0);
        this.crosshair.setDepth(1000); // Very high depth to ensure it's on top
        
        // Create the crosshair shape using graphics
        const crosshairGraphics = this.add.graphics();
        
        // Draw outer circle
        crosshairGraphics.lineStyle(2, 0xFFFFFF, 1);
        crosshairGraphics.strokeCircle(0, 0, 10);
        
        // Draw center dot
        crosshairGraphics.fillStyle(0xFF0000, 1);
        crosshairGraphics.fillCircle(0, 0, 2);
        
        // Draw horizontal and vertical lines
        crosshairGraphics.lineStyle(1, 0xFFFFFF, 1);
        // Left line
        crosshairGraphics.lineBetween(-18, 0, -5, 0);
        // Right line
        crosshairGraphics.lineBetween(5, 0, 18, 0);
        // Top line
        crosshairGraphics.lineBetween(0, -18, 0, -5);
        // Bottom line
        crosshairGraphics.lineBetween(0, 5, 0, 18);
        
        // Add the graphics to the container
        this.crosshair.add(crosshairGraphics);
        
        // Set crosshair to not scroll with camera
        this.crosshair.setScrollFactor(0);
        
        // Update crosshair position in the game loop
        this.input.on('pointermove', (pointer) => {
            if (this.crosshair) {
                this.crosshair.x = pointer.x;
                this.crosshair.y = pointer.y;
            }
        });
    }
    
    createRespawnEffect(x, y) {
        // Create a respawn circle that expands outward
        const respawnCircle = this.add.circle(x, y, 0, 0x00ffff, 0.6);
        respawnCircle.setDepth(5);
        
        // Animate the respawn circle
        this.tweens.add({
            targets: respawnCircle,
            radius: 50,
            alpha: 0,
            duration: 800,
            onComplete: () => respawnCircle.destroy()
        });
        
        // Create some small particles
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 10;
            const size = 2 + Math.random() * 3;
            
            const particle = this.add.circle(
                x + Math.cos(angle) * distance, 
                y + Math.sin(angle) * distance, 
                size, 
                0x00ffff
            );
            particle.setDepth(6);
            particle.setAlpha(0);
            
            // Animate particles moving inward
            this.tweens.add({
                targets: particle,
                x: x,
                y: y,
                alpha: { from: 0, to: 0.8, duration: 300 },
                scale: { from: 0.5, to: 1.5, duration: 400 },
                ease: 'Sine.easeIn',
                duration: 500,
                onComplete: () => {
                    this.tweens.add({
                        targets: particle,
                        alpha: 0,
                        scale: 0,
                        duration: 300,
                        onComplete: () => particle.destroy()
                    });
                }
            });
        }
    }
    
    /**
     * Show the connection status on screen
     * @param {boolean} connected - Whether we're connected to the server
     * @param {string} message - Optional message to show
     */
    showConnectionStatus(connected, message = '') {
        // Remove existing status text if it exists
        if (this.connectionStatusText) {
            this.connectionStatusText.destroy();
        }
        
        // Create message text
        let statusText = connected ? 'Connected to server' : 'Disconnected from server';
        if (message && !connected) {
            statusText += `: ${message}`;
        }
        
        // Create status text
        this.connectionStatusText = this.add.text(
            10, 
            10, 
            statusText, 
            {
                fontSize: '14px',
                fontStyle: connected ? 'normal' : 'bold',
                fill: connected ? '#00FF00' : '#FF0000',
                stroke: '#000000',
                strokeThickness: 2,
                backgroundColor: '#00000099',
                padding: { x: 5, y: 2 }
            }
        );
        this.connectionStatusText.setScrollFactor(0);
        this.connectionStatusText.setDepth(1000);
        
        // If connected, fade out after 5 seconds
        if (connected) {
            this.time.delayedCall(5000, () => {
                if (this.connectionStatusText) {
                    this.tweens.add({
                        targets: this.connectionStatusText,
                        alpha: 0,
                        duration: 1000,
                        onComplete: () => {
                            if (this.connectionStatusText) {
                                this.connectionStatusText.destroy();
                                this.connectionStatusText = null;
                            }
                        }
                    });
                }
            });
        }
    }
    
    update() {
        // Skip if player not created yet
        if (!this.player) return;
        
        // Update all players' visuals
        this.player.update();
        
        // Update minimap player position
        if (this.ui && this.player.sprite) {
            this.ui.updateMinimapPlayer(
                this.socketManager.getPlayerId(),
                this.player.sprite.x,
                this.player.sprite.y,
                true // This is the local player
            );
        }
        
        // Update other players
        Object.values(this.otherPlayers).forEach(otherPlayer => {
            otherPlayer.update();
            
            // Check if other player is visible in viewport
            const isVisible = otherPlayer.sprite && 
                              this.isPositionVisible(otherPlayer.sprite.x, otherPlayer.sprite.y);
            
            // Update other player positions on minimap
            if (this.ui && otherPlayer.sprite) {
                this.ui.updateMinimapPlayer(
                    otherPlayer.id,
                    otherPlayer.sprite.x,
                    otherPlayer.sprite.y,
                    false, // Not the local player
                    isVisible // Only show on minimap if visible in viewport
                );
            }
        });
        
        // Skip game controls if:
        // - player is defeated
        // - input field is focused
        // - character selection screen is active
        if (this.isDefeated || 
            (this.ui && typeof this.ui.isInputActive === 'function' && this.ui.isInputActive()) || 
            (this.ui && this.ui.isCharacterSelectionActive)) return;
        
        // Create input object based on cursor keys and mobile joystick
        const inputs = {
            left: this.cursors.left.isDown || this.wasdKeys.left.isDown,
            right: this.cursors.right.isDown || this.wasdKeys.right.isDown,
            up: this.cursors.up.isDown || this.wasdKeys.up.isDown,
            down: this.cursors.down.isDown || this.wasdKeys.down.isDown
        };
        
        // Add mobile joystick input if active
        if (this.joystickActive && this.joystickInputX !== undefined && this.joystickInputY !== undefined) {
            // Convert joystick position to directional inputs
            if (this.joystickInputX < -0.3) inputs.left = true;
            if (this.joystickInputX > 0.3) inputs.right = true;
            if (this.joystickInputY < -0.3) inputs.up = true;
            if (this.joystickInputY > 0.3) inputs.down = true;
        }
        
        // Only send inputs if we're connected
        if (this.socketManager.connected) {
            this.socketManager.sendPlayerInput(inputs);
        }
        
        // Handle local animation based on inputs
        let moving = false;
        
        // Determine new direction based on input combination
        let direction = this.lastDirection; // Start with current direction
        
        if (inputs.up && inputs.left) {
            direction = 'up-left';
            moving = true;
        } else if (inputs.up && inputs.right) {
            direction = 'up-right';
            moving = true;
        } else if (inputs.down && inputs.left) {
            direction = 'down-left';
            moving = true;
        } else if (inputs.down && inputs.right) {
            direction = 'down-right';
            moving = true;
        } else if (inputs.left) {
            direction = 'left';
            moving = true;
        } else if (inputs.right) {
            direction = 'right';
            moving = true;
        } else if (inputs.up) {
            direction = 'up';
            moving = true;
        } else if (inputs.down) {
            direction = 'down';
            moving = true;
        }
        
        // Update lastDirection if we're moving
        if (moving) {
            this.lastDirection = direction;
        }
        
        // Play appropriate animation
        this.player.playAnimation(direction, moving);
    }
}