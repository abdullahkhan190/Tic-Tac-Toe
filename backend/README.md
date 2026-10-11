# Backend

The backend serves the project-root browser files and coordinates multiplayer sessions with Express and Socket.IO. It matches players in pairs and keeps each game board on the server.

## Start the server

```sh
npm install
npm start
```

The server listens on port `3000` by default. Set the `PORT` environment variable to use another port.

## Socket.IO events

| Direction | Event | Purpose |
| --- | --- | --- |
| Client to server | `makeMove` | Request a move using a board index from 0 to 8. |
| Client to server | `resetGame` | Reset the matched game's board. |
| Client to server | `chatMessage` | Send an opponent-only text message (up to 500 characters). |
| Client to server | `voiceSignal` | Relay WebRTC offer, answer, or ICE candidate to the opponent. |
| Server to client | `waiting` | Notify a player that they are waiting for an opponent. |
| Server to client | `gameState` | Send the board and turn status to each player. |
| Server to client | `chatMessage` | Deliver an opponent's text message. |
| Server to client | `voiceSignal` | Deliver an opponent's WebRTC signaling data. |
| Server to client | `opponentDisconnected` | Notify a player that their opponent left. |

Voice audio is peer-to-peer; the server relays signaling data but does not receive or store audio. The current client uses a STUN server and does not configure a TURN relay, so peer-to-peer calls may not connect on some networks.
