import { Server, Origins } from "boardgame.io/server";
import TheGame from "./src/TheGame";

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST_IN_DEVELOPMENT, "https://thegame100.netlify.app"]
});
const PORT = parseInt(process.env.PORT || '8000', 10);

if (isNaN(PORT)) {
    throw new Error("Invalid PORT value");
}
server.run(PORT);