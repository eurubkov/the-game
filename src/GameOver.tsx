import * as React from "react";
import { Button } from 'antd';
import Card from './Card';
import './GameOver.css';
import { saveToLeaderboard, calculateTotalRemainingCards } from './Leaderboard';

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
    const restartGame = () => {
        window.location.href = '/';
    };

    if (!gameover) {
        return null;
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
