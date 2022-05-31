const { Server, Origins } = require("boardgame.io/server");
const { TheGame } = require("./src/Game");

const server = Server({
    games: [TheGame]
});
const PORT = process.env.PORT || 8000;
server.run(PORT);