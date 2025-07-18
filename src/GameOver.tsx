import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from 'antd';
import Card from './Card';
import './GameOver.css';
import { saveToLeaderboard, calculateTotalRemainingCards } from './Leaderboard';

// Define interface for GameOver props
interface GameOverProps {
    gameover: any;
    onGameOver?: (result: any) => void;
    playerID?: string;
}

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

const GameOver: React.FC<GameOverProps> = ({ gameover, onGameOver, playerID }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [savedToLeaderboard, setSavedToLeaderboard] = useState(false);
    
    const restartGame = () => {
        // First hide the overlay to ensure proper unmounting
        setIsVisible(false);
        // Use setTimeout to ensure component is fully unmounted before navigation
        setTimeout(() => {
            window.location.href = '/';
        }, 0);
    };
    
    const closeOverlay = () => {
        setIsVisible(false);
    };
    
    // Reset visibility when game state changes
    React.useEffect(() => {
        if (gameover) {
            setIsVisible(true);
            setSavedToLeaderboard(false);
        }
    }, [gameover]);
    
    // Save game result to leaderboard when game ends
    useEffect(() => {
        if (gameover && !savedToLeaderboard) {
            try {
                const { won, players, seed, numPlayers, deckLength } = gameover;
                
                // Calculate total remaining cards
                const remainingCards = calculateTotalRemainingCards(deckLength, players);
                
                // Save to leaderboard
                saveToLeaderboard({
                    seed,
                    numPlayers,
                    remainingCards,
                    won
                });
                
                setSavedToLeaderboard(true);
                
                // Call onGameOver callback if provided (for bot test mode)
                // Use setTimeout to ensure this happens after the current execution context
                // This helps prevent Socket.IO related errors
                if (onGameOver && typeof onGameOver === 'function') {
                    setTimeout(() => {
                        try {
                            onGameOver(gameover);
                        } catch (error) {
                            console.error("Error in onGameOver callback:", error);
                        }
                    }, 0);
                }
            } catch (error) {
                console.error("Error processing game over:", error);
            }
        }
    }, [gameover, savedToLeaderboard, onGameOver]);

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
                        ? (playerID === "observer" 
                            ? 'The bots successfully played all cards and beat The Game!' 
                            : 'Congratulations! You successfully played all cards and beat The Game!')
                        : (playerID === "observer"
                            ? 'The bots were unable to play the required number of cards.'
                            : 'You were unable to play the required number of cards. Better luck next time!')}
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
                
                <div className="game-stats">
                    <p>Game Seed: {gameover.seed}</p>
                    <p>Players: {gameover.numPlayers}</p>
                    <p>Total Cards Remaining: {calculateTotalRemainingCards(gameover.deckLength, gameover.players)}</p>
                    <p className="leaderboard-note">This result has been saved to the leaderboard.</p>
                </div>
            </div>
        </div>
    );
};

export default GameOver;
