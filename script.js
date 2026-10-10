const socket = io();
const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset-button');
const gameStatus = document.getElementById('game-status');

let gameState = null;

socket.on('connect', () => {
    gameStatus.textContent = 'Connected. Finding another player...';
});

socket.on('disconnect', () => {
    gameState = null;
    gameStatus.textContent = 'Connection lost. Reconnecting...';
    updateBoard();
});

socket.on('waiting', () => {
    gameState = null;
    gameStatus.textContent = 'Waiting for another player to join...';
    updateBoard();
});

socket.on('opponentDisconnected', () => {
    gameState = null;
    gameStatus.textContent = 'Your opponent disconnected. Finding another player...';
    updateBoard();
});

socket.on('gameState', (state) => {
    gameState = state;
    updateBoard();

    if (state.winner) {
        gameStatus.textContent = state.winner === state.playerSymbol
            ? `You win! You are ${state.playerSymbol}.`
            : `You lose. Your opponent (${state.winner}) wins.`;
    } else if (state.isDraw) {
        gameStatus.textContent = "It's a draw!";
    } else if (state.currentPlayer === state.playerSymbol) {
        gameStatus.textContent = `Your turn (${state.playerSymbol}).`;
    } else {
        gameStatus.textContent = `Opponent's turn. You are ${state.playerSymbol}.`;
    }
});

cells.forEach((cell) => {
    cell.addEventListener('click', () => {
        const index = Number(cell.dataset.index);
        if (gameState && gameState.currentPlayer === gameState.playerSymbol) {
            socket.emit('makeMove', index);
        }
    });
});

resetButton.addEventListener('click', () => {
    socket.emit('resetGame');
});

function updateBoard() {
    cells.forEach((cell, index) => {
        cell.textContent = gameState ? gameState.board[index] : '';
        const canPlay = gameState
            && !gameState.winner
            && !gameState.isDraw
            && gameState.currentPlayer === gameState.playerSymbol;
        cell.classList.toggle('inactive', !canPlay);
        cell.setAttribute('aria-disabled', String(!canPlay));
    });

    resetButton.disabled = !gameState;
}
