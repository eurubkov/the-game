import LobbyView from "./LobbyView";
import { TheGame } from './Game';
import LocalBoard from "./LocalBoard";
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer'
import * as React from "react";

const AppClient = Client({
    game: TheGame,
    board: LocalBoard,
    multiplayer: Local()
})

const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

const App = () => {
    if (DEBUG_MODE) {
        return (<div>
            <AppClient playerID="0" />
            <AppClient playerID="1" />
        </div>)
    }
    return (
        <div>
            <LobbyView />
        </div>
    );
}
export default App;