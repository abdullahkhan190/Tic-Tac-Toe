const path = require('node:path');
const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const frontendPath = path.join(__dirname, '..');
const port = process.env.PORT || 3000;

app.use(express.static(frontendPath));

const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

let waitingPlayers = [];
const gamesByPlayer = new Map();

function addToWaitingQueue(socket) {
    if (!waitingPlayers.includes(socket)) {
        waitingPlayers.push(socket);
    }
}

function getWinner(board) {
    for (const [a, b, c] of winningCombinations) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function sendGameState(game) {
    for (const symbol of ['X', 'O']) {
        const playerSocket = io.sockets.sockets.get(game.players[symbol]);
        if (playerSocket) {
            playerSocket.emit('gameState', {
                board: game.board,
                currentPlayer: game.currentPlayer,
                winner: game.winner,
                isDraw: !game.winner && game.board.every(Boolean),
                playerSymbol: symbol
            });
        }
    }
}

function startGame(firstPlayer, secondPlayer) {
    const game = {
        players: { X: firstPlayer.id, O: secondPlayer.id },
        board: Array(9).fill(''),
        currentPlayer: 'X',
        winner: null
    };

    gamesByPlayer.set(firstPlayer.id, game);
    gamesByPlayer.set(secondPlayer.id, game);
    sendGameState(game);
}

io.on('connection', (socket) => {
    let opponent;
    while (waitingPlayers.length && !opponent) {
        const candidate = waitingPlayers.shift();
        if (candidate.connected) {
            opponent = candidate;
        }
    }

    if (opponent) {
        startGame(opponent, socket);
    } else {
        addToWaitingQueue(socket);
        socket.emit('waiting');
    }

    socket.on('makeMove', (index) => {
        const game = gamesByPlayer.get(socket.id);
        if (!game || !Number.isInteger(index) || index < 0 || index > 8 || game.winner) {
            return;
        }

        const symbol = game.players.X === socket.id ? 'X' : 'O';
        if (game.currentPlayer !== symbol || game.board[index]) {
            return;
        }

        game.board[index] = symbol;
        game.winner = getWinner(game.board);
        game.currentPlayer = symbol === 'X' ? 'O' : 'X';
        sendGameState(game);
    });

    socket.on('resetGame', () => {
        const game = gamesByPlayer.get(socket.id);
        if (!game) {
            return;
        }

        game.board = Array(9).fill('');
        game.currentPlayer = 'X';
        game.winner = null;
        sendGameState(game);
    });

    socket.on('disconnect', () => {
        waitingPlayers = waitingPlayers.filter((player) => player !== socket);

        const game = gamesByPlayer.get(socket.id);
        if (!game) {
            return;
        }

        const opponentId = game.players.X === socket.id ? game.players.O : game.players.X;
        const opponentSocket = io.sockets.sockets.get(opponentId);

        gamesByPlayer.delete(game.players.X);
        gamesByPlayer.delete(game.players.O);

        if (opponentSocket) {
            addToWaitingQueue(opponentSocket);
            opponentSocket.emit('opponentDisconnected');
        }
    });
});

server.listen(port, () => {
    console.log(`Tic-Tac-Toe server listening on port ${port}`);
});
