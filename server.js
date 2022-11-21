const { Server, Origins } = require("boardgame.io/server");
const { TheGame } = require("./src/Game");

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST_IN_DEVELOPMENT, "https://thegame100.netlify.app"]
});
const PORT = process.env.PORT || 8000;
server.run(PORT);