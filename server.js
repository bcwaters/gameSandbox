// Server-side code (server.js)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = {};

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    // Player joins the game
    socket.on('player:join', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            x: Math.random() * 800,
            y: Math.random() * 600,
            health: 100,
            team: Object.keys(players).length % 2 === 0 ? 'blue' : 'red'
        };

        // Broadcast new player to all other players
        socket.broadcast.emit('player:joined', players[socket.id]);

        // Send current players to new player
        socket.emit('players:current', players);
    });

    // Player movement
    socket.on('player:move', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;
            
            // Broadcast move to other players
            socket.broadcast.emit('player:moved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });

    // Player attack
    socket.on('player:attack', (attackData) => {
        // Broadcast attack to other players
        socket.broadcast.emit('player:attacked', {
            attackerId: socket.id,
            targetId: attackData.targetId
        });
    });

    // Player disconnect
    socket.on('disconnect', () => {
        delete players[socket.id];
        socket.broadcast.emit('player:left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});