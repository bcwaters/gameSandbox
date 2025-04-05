/**
 * UserInterface class for managing game UI elements
 */
class UserInterface {
    /**
     * Create a new user interface
     * @param {Phaser.Scene} scene - The scene this UI belongs to
     */
    constructor(scene) {
        this.scene = scene;
        this.healthBarUI = null;
        this.ammoCounterText = null;
        this.scoreCounterText = null;
        this.defeatText = null;
        this.minimap = null;
        this.minimapPlayers = {};
        this.maxHealth = 5;
        this.maxAmmo = 10;
        
        // UI configuration
        this.UI_HEIGHT = 50;  // Height of the UI navbar
        this.UI_PADDING = 10; // Padding inside the navbar
        this.UI_BG_COLOR = 0x222222; // Dark gray background
        this.UI_BG_ALPHA = 0.8; // Semi-transparent background
        
        // Minimap configuration
        this.MINIMAP_SIZE = 150; // Size of the minimap in pixels
        this.MINIMAP_SCALE = 0.09375; // Scale factor (150/1600 = 0.09375)
        
        // Create UI container and background
        this.createUIContainer();
        
        // Create UI elements
        this.createHealthBar();
        this.createScoreCounter(); // Changed order to Health -> Score -> Ammo
        this.createAmmoCounter();
        this.createDefeatText();
        this.createMinimap();
        
        // Create character selection screen (hidden initially)
        this.createCharacterSelectionScreen();
        
        // Create in-game character selector for changes after spawn
        this.createCharacterSelector();
        
        // Set up name input handlers
        this.setupNameInput();
    }
    
    /**
     * Create the character selection screen that appears before the player spawns
     */
    createCharacterSelectionScreen() {
        // Create the overlay container
        this.selectionOverlay = document.createElement('div');
        this.selectionOverlay.id = 'characterSelectionOverlay';
        this.selectionOverlay.style.position = 'fixed';
        this.selectionOverlay.style.top = '0';
        this.selectionOverlay.style.left = '0';
        this.selectionOverlay.style.width = '100%';
        this.selectionOverlay.style.height = '100%';
        this.selectionOverlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        this.selectionOverlay.style.display = 'flex';
        this.selectionOverlay.style.flexDirection = 'column';
        this.selectionOverlay.style.justifyContent = 'center';
        this.selectionOverlay.style.alignItems = 'center';
        this.selectionOverlay.style.zIndex = '2000';
        
        // Create title
        const title = document.createElement('h1');
        title.textContent = 'Choose Your Character';
        title.style.color = 'white';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.fontSize = '36px';
        title.style.marginBottom = '30px';
        title.style.textShadow = '0 0 10px #0088ff';
        
        // Create character selection container
        const selectionContainer = document.createElement('div');
        selectionContainer.style.display = 'flex';
        selectionContainer.style.justifyContent = 'center';
        selectionContainer.style.gap = '40px';
        
        // Character options with images
        const characterTypes = [
            { value: 'dinosaur', label: 'Dinosaur', image: '/sprites/dinosaur.png' },
            { value: 'character', label: 'Human', image: '/sprites/character_1.png' },
            { value: 'magic', label: 'Wizard', image: '/sprites/magic.png' }
        ];
        
        // Create a card for each character
        characterTypes.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.style.width = '200px';
            card.style.height = '280px';
            card.style.backgroundColor = 'rgba(20,20,20,0.8)';
            card.style.border = '2px solid #444';
            card.style.borderRadius = '10px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.padding = '15px';
            card.style.cursor = 'pointer';
            card.style.transition = 'all 0.2s ease';
            
            // Character image
            const image = document.createElement('img');
            image.src = char.image;
            image.style.width = '120px';
            image.style.height = '120px';
            image.style.objectFit = 'contain';
            image.style.marginBottom = '15px';
            image.style.imageRendering = 'pixelated';
            
            // Character name
            const name = document.createElement('h2');
            name.textContent = char.label;
            name.style.color = 'white';
            name.style.fontFamily = 'Arial, sans-serif';
            name.style.fontSize = '24px';
            name.style.margin = '0 0 10px 0';
            
            // Add hover effects
            card.addEventListener('mouseover', () => {
                card.style.backgroundColor = 'rgba(40,40,40,0.9)';
                card.style.borderColor = '#0088ff';
                card.style.boxShadow = '0 0 15px rgba(0,136,255,0.6)';
                card.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseout', () => {
                card.style.backgroundColor = 'rgba(20,20,20,0.8)';
                card.style.borderColor = '#444';
                card.style.boxShadow = 'none';
                card.style.transform = 'translateY(0)';
            });
            
            // Add click handler to select character
            card.addEventListener('click', () => {
                // Update game config with selected character
                GameConfig.setPlayerCharacter(char.value);
                
                // Hide the selection screen
                this.hideCharacterSelectionScreen();
                
                // Notify the scene that a character has been selected
                this.scene.onCharacterSelected(char.value);
            });
            
            // Append elements to card
            card.appendChild(image);
            card.appendChild(name);
            
            // Add the card to the container
            selectionContainer.appendChild(card);
        });
        
        // Name input section
        const nameSection = document.createElement('div');
        nameSection.style.marginTop = '30px';
        nameSection.style.display = 'flex';
        nameSection.style.flexDirection = 'column';
        nameSection.style.alignItems = 'center';
        
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Enter Your Name:';
        nameLabel.style.color = 'white';
        nameLabel.style.fontFamily = 'Arial, sans-serif';
        nameLabel.style.fontSize = '18px';
        nameLabel.style.marginBottom = '10px';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'initialNameInput';
        nameInput.maxLength = 12;
        nameInput.style.padding = '8px 12px';
        nameInput.style.fontSize = '16px';
        nameInput.style.width = '200px';
        nameInput.style.backgroundColor = '#222';
        nameInput.style.color = 'white';
        nameInput.style.border = '1px solid #555';
        nameInput.style.borderRadius = '4px';
        nameInput.style.marginBottom = '15px';
        nameInput.value = `Player${Math.floor(Math.random() * 1000)}`;
        
        // Append elements
        nameSection.appendChild(nameLabel);
        nameSection.appendChild(nameInput);
        
        // Assemble the overlay
        this.selectionOverlay.appendChild(title);
        this.selectionOverlay.appendChild(selectionContainer);
        this.selectionOverlay.appendChild(nameSection);
        
        // Initially hide the overlay, will be shown when needed
        this.selectionOverlay.style.display = 'none';
        
        // Add to DOM
        document.body.appendChild(this.selectionOverlay);
        
        // Store the name input for later access
        this.initialNameInput = nameInput;
    }
    
    /**
     * Show the character selection screen
     */
    showCharacterSelectionScreen() {
        if (this.selectionOverlay) {
            this.selectionOverlay.style.display = 'flex';
        }
    }
    
    /**
     * Hide the character selection screen
     */
    hideCharacterSelectionScreen() {
        if (this.selectionOverlay) {
            this.selectionOverlay.style.display = 'none';
        }
    }
    
    /**
     * Get the player's name from the initial input
     */
    getInitialPlayerName() {
        if (this.initialNameInput) {
            return this.initialNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
        }
        return `Player${Math.floor(Math.random() * 1000)}`;
    }
    
    /**
     * Create the main UI container and background
     */
    createUIContainer() {
        // Create a container for all UI elements
        this.uiContainer = this.scene.add.container(0, 0);
        this.uiContainer.setScrollFactor(0); // Fix to camera
        this.uiContainer.setDepth(100); // Ensure UI is always on top
        
        // Create background for UI navbar
        this.uiBackground = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2, // Center horizontally
            this.UI_HEIGHT / 2, // Position at half the height (for center alignment)
            this.scene.cameras.main.width, // Full width
            this.UI_HEIGHT, // Fixed height
            this.UI_BG_COLOR,
            this.UI_BG_ALPHA
        );
        
        // Add separator line
        this.uiSeparator = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2, // Center horizontally
            this.UI_HEIGHT, // Bottom of navbar
            this.scene.cameras.main.width, // Full width
            2, // Line thickness
            0xFFFFFF, // White line
            0.5 // Semi-transparent
        );
        
        // Add background and separator to container
        this.uiContainer.add(this.uiBackground);
        this.uiContainer.add(this.uiSeparator);
    }
    
    /**
     * Create the health bar UI
     */
    createHealthBar() {
        // Calculate position - left side of navbar
        const startX = this.UI_PADDING + 50; // Padding + space for label
        const centerY = this.UI_HEIGHT / 2;
        
        this.healthBarUI = {
            container: this.scene.add.container(0, 0),
            label: this.scene.add.text(this.UI_PADDING, centerY, 'HP:', {
                fontSize: '16px',
                fill: '#FFFFFF',
                fontStyle: 'bold'
            }),
            background: this.scene.add.rectangle(startX + 55, centerY, 110, 20, 0x000000, 0.5),
            slots: []
        };
        
        // Center the label vertically
        this.healthBarUI.label.setOrigin(0, 0.5);
        
        // Add elements to container
        this.uiContainer.add(this.healthBarUI.label);
        this.uiContainer.add(this.healthBarUI.background);
        
        // Create health slots
        for (let i = 0; i < this.maxHealth; i++) {
            const healthSlot = this.scene.add.rectangle(
                startX + 10 + (i * 18), centerY,  // x, y position
                15, 15,                           // width, height
                0x00ff00,                         // color when full
                1                                 // alpha
            );
            
            this.healthBarUI.slots.push(healthSlot);
            this.uiContainer.add(healthSlot);
        }
        
        // Initial update to show full health
        this.updateHealthBar(this.maxHealth);
    }
    
    /**
     * Create the score counter UI - positioned in the center of the navbar
     */
    createScoreCounter() {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.UI_HEIGHT / 2;
        
        // Create a container for score elements
        this.scoreContainer = this.scene.add.container(0, 0);
        
        // Create label and score text
        this.scoreLabel = this.scene.add.text(centerX - 60, centerY, 'SCORE:', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontStyle: 'bold'
        });
        this.scoreLabel.setOrigin(0, 0.5);
        
        this.scoreCounterText = this.scene.add.text(centerX, centerY, '0', { 
            fontSize: '20px', 
            fill: '#ffff00', // Yellow text for score
            fontStyle: 'bold'
        });
        this.scoreCounterText.setOrigin(0, 0.5);
        
        // Add to UI container
        this.uiContainer.add(this.scoreLabel);
        this.uiContainer.add(this.scoreCounterText);
    }
    
    /**
     * Create the ammo counter UI - positioned on the right side of the navbar
     */
    createAmmoCounter() {
        const rightSide = this.scene.cameras.main.width - this.UI_PADDING;
        const centerY = this.UI_HEIGHT / 2;
        
        // Create ammo label and counter
        this.ammoLabel = this.scene.add.text(rightSide - 120, centerY, 'AMMO:', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontStyle: 'bold'
        });
        this.ammoLabel.setOrigin(0, 0.5);
        
        this.ammoCounterText = this.scene.add.text(rightSide - 60, centerY, `${this.maxAmmo}/${this.maxAmmo}`, { 
            fontSize: '18px', 
            fill: '#00ffff', // Cyan text for ammo
            fontStyle: 'bold'
        });
        this.ammoCounterText.setOrigin(0, 0.5);
        
        // Add to UI container
        this.uiContainer.add(this.ammoLabel);
        this.uiContainer.add(this.ammoCounterText);
    }
    
    /**
     * Create the defeat text (initially hidden)
     */
    createDefeatText() {
        // Position in center of game area (below UI)
        this.defeatText = this.scene.add.text(
            this.scene.cameras.main.width / 2, 
            this.UI_HEIGHT + (this.scene.cameras.main.height - this.UI_HEIGHT) / 2,
            'DEFEATED', 
            {
                fontSize: '64px',
                fontWeight: 'bold',
                fill: '#ff0000',
                stroke: '#000',
                strokeThickness: 6,
                shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
            }
        );
        this.defeatText.setOrigin(0.5); // Center the text
        this.defeatText.setScrollFactor(0); // Fix to camera
        this.defeatText.setDepth(100); // Make sure it appears on top
        this.defeatText.setVisible(false); // Hide initially
    }
    
    /**
     * Set up name input handlers
     */
    /**
     * Create the character selector UI
     */
    createCharacterSelector() {
        // Create character selector container
        const selectorContainer = document.createElement('div');
        selectorContainer.id = 'characterSelectorContainer';
        selectorContainer.style.position = 'absolute';
        selectorContainer.style.right = '20px';
        selectorContainer.style.top = '45px'; // Below the name input
        selectorContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
        selectorContainer.style.padding = '8px';
        selectorContainer.style.borderRadius = '5px';
        selectorContainer.style.zIndex = '1000';
        
        // Create label for the selector
        const selectorLabel = document.createElement('span');
        selectorLabel.textContent = 'Character: ';
        selectorLabel.style.color = 'white';
        selectorLabel.style.fontFamily = 'Arial, sans-serif';
        selectorLabel.style.fontSize = '14px';
        selectorLabel.style.marginRight = '5px';
        
        // Create the dropdown
        this.characterSelector = document.createElement('select');
        this.characterSelector.id = 'characterSelector';
        this.characterSelector.style.padding = '3px';
        this.characterSelector.style.borderRadius = '3px';
        this.characterSelector.style.backgroundColor = '#222';
        this.characterSelector.style.color = 'white';
        this.characterSelector.style.border = '1px solid #555';
        
        // Add options for each character type
        const characterTypes = [
            { value: 'dinosaur', label: 'Dinosaur' },
            { value: 'character', label: 'Human' },
            { value: 'magic', label: 'Wizard' }
        ];
        
        characterTypes.forEach(char => {
            const option = document.createElement('option');
            option.value = char.value;
            option.textContent = char.label;
            // Set the default selected option based on current config
            if (char.value === GameConfig.getPlayerCharacter()) {
                option.selected = true;
            }
            this.characterSelector.appendChild(option);
        });
        
        // Add change event handler
        this.characterSelector.addEventListener('change', () => {
            const selectedChar = this.characterSelector.value;
            // Update game config
            GameConfig.setPlayerCharacter(selectedChar);
            
            // If the player already exists, force a respawn
            if (this.scene.player) {
                // Create floating notification
                const notification = this.scene.add.text(
                    this.scene.cameras.main.width / 2,
                    100,
                    'Changing character...',
                    {
                        fontSize: '18px',
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
                this.scene.tweens.add({
                    targets: notification,
                    alpha: 0,
                    y: 80,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => notification.destroy()
                });
                
                // Create temporary player defeat effect
                if (this.scene.player && this.scene.player.sprite) {
                    const playerX = this.scene.player.sprite.x;
                    const playerY = this.scene.player.sprite.y;
                    
                    // Create a flash effect
                    const flash = this.scene.add.circle(
                        playerX, playerY, 40, 0xffffff, 0.8
                    );
                    this.scene.tweens.add({
                        targets: flash,
                        alpha: 0,
                        scale: 2,
                        duration: 300,
                        onComplete: () => flash.destroy()
                    });
                }
                
                // Force immediate respawn to change character
                this.scene.resetPlayer();
            }
        });
        
        // Append elements to the container
        selectorContainer.appendChild(selectorLabel);
        selectorContainer.appendChild(this.characterSelector);
        document.body.appendChild(selectorContainer);
    }
    
    setupNameInput() {
        this.nameInput = document.getElementById('playerName');
        this.setNameBtn = document.getElementById('setNameButton');
        this.isInputFocused = false;
        
        // Set up event listeners
        this.nameInput.addEventListener('focus', () => {
            this.isInputFocused = true;
            
            // Visual feedback when input is focused
            document.getElementById('nameInputContainer').style.backgroundColor = 'rgba(0,100,150,0.8)';
            document.getElementById('nameInputContainer').style.boxShadow = '0 0 15px rgba(0,150,255,0.6)';
            this.nameInput.style.backgroundColor = '#333';
            this.nameInput.style.borderColor = '#0af';
            
            // Completely disable Phaser keyboard input
            if (this.scene && this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = false;
            }
        });
        
        this.nameInput.addEventListener('blur', () => {
            this.isInputFocused = false;
            
            // Reset visual style when input loses focus
            document.getElementById('nameInputContainer').style.backgroundColor = 'rgba(0,0,0,0.7)';
            document.getElementById('nameInputContainer').style.boxShadow = 'none';
            this.nameInput.style.backgroundColor = '#222';
            this.nameInput.style.borderColor = '#555';
            
            // Re-enable Phaser keyboard input
            if (this.scene && this.scene.input && this.scene.input.keyboard) {
                this.scene.input.keyboard.enabled = true;
            }
        });
        
        // Prevent game controls from capturing keydown events during typing
        this.nameInput.addEventListener('keydown', (e) => {
            // Stop event propagation to prevent game controls
            e.stopPropagation();
        });
        
        this.setNameBtn.addEventListener('click', () => this.handleSetPlayerName());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSetPlayerName();
                this.nameInput.blur(); // Remove focus after setting name
            }
        });
    }
    
    /**
     * Handle setting player name
     */
    handleSetPlayerName() {
        const newName = this.nameInput.value.trim();
        
        if (newName && newName.length > 0) {
            // Indicate success with style changes
            this.setNameBtn.textContent = "Updated!";
            this.setNameBtn.style.backgroundColor = "#2E7D32";
            
            // Reset button text after a short delay
            setTimeout(() => {
                this.setNameBtn.textContent = "Set Name";
                this.setNameBtn.style.backgroundColor = "#4CAF50";
                // Also reduce opacity of container (optional fade effect)
                document.getElementById('nameInputContainer').style.opacity = '0.7';
            }, 1500);
            
            // Remove focus to return to game controls
            this.nameInput.blur();
            
            // Return the new name to be used
            return newName;
        } else {
            // Indicate error with style changes
            this.setNameBtn.textContent = "Name Required";
            this.setNameBtn.style.backgroundColor = "#F44336";
            
            // Reset button text after a short delay
            setTimeout(() => {
                this.setNameBtn.textContent = "Set Name";
                this.setNameBtn.style.backgroundColor = "#4CAF50";
            }, 1500);
            
            // Keep focus on input
            this.nameInput.focus();
            
            return null;
        }
    }
    
    /**
     * Update the health bar display
     * @param {number} health - The current health value
     */
    updateHealthBar(health) {
        for (let i = 0; i < this.maxHealth; i++) {
            if (i < health) {
                // Slot is filled
                this.healthBarUI.slots[i].fillColor = 0x00ff00; // Green
                this.healthBarUI.slots[i].fillAlpha = 1;
                
                // Add a slight pulsing effect if health is low (≤ 2)
                if (health <= 2) {
                    this.scene.tweens.add({
                        targets: this.healthBarUI.slots[i],
                        alpha: 0.7,
                        duration: 300,
                        yoyo: true,
                        repeat: 1
                    });
                }
            } else {
                // Slot is empty
                this.healthBarUI.slots[i].fillColor = 0xff0000; // Red
                this.healthBarUI.slots[i].fillAlpha = 0.5;
            }
        }
    }
    
    /**
     * Update the ammo counter display
     * @param {number} ammo - The current ammo value
     */
    updateAmmoCounter(ammo) {
        this.ammoCounterText.setText(`${ammo}/${this.maxAmmo}`);
        
        // Change color based on ammo level
        if (ammo === 0) {
            this.ammoCounterText.setColor('#ff0000'); // Red when empty
        } else if (ammo <= 3) {
            this.ammoCounterText.setColor('#ffff00'); // Yellow when low
        } else {
            this.ammoCounterText.setColor('#00ffff'); // Cyan when sufficient
        }
        
        // Add a small flash effect when ammo changes
        this.scene.tweens.add({
            targets: this.ammoCounterText,
            alpha: 0.5,
            duration: 100,
            yoyo: true
        });
    }
    
    /**
     * Update the score counter display
     * @param {number} score - The current score value
     */
    updateScoreCounter(score) {
        if (this.scoreCounterText) {
            this.scoreCounterText.setText(`${score}`);
            
            // Add a pop-up animation effect
            this.scene.tweens.add({
                targets: this.scoreCounterText,
                scale: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }
    }
    
    /**
     * Show the defeat text with animation
     */
    showDefeatText() {
        if (this.defeatText) {
            this.defeatText.setVisible(true);
            
            // Add a cool animation effect
            this.scene.tweens.add({
                targets: this.defeatText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 500,
                yoyo: true,
                repeat: 3
            });
        }
    }
    
    /**
     * Hide the defeat text
     */
    hideDefeatText() {
        if (this.defeatText) {
            this.defeatText.setVisible(false);
        }
    }
    
    /**
     * Check if the input is currently focused
     * @returns {boolean} Whether the input is focused
     */
    isInputActive() {
        return this.isInputFocused;
    }
    
    /**
     * Set the name input value
     * @param {string} name - The name to set
     */
    setNameInputValue(name) {
        if (this.nameInput) {
            this.nameInput.value = name;
        }
    }
    
    /**
     * Create the minimap
     */
    createMinimap() {
        // Calculate position (bottom right of screen)
        const posX = this.scene.cameras.main.width - this.MINIMAP_SIZE - 20;
        const posY = this.scene.cameras.main.height - this.MINIMAP_SIZE - 20;
        
        // Create minimap container
        this.minimap = this.scene.add.container(posX, posY);
        this.minimap.setScrollFactor(0); // Fix to camera
        this.minimap.setDepth(90); // Below main UI but above most game elements
        
        // Create minimap background
        this.minimapBg = this.scene.add.rectangle(
            0, 0, // Position within container
            this.MINIMAP_SIZE, this.MINIMAP_SIZE, // Size
            0x000000, 0.7 // Black with transparency
        );
        this.minimapBg.setOrigin(0, 0); // Top left
        this.minimap.add(this.minimapBg);
        
        // Create minimap border
        this.minimapBorder = this.scene.add.rectangle(
            0, 0, // Position within container
            this.MINIMAP_SIZE, this.MINIMAP_SIZE, // Size
            0xFFFFFF, 1 // White border
        );
        this.minimapBorder.setOrigin(0, 0); // Top left
        this.minimapBorder.setStrokeStyle(2, 0xFFFFFF, 0.8); // 2px white stroke
        this.minimapBorder.setFillStyle(0, 0); // Transparent fill
        this.minimap.add(this.minimapBorder);
        
        // Create boundary for world representation
        this.worldBoundary = this.scene.add.rectangle(
            3, 3, // Position within container (3px padding)
            this.MINIMAP_SIZE - 6, this.MINIMAP_SIZE - 6, // Size (accounting for padding)
            0x333333, 0.1 // Almost invisible fill
        );
        this.worldBoundary.setOrigin(0, 0); // Top left
        this.worldBoundary.setStrokeStyle(1, 0x888888, 0.5); // 1px gray stroke
        this.minimap.add(this.worldBoundary);
        
        // Create "dots" container to hold player markers
        this.minimapDots = this.scene.add.container(3, 3); // Position with 3px padding
        this.minimap.add(this.minimapDots);
        
        // Add viewport indicator (showing camera view on minimap)
        this.minimapViewport = this.scene.add.rectangle(
            0, 0, // Will be updated in update method
            this.MINIMAP_SIZE * (800/1600), // Scale based on view width / world width
            this.MINIMAP_SIZE * (600/1600), // Scale based on view height / world height
            0xFFFFFF, 0
        );
        this.minimapViewport.setStrokeStyle(1, 0xFFFFFF, 0.5);
        this.minimapDots.add(this.minimapViewport);
        
        // Create label for the minimap
        this.minimapLabel = this.scene.add.text(
            this.MINIMAP_SIZE / 2, -12, 
            'MAP', 
            {
                fontSize: '12px',
                fontStyle: 'bold',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.minimapLabel.setOrigin(0.5, 0); // Center horizontally
        this.minimap.add(this.minimapLabel);
        
        // Add obstacles to minimap (static)
        this.addObstaclesToMinimap();
    }
    
    /**
     * Add static obstacles to the minimap
     */
    addObstaclesToMinimap() {
        // Get obstacles from the scene
        const obstacles = this.scene.obstacles || {};
        
        // Add each obstacle as a small dot on the minimap
        Object.values(obstacles).forEach(obstacle => {
            if (obstacle && !obstacle.isOutline) {
                const minimapX = obstacle.x * this.MINIMAP_SCALE;
                const minimapY = obstacle.y * this.MINIMAP_SCALE;
                
                const obstacleDot = this.scene.add.rectangle(
                    minimapX, minimapY, 
                    3, 3, // Small dot size
                    0x888888, 0.8 // Gray color
                );
                this.minimapDots.add(obstacleDot);
            }
        });
    }
    
    /**
     * Update a player's position on the minimap
     * @param {string} playerId - The player's ID
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {boolean} isLocalPlayer - Whether this is the local player
     * @param {boolean} isVisible - Whether this player is visible in the camera viewport (only applies to other players)
     */
    updateMinimapPlayer(playerId, x, y, isLocalPlayer, isVisible = false) {
        // Scale world coordinates to minimap coordinates
        const minimapX = x * this.MINIMAP_SCALE;
        const minimapY = y * this.MINIMAP_SCALE;
        
        // For local player or visible enemies, show on minimap
        const shouldShow = isLocalPlayer || isVisible;
        
        // If player dot doesn't exist, create it if it should be shown
        if (!this.minimapPlayers[playerId] && shouldShow) {
            // Use different colors for local player (blue) and other players (red)
            const color = isLocalPlayer ? 0x00AAFF : 0xFF4444;
            const size = isLocalPlayer ? 5 : 4;
            
            // Create player dot
            const playerDot = this.scene.add.circle(
                minimapX, minimapY, 
                size / 2, // Radius is half the size
                color, 
                1
            );
            
            // Add to tracking and container
            this.minimapPlayers[playerId] = playerDot;
            this.minimapDots.add(playerDot);
            
            // Add pulsing effect for local player
            if (isLocalPlayer) {
                this.scene.tweens.add({
                    targets: playerDot,
                    alpha: 0.7,
                    scale: 0.8,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
            }
        } else if (this.minimapPlayers[playerId]) {
            // Update existing player dot position if it exists
            this.minimapPlayers[playerId].x = minimapX;
            this.minimapPlayers[playerId].y = minimapY;
            
            // Show or hide based on visibility (always show local player)
            this.minimapPlayers[playerId].setVisible(shouldShow);
        }
        
        // If this is the local player, update the viewport indicator position
        if (isLocalPlayer && this.minimapViewport) {
            // Calculate viewport center on the minimap
            // We need to offset by half the viewport size to center it on the player
            const viewportWidth = this.minimapViewport.width;
            const viewportHeight = this.minimapViewport.height;
            
            this.minimapViewport.x = minimapX
            this.minimapViewport.y = minimapY
        }
    }
    
    /**
     * Remove a player from the minimap
     * @param {string} playerId - The player's ID
     */
    removeMinimapPlayer(playerId) {
        if (this.minimapPlayers[playerId]) {
            this.minimapPlayers[playerId].destroy();
            delete this.minimapPlayers[playerId];
        }
    }
    
    /**
     * Update all obstacles on the minimap
     */
    updateMinimapObstacles() {
        // Save a reference to the viewport indicator
        const viewport = this.minimapViewport;
        
        // Save references to all player dots
        const playerDots = {};
        Object.entries(this.minimapPlayers).forEach(([id, dot]) => {
            if (dot && dot.active) {
                playerDots[id] = {
                    dot: dot,
                    x: dot.x,
                    y: dot.y,
                    visible: dot.visible,
                    alpha: dot.alpha,
                    scale: dot.scale
                };
            }
        });
        
        // Clear existing dots
        this.minimapDots.removeAll(true);
        
        // Re-create viewport indicator if it existed
        if (viewport) {
            this.minimapViewport = this.scene.add.rectangle(
                viewport.x, viewport.y,
                viewport.width, viewport.height,
                0xFFFFFF, 0
            );
            this.minimapViewport.setStrokeStyle(1, 0xFFFFFF, 0.5);
            this.minimapDots.add(this.minimapViewport);
        }
        
        // Re-add all obstacles
        this.addObstaclesToMinimap();
        
        // Re-add all player dots with their previous properties
        Object.entries(playerDots).forEach(([id, data]) => {
            // Create a new dot with the same properties
            const isLocalPlayer = id === this.scene.socketManager.getPlayerId();
            const color = isLocalPlayer ? 0x00AAFF : 0xFF4444;
            const size = isLocalPlayer ? 5 : 4;
            
            const newDot = this.scene.add.circle(
                data.x, data.y,
                size / 2,
                color,
                1
            );
            
            // Restore visibility and other properties
            newDot.setVisible(data.visible);
            newDot.setAlpha(data.alpha);
            newDot.setScale(data.scale);
            
            // Add to tracking and container
            this.minimapPlayers[id] = newDot;
            this.minimapDots.add(newDot);
            
            // Restore pulsing effect for local player
            if (isLocalPlayer) {
                this.scene.tweens.add({
                    targets: newDot,
                    alpha: 0.7,
                    scale: 0.8,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
            }
        });
    }
}