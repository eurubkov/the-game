import * as React from "react";
import { Lobby } from 'boardgame.io/react';
import TheGame from './TheGame';
import TheGameBoard from './Board';

// Determine the server URL based on the environment
const isProduction = process.env.NODE_ENV === 'production';
const server = isProduction 
  ? window.location.origin  // Use the current origin in production
  : `http://localhost:8000`; // Use localhost in development
const TypedLobby = Lobby as unknown as React.FC<any>;
const LobbyView = () => (<TypedLobby
    gameServer={server}
    lobbyServer={server}
    gameComponents={[
        { game: TheGame, board: TheGameBoard }
    ]}
/>);

export default LobbyView;
