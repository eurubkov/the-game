import { Lobby } from 'boardgame.io/react';
import { TheGame } from './Game';
import TheGameBoard from './Board';

const LobbyView = () => (<Lobby
    gameServer={`http://${window.location.hostname}:8000`}
    lobbyServer={`http://${window.location.hostname}:8080`}
    gameComponents={[
        { game: TheGame, board: TheGameBoard }
    ]}
/>);

export default LobbyView;