const { Server, Origins } = require("boardgame.io/server");
const { TheGame } = require("./Game");

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST]
});

server.run(8000);