import { Client } from "boardgame.io/react";
import TheGameBoard from "./Board";
import { TheGame } from "./Game"
import { SocketIO } from 'boardgame.io/multiplayer';
import { useState } from "react";

const TheGameClient = Client({ game: TheGame, board: TheGameBoard, multiplayer: SocketIO({ server: 'localhost:8000' }) });

const App = () => {
    const [playerId, setPlayerId] = useState(null);
    if (playerId === null) {
        return (
            <div>
                <p>Play as</p>
                <button onClick={() => setPlayerId("0")}>
                    Player 0
                </button>
                <button onClick={() => setPlayerId("1")}>
                    Player 1
                </button>
            </div>
        );
    }
    return (
        <div>
            <TheGameClient playerID={playerId} />
        </div>
    );
}
export default App;