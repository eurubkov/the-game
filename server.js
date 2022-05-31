const { Server, Origins } = require("boardgame.io/server");
const { TheGame } = require("./src/Game");

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST]
});
const lobbyConfig = {
    apiPort: 8080,
    apiCallback: () => console.log('Running Lobby API on port 8080...'),
};
server.run({ port: 8000, lobbyConfig });