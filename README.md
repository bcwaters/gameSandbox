# Multiplayer Game Sandbox

A scalable multiplayer game with server-side physics, built with Node.js, Express, Socket.io, and Phaser 3.

## Features

- Real-time multiplayer gameplay
- Server-side physics and collision detection
- Client-side prediction and interpolation
- Player combat with projectiles and sword attacks
- Player health and ammo management
- Character customization (names)

## Architecture

The game uses a client-server architecture with the following components:

### Server-side

- Express server for serving static files
- Socket.io for real-time communication
- Modular server architecture with separate concerns:
  - Player management
  - Projectile handling
  - Physics and collision detection
  - Game state management

### Client-side

- Phaser 3 game engine
- Modular client architecture:
  - Socket manager for network communication
  - Entity classes (Player, Projectile)
  - UI components
  - Scene management

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Game

1. Start the development server:

```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

## Game Controls

- WASD or Arrow Keys: Move player
- Spacebar: Fire projectile
- R: Reload ammo
- B: Sword attack

## Development

See the [REFACTOR_PLAN.md](REFACTOR_PLAN.md) file for details about the codebase structure and future improvements.

## License

This project is licensed under the ISC License.