import { Client } from "boardgame.io/react";
import TheGameBoard from "./Board";
import { TheGame } from "./Game"
import { Local } from 'boardgame.io/multiplayer'

const TheGameClient = Client({ game: TheGame, board: TheGameBoard, multiplayer: Local() });
const App = () => (
    <div>
        <TheGameClient playerID="0" />
        <TheGameClient playerID="1" />
    </div>
);
export default App;