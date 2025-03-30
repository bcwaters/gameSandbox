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
        this.maxHealth = 5;
        this.maxAmmo = 10;
        
        // UI configuration
        this.UI_HEIGHT = 50;  // Height of the UI navbar
        this.UI_PADDING = 10; // Padding inside the navbar
        this.UI_BG_COLOR = 0x222222; // Dark gray background
        this.UI_BG_ALPHA = 0.8; // Semi-transparent background
        
        // Create UI container and background
        this.createUIContainer();
        
        // Create UI elements
        this.createHealthBar();
        this.createScoreCounter(); // Changed order to Health -> Score -> Ammo
        this.createAmmoCounter();
        this.createDefeatText();
        
        // Set up name input handlers
        this.setupNameInput();
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
        });
        
        this.nameInput.addEventListener('blur', () => {
            this.isInputFocused = false;
            // Reset visual style when input loses focus
            document.getElementById('nameInputContainer').style.backgroundColor = 'rgba(0,0,0,0.7)';
            document.getElementById('nameInputContainer').style.boxShadow = 'none';
            this.nameInput.style.backgroundColor = '#222';
            this.nameInput.style.borderColor = '#555';
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
}