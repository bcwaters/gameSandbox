/**
 * Main game initialization
 */
window.addEventListener('load', () => {
    // Create game configuration
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        scene: [MainScene],
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
                gravity: { y: 0 }
            }
        }
    };
    
    // Create the game instance
    const game = new Phaser.Game(config);
    
    // Handle user name input UI
    setupNameInput();
});

/**
 * Set up name input handlers outside of the Phaser game
 */
function setupNameInput() {
    const nameInput = document.getElementById('playerName');
    const setNameBtn = document.getElementById('setNameButton');
    
    setNameBtn.addEventListener('click', () => {
        handleSetPlayerName();
    });
    
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSetPlayerName();
            nameInput.blur(); // Remove focus after setting name
        }
    });
    
    function handleSetPlayerName() {
        const newName = nameInput.value.trim();
        
        if (newName && newName.length > 0) {
            // Find the active socket manager from the game scene
            const scene = game.scene.getScene('MainScene');
            if (scene && scene.socketManager) {
                scene.socketManager.setPlayerName(newName);
            }
            
            // Indicate success with style changes
            setNameBtn.textContent = "Updated!";
            setNameBtn.style.backgroundColor = "#2E7D32";
            
            // Reset button text after a short delay
            setTimeout(() => {
                setNameBtn.textContent = "Set Name";
                setNameBtn.style.backgroundColor = "#4CAF50";
                // Also reduce opacity of container (optional fade effect)
                document.getElementById('nameInputContainer').style.opacity = '0.7';
            }, 1500);
            
            // Remove focus to return to game controls
            nameInput.blur();
        } else {
            // Indicate error with style changes
            setNameBtn.textContent = "Name Required";
            setNameBtn.style.backgroundColor = "#F44336";
            
            // Reset button text after a short delay
            setTimeout(() => {
                setNameBtn.textContent = "Set Name";
                setNameBtn.style.backgroundColor = "#4CAF50";
            }, 1500);
            
            // Keep focus on input
            nameInput.focus();
        }
    }
}