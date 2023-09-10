import * as React from "react";
import { Lobby } from 'boardgame.io/react';
import TheGame from './TheGame';
import TheGameBoard from './Board';

const server = `https://the-game-100-4h5s.onrender.com`;
const TypedLobby = Lobby as unknown as React.FC<any>;
const LobbyView = () => (<TypedLobby
    gameServer={server}
    lobbyServer={server}
    gameComponents={[
        { game: TheGame, board: TheGameBoard }
    ]}
/>);

export default LobbyView;