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
        this.defeatText = null;
        this.maxHealth = 5;
        this.maxAmmo = 10;
        
        // Create UI elements
        this.createHealthBar();
        this.createAmmoCounter();
        this.createDefeatText();
        
        // Set up name input handlers
        this.setupNameInput();
    }
    
    /**
     * Create the health bar UI
     */
    createHealthBar() {
        this.healthBarUI = {
            container: this.scene.add.container(16, 26),
            background: this.scene.add.rectangle(50, 0, 110, 25, 0x000000, 0.7),
            slots: []
        };
        
        // Add background to container
        this.healthBarUI.container.add(this.healthBarUI.background);
        
        // Create health slots
        for (let i = 0; i < this.maxHealth; i++) {
            const healthSlot = this.scene.add.rectangle(
                15 + (i * 18), 0,     // x, y position
                15, 15,               // width, height
                0x00ff00,             // color when full
                1                     // alpha
            );
            
            this.healthBarUI.slots.push(healthSlot);
            this.healthBarUI.container.add(healthSlot);
        }
        
        // Fix to camera
        this.healthBarUI.container.setScrollFactor(0);
        
        // Initial update to show full health
        this.updateHealthBar(this.maxHealth);
    }
    
    /**
     * Create the ammo counter UI
     */
    createAmmoCounter() {
        this.ammoCounterText = this.scene.add.text(16, 50, `Ammo: ${this.maxAmmo}/${this.maxAmmo}`, { 
            fontSize: '18px', 
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 5 }
        });
        this.ammoCounterText.setScrollFactor(0); // Fix to camera
    }
    
    /**
     * Create the defeat text (initially hidden)
     */
    createDefeatText() {
        this.defeatText = this.scene.add.text(
            this.scene.cameras.main.width / 2, 
            this.scene.cameras.main.height / 2,
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
        this.ammoCounterText.setText(`Ammo: ${ammo}/${this.maxAmmo}`);
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