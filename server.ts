import { Server, Origins } from "boardgame.io/server";
import TheGame from "./src/TheGame";

const configuredOrigins = (process.env.CLIENT_ORIGINS || "https://thegame100.netlify.app")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const server = Server({
    games: [TheGame],
    origins: [Origins.LOCALHOST, Origins.LOCALHOST_IN_DEVELOPMENT, ...configuredOrigins]
});
const PORT = parseInt(process.env.PORT || '8000', 10);

if (isNaN(PORT)) {
    throw new Error("Invalid PORT value");
}
server.run(PORT);
