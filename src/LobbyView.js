import { Lobby } from 'boardgame.io/react';
import { TheGame } from './Game';
import TheGameBoard from './Board';

const server = `http://localhost:8000`;
const LobbyView = () => (<Lobby
    gameServer={server}
    lobbyServer={server}
    gameComponents={[
        { game: TheGame, board: TheGameBoard }
    ]}
/>);

export default LobbyView;