/**
 * Main game initialization
 */
// Declare game variable in the global scope
let gameInstance;

// Wait for window load event to ensure all scripts are fully loaded
window.addEventListener('load', () => {
    console.log('Window load event triggered');
    
    // Make sure all required classes are defined before initializing the game
    if (typeof MainScene === 'undefined') {
        console.error('ERROR: MainScene is not defined! Check script loading order in index.html');
        showErrorMessage('Game initialization failed: MainScene is not defined. Check console for details.');
        return;
    }
    
    console.log('MainScene class verified: It is defined');
    
    // Initialize the game
    initializeGame();
});

/**
 * Initialize the game with proper error handling
 */
function initializeGame() {
    console.log('Initializing game...');
    try {
        // Detect if we're on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Get the window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Default game dimensions
        let gameWidth = 800;
        let gameHeight = 600;
        
        // Configure scaling based on device
        console.log('Creating game configuration');
        
        let config;
        
        // Only use dynamic scaling on mobile
        if (isMobile) {
            console.log('Mobile device detected, using adaptive scaling');
            
            // Create game configuration with mobile scaling
            config = {
                type: Phaser.AUTO,
                width: gameWidth,
                height: gameHeight,
                scene: [MainScene],
                physics: {
                    default: 'arcade',
                    arcade: {
                        debug: false,
                        gravity: { y: 0 }
                    }
                },
                parent: 'gameContainer',
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                }
            };
        } else {
            console.log('Desktop device detected, using fixed size');
            
            // Create game configuration without scaling for desktop
            config = {
                type: Phaser.AUTO,
                width: gameWidth,
                height: gameHeight,
                scene: [MainScene],
                physics: {
                    default: 'arcade',
                    arcade: {
                        debug: false,
                        gravity: { y: 0 }
                    }
                },
                parent: 'gameContainer'
            };
        }
        
        console.log('Creating Phaser game instance with config:', config);
        // Create the game instance
        gameInstance = new Phaser.Game(config);
        console.log('Phaser game instance created successfully');
        
        console.log('Setting up name input UI');
        // Handle user name input UI
        setupNameInput();
    } catch (error) {
        console.error('ERROR initializing game:', error);
        showErrorMessage(`Game initialization failed: ${error.message}`);
    }
}

/**
 * Display error message to the user
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.background = 'rgba(255,0,0,0.8)';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.color = 'white';
    errorDiv.style.maxWidth = '80%';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = 9999;
    errorDiv.innerHTML = `<h2>Game initialization failed</h2><p>${message}</p>`;
    document.body.appendChild(errorDiv);
}

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
            const scene = gameInstance.scene.getScene('MainScene');
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