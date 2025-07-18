import LobbyView from "./LobbyView";
import TheGame from './TheGame';
import LocalBoard from "./LocalBoard";
import SinglePlayerApp from "./SinglePlayerApp";
import BotTestApp from "./BotTestApp";
import Leaderboard from "./Leaderboard";
import { Client } from 'boardgame.io/react';
import * as React from "react";
import { useState } from "react";
import { Button } from "antd";
import './App.css';

const AppClient = Client({
    game: TheGame,
    board: LocalBoard,
    numPlayers: 2
})

const DEBUG_MODE = process.env.REACT_APP_DEBUG_MODE === 'true';

// Game modes
enum GameMode {
    SELECTION = 'selection',
    SINGLE_PLAYER = 'single_player',
    MULTIPLAYER = 'multiplayer',
    LEADERBOARD = 'leaderboard',
    BOT_TEST = 'bot_test'
}

const App = () => {
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.SELECTION);

    if (DEBUG_MODE) {
        return (
            <div className="App">
                <AppClient playerID="0" />
            </div>
        );
    }

    // Mode selection screen
    if (gameMode === GameMode.SELECTION) {
        return (
            <div className="App">
                <div className="mode-selection">
                    <h1>The Game</h1>
                    <div className="mode-buttons">
                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => setGameMode(GameMode.SINGLE_PLAYER)}
                            style={{ margin: '10px' }}
                        >
                            Single Player
                        </Button>
                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => setGameMode(GameMode.MULTIPLAYER)}
                            style={{ margin: '10px' }}
                        >
                            Multiplayer
                        </Button>
                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => setGameMode(GameMode.BOT_TEST)}
                            style={{ margin: '10px' }}
                        >
                            Bot Test Mode
                        </Button>
                        <Button 
                            type="default" 
                            size="large"
                            onClick={() => setGameMode(GameMode.LEADERBOARD)}
                            style={{ margin: '10px' }}
                        >
                            Leaderboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Single player mode with bots
    if (gameMode === GameMode.SINGLE_PLAYER) {
        return (
            <div className="App">
                <Button 
                    onClick={() => setGameMode(GameMode.SELECTION)} 
                    style={{ margin: '10px' }}
                >
                    Back to Mode Selection
                </Button>
                <SinglePlayerApp />
            </div>
        );
    }

    // Bot Test mode
    if (gameMode === GameMode.BOT_TEST) {
        return (
            <div className="App">
                <Button 
                    onClick={() => setGameMode(GameMode.SELECTION)} 
                    style={{ margin: '10px' }}
                >
                    Back to Mode Selection
                </Button>
                <BotTestApp />
            </div>
        );
    }

    // Leaderboard mode
    if (gameMode === GameMode.LEADERBOARD) {
        return (
            <div className="App">
                <Button 
                    onClick={() => setGameMode(GameMode.SELECTION)} 
                    style={{ margin: '10px' }}
                >
                    Back to Mode Selection
                </Button>
                <Leaderboard />
            </div>
        );
    }

    // Multiplayer mode
    return (
        <div className="App">
            <Button 
                onClick={() => setGameMode(GameMode.SELECTION)} 
                style={{ margin: '10px' }}
            >
                Back to Mode Selection
            </Button>
            <LobbyView />
        </div>
    );
}

export default App;
