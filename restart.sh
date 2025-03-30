#!/bin/bash

# Stop any running server
echo "Stopping any running server..."
pkill -f "node src/server/server.js"

# Clear terminal
clear

# Print a nice header
echo "====================================="
echo "  Game Sandbox Development Session"
echo "====================================="
echo ""
echo "Quick Commands:"
echo "  1. Start server:  npm start"
echo "  2. Dev mode:      npm run dev"
echo "  3. Stop server:   pkill -f 'node src/server/server.js'"
echo ""
echo "Project structure in PROJECT_CONTEXT.md"
echo ""
echo "====================================="

# Start server if requested
if [ "$1" == "start" ]; then
    echo "Starting server..."
    npm start
fi