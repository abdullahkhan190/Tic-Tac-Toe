// Tic-Tac-Toe Game Logic
let currentPlayer = 'X';
const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset-button');

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (cell.textContent === '') {
            cell.textContent = currentPlayer;
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        }
        const winner = checkWinner();
        if (winner) {
            alert(`${winner} wins!`);
            cells.forEach(cell => {
                cell.textContent = '';
            });
            currentPlayer = 'X';
        }
    });
});

resetButton.addEventListener('click', () => {
    cells.forEach(cell => {
        cell.textContent = '';
    });
    currentPlayer = 'X';
});

// add winning logic
function checkWinner() {
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

    for (const [a, b, c] of winningCombinations) {
        if (cells[a].textContent &&
             cells[a].textContent === cells[b].textContent &&
             cells[a].textContent === cells[c].textContent) {
            return cells[a].textContent;
        }
    }
    return null;
}