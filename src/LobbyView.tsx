import * as React from "react";
import { Button } from "antd";
import { Lobby } from 'boardgame.io/react';
import TheGame from './TheGame';
import TheGameBoard from './Board';

const gameServer = process.env.REACT_APP_GAME_SERVER_URL || "https://the-game-100-4h5s.onrender.com";
const lobbyServer = process.env.REACT_APP_LOBBY_SERVER_URL || gameServer;
const TypedLobby = Lobby as unknown as React.FC<any>;
const getLobbyHealthUrl = () => `${lobbyServer.replace(/\/$/, "")}/games`;

const LobbyView = () => {
    const [isReady, setIsReady] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState("");

    const checkLobbyServer = React.useCallback(async () => {
        setIsChecking(true);
        setErrorMessage("");

        try {
            const response = await fetch(getLobbyHealthUrl());

            if (!response.ok) {
                throw new Error(`Multiplayer server returned HTTP ${response.status}`);
            }

            setIsReady(true);
        } catch (error) {
            setIsReady(false);
            setErrorMessage(error instanceof Error ? error.message : "Multiplayer server is unavailable");
        } finally {
            setIsChecking(false);
        }
    }, []);

    React.useEffect(() => {
        checkLobbyServer();
    }, [checkLobbyServer]);

    if (!isReady) {
        return (
            <section className="lobby-status" aria-live="polite">
                <h2>Multiplayer</h2>
                <p>
                    {isChecking
                        ? "Connecting to the multiplayer server..."
                        : "The multiplayer server is not ready yet."}
                </p>
                {errorMessage && <p className="lobby-status-error">{errorMessage}</p>}
                <Button
                    type="primary"
                    onClick={checkLobbyServer}
                    loading={isChecking}
                >
                    Retry
                </Button>
            </section>
        );
    }

    return (
        <TypedLobby
            gameServer={gameServer}
            lobbyServer={lobbyServer}
            gameComponents={[
                { game: TheGame, board: TheGameBoard }
            ]}
        />
    );
};

export default LobbyView;
