import * as React from "react";
import { useState } from "react";
import { Button } from 'antd';
import Card from './Card';
import './GameOver.css';

const RemainingCards = ({ players }) => {
    return (
        <div className="remaining-cards">
            {Object.keys(players).map(playerID => (
                <div key={playerID} className="player-remaining">
                    <h3 className="player-title">Player {parseInt(playerID) + 1} Remaining Cards:</h3>
                    <div className="cards-container">
                        {players[playerID].hand.map((cardValue, index) => (
                            <Card id={cardValue} key={index} value={cardValue} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const GameOver = ({ gameover }) => {
    const [isVisible, setIsVisible] = useState(true);
    
    const restartGame = () => {
        window.location.href = '/';
    };
    
    const closeOverlay = () => {
        setIsVisible(false);
    };
    
    // Reset visibility when game state changes
    React.useEffect(() => {
        if (gameover) {
            setIsVisible(true);
        }
    }, [gameover]);

    if (!gameover) {
        return null;
    }
    
    if (!isVisible) {
        return (
            <div className="game-over-minimized">
                <Button 
                    type="primary" 
                    onClick={() => setIsVisible(true)}
                    className="show-results-button"
                >
                    Show Game Results
                </Button>
            </div>
        );
    }

    const isWin = gameover.won;
    
    return (
        <div className="game-over-overlay">
            <div className={`game-over-modal ${isWin ? 'win' : 'lose'}`}>
                <div className="confetti-container">
                    {isWin && Array.from({ length: 50 }).map((_, i) => (
                        <div key={i} className="confetti" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
                        }}></div>
                    ))}
                </div>
                
                <h1 className="game-over-title">
                    {isWin ? 'Victory!' : 'Game Over'}
                </h1>
                
                <p className="game-over-message">
                    {isWin 
                        ? 'Congratulations! You successfully played all cards and beat The Game!' 
                        : 'You were unable to play the required number of cards. Better luck next time!'}
                </p>
                
                {!isWin && <RemainingCards players={gameover.players} />}
                
                <div className="game-over-actions">
                    <Button 
                        type="primary" 
                        size="large"
                        onClick={restartGame}
                        className="play-again-button"
                    >
                        Play Again
                    </Button>
                    <Button 
                        type="default" 
                        size="large"
                        onClick={closeOverlay}
                        className="close-overlay-button"
                    >
                        Close & View Board
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GameOver;
