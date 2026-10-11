# Online Tic-Tac-Toe

A browser-based Tic-Tac-Toe game for two players. Players are matched automatically and can chat by text or use live microphone audio while they play.

## Requirements

- Node.js
- A modern browser with Socket.IO and WebRTC support
- Microphone access for live voice chat

## Run locally

From the project root, install the backend dependencies and start the server:

```sh
cd backend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in two browser windows or on two devices connected to the same network. The server matches connected players automatically. To use a different port, set the `PORT` environment variable before starting the server.

## Play

- Take turns placing your symbol on an empty square.
- Select **Reset Game** to clear the board for both players.
- Send a message in the chat panel to share it with your opponent. Messages are limited to 500 characters.
- Select **Enable microphone** and allow browser microphone access to start live voice chat. Use the button again to mute or unmute.
- In landscape orientation on a mobile device, the game board and chat panel fit side by side. In portrait, the chat panel appears below the board.

Voice chat uses WebRTC with a public STUN server for connection setup. The browser may require a secure context for microphone access: use `localhost` locally or serve the app over HTTPS when accessing it remotely. Some restrictive networks may prevent peer-to-peer voice connections.

## Project layout

```text
.
├── index.html       # Game and chat interface
├── script.js        # Browser game, chat, and WebRTC behavior
├── style.css        # Responsive layout and styling
└── backend/
    ├── index.js     # Express and Socket.IO server
    └── package.json # Server dependencies and start command
```

See [backend/README.md](backend/README.md) for server and Socket.IO details.
