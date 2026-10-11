const socket = io();
const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset-button');
const gameStatus = document.getElementById('game-status');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');
const micButton = document.getElementById('mic-button');
const voiceStatus = document.getElementById('voice-status');
const remoteAudio = document.getElementById('remote-audio');

let gameState = null;
let peerConnection = null;
let localStream = null;
let isPolitePeer = false;
let makingOffer = false;
let ignoreOffer = false;
let isSettingRemoteAnswerPending = false;

socket.on('connect', () => {
    gameStatus.textContent = 'Connected. Finding another player...';
});

socket.on('disconnect', () => {
    gameState = null;
    gameStatus.textContent = 'Connection lost. Reconnecting...';
    updateCommunicationControls();
    closeVoiceConnection();
    chatMessages.replaceChildren();
    updateBoard();
});

socket.on('waiting', () => {
    gameState = null;
    gameStatus.textContent = 'Waiting for another player to join...';
    updateCommunicationControls();
    updateBoard();
});

socket.on('opponentDisconnected', () => {
    gameState = null;
    gameStatus.textContent = 'Your opponent disconnected. Finding another player...';
    updateCommunicationControls();
    closeVoiceConnection();
    chatMessages.replaceChildren();
    updateBoard();
});

socket.on('gameState', (state) => {
    gameState = state;
    isPolitePeer = state.playerSymbol === 'O';
    updateCommunicationControls();
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

socket.on('chatMessage', ({ text, playerSymbol }) => {
    addChatMessage(`${playerSymbol}: ${text}`);
});

socket.on('voiceSignal', async (signal) => {
    if (!gameState) {
        return;
    }

    try {
        const connection = getPeerConnection();
        if (signal.description) {
            const offerCollision = signal.description.type === 'offer'
                && (makingOffer || (connection.signalingState !== 'stable' && !isSettingRemoteAnswerPending));
            ignoreOffer = !isPolitePeer && offerCollision;
            if (ignoreOffer) {
                return;
            }

            isSettingRemoteAnswerPending = signal.description.type === 'answer';
            await connection.setRemoteDescription(signal.description);
            isSettingRemoteAnswerPending = false;

            if (signal.description.type === 'offer') {
                await connection.setLocalDescription();
                socket.emit('voiceSignal', { description: connection.localDescription });
            }
        } else if (signal.candidate && !ignoreOffer) {
            await connection.addIceCandidate(signal.candidate);
        }
    } catch (error) {
        isSettingRemoteAnswerPending = false;
        voiceStatus.textContent = `Voice connection failed: ${error.message}`;
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

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!gameState || !text) {
        return;
    }

    addChatMessage(`You: ${text}`);
    socket.emit('chatMessage', text);
    chatInput.value = '';
});

micButton.addEventListener('click', async () => {
    if (localStream) {
        const isMuted = localStream.getAudioTracks().every((track) => !track.enabled);
        localStream.getAudioTracks().forEach((track) => {
            track.enabled = isMuted;
        });
        micButton.textContent = isMuted ? 'Mute microphone' : 'Unmute microphone';
        voiceStatus.textContent = isMuted ? 'Microphone on.' : 'Microphone muted.';
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!gameState) {
            localStream.getTracks().forEach((track) => track.stop());
            localStream = null;
            return;
        }

        const connection = getPeerConnection();
        localStream.getTracks().forEach((track) => {
            connection.addTrack(track, localStream);
        });
        micButton.textContent = 'Mute microphone';
        voiceStatus.textContent = 'Microphone on. Connecting to your opponent...';
    } catch (error) {
        voiceStatus.textContent = `Could not access microphone: ${error.message}`;
    }
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

function updateCommunicationControls() {
    chatInput.disabled = !gameState;
    chatSendButton.disabled = !gameState;
    micButton.disabled = !gameState;

    if (!gameState) {
        voiceStatus.textContent = 'Join a game to chat by voice.';
    }
}

function addChatMessage(message) {
    const item = document.createElement('li');
    item.textContent = message;
    chatMessages.append(item);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getPeerConnection() {
    if (peerConnection) {
        return peerConnection;
    }

    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            socket.emit('voiceSignal', { candidate });
        }
    };
    peerConnection.ontrack = ({ streams }) => {
        remoteAudio.srcObject = streams[0];
        remoteAudio.play().catch((error) => {
            voiceStatus.textContent = `Unable to play opponent audio: ${error.message}`;
        });
    };
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection?.connectionState === 'connected') {
            voiceStatus.textContent = 'Voice connected.';
        } else if (peerConnection?.connectionState === 'failed') {
            voiceStatus.textContent = 'Voice connection failed. Try enabling your microphone again.';
        }
    };
    peerConnection.onnegotiationneeded = async () => {
        try {
            makingOffer = true;
            await peerConnection.setLocalDescription();
            socket.emit('voiceSignal', { description: peerConnection.localDescription });
        } catch (error) {
            voiceStatus.textContent = `Could not start voice chat: ${error.message}`;
        } finally {
            makingOffer = false;
        }
    };

    return peerConnection;
}

function closeVoiceConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
    }

    remoteAudio.srcObject = null;
    micButton.textContent = 'Enable microphone';
    makingOffer = false;
    ignoreOffer = false;
    isSettingRemoteAnswerPending = false;
}
