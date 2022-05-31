const { Server, Origins } = require("boardgame.io/server");
const { TheGame } = require("./src/Game");

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST]
});
server.run({ port: 8000 });