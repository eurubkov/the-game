import * as React from "react";
import { MinRequiredMoves, CanPlayCard } from "./TheGame";
import Card from "./Card";
import GameOver from "./GameOver";
import { Button } from 'antd';
import { useState } from "react";

/**
 * Type definitions for the game state and props
 */
interface GameState {
    deck: number[];
    piles: number[];
    players: {
        [key: string]: {
            hand: number[];
        };
    };
    turnMovesMade: number;
}

interface GameContext {
    currentPlayer: string;
    gameover?: {
        won: boolean;
        players: {
            [key: string]: {
                hand: number[];
            };
        };
    };
    playOrder: string[];
    numPlayers: number;
}

interface GameMoves {
    PlayCard: (card: number, pile: string) => void;
}

interface GameEvents {
    endTurn: () => void;
}

interface MatchData {
    id: string;
    name: string;
}

interface GameBoardProps {
    G: GameState;
    ctx: GameContext;
    moves: GameMoves;
    events: GameEvents;
    playerID: string;
    matchData: MatchData[];
    undo: () => void;
}

/**
 * Pile type mapping
 */
type PileType = 'up' | 'down';

const INDEX_TO_PILE_MAP: Record<number, string> = {
    0: "first_up",
    1: "second_up",
    2: "first_down",
    3: "second_down"
};

const PILE_TYPE_MAP: Record<number, PileType> = {
    0: "up",
    1: "up",
    2: "down",
    3: "down"
};

const TheGameBoard: React.FC<GameBoardProps> = ({ ctx, G, moves, events, playerID, ...props }) => {
    const [showInvalidMove, setShowInvalidMove] = useState(false);
    const currentPlayerName = props.matchData[ctx.currentPlayer].name;
    const isCurrentPlayer = ctx.currentPlayer === playerID;
    
    const onEndTurn = () => {
        events.endTurn();
    };
    
    /**
     * Handle card drop on a pile
     */
    const onDragDrop = (e: React.DragEvent<HTMLDivElement>, pileIndex: number) => {
        e.preventDefault();
        
        // Get the card value from the drag data
        const cardValue = e.dataTransfer.getData("text/plain");
        const card = Number(cardValue);
        
        if (isNaN(card)) {
            console.error('Invalid card value:', cardValue);
            setShowInvalidMove(true);
            setTimeout(() => setShowInvalidMove(false), 2000);
            return;
        }
        
        // Convert pile index to pile name (e.g., "first_up", "second_down")
        const pile = INDEX_TO_PILE_MAP[pileIndex];
        
        // Check if the move is valid according to game rules
        const isValidMove = CanPlayCard(G, ctx, card, pile);
        
        if (!isValidMove) {
            setShowInvalidMove(true);
            setTimeout(() => setShowInvalidMove(false), 2000);
        } else {
            moves.PlayCard(card, pile);
        }
    };

    /**
     * Handle drag over event to allow dropping
     */
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
    };
    
    /**
     * Create a pile element with the appropriate styling and drop target
     */
    const createPileElement = (index: number, value: number, pileType: PileType) => (
        <div key={index} className="pile-column">
            <div className="pile-label">
                {pileType === 'up' ? 'ASCENDING' : 'DESCENDING'}
            </div>
            <div 
                className="drop-target"
                onDrop={(e) => onDragDrop(e, index)}
                onDragOver={handleDragOver}
            >
                <Card 
                    value={value} 
                    id={`pile-${index}`} 
                    isPile={true}
                    pileType={pileType}
                />
            </div>
        </div>
    );
    
    /**
     * Render the game piles using modern array methods
     */
    const renderPiles = () => {
        // Create arrays of pile elements grouped by type
        const pileElements = G.piles.map((value, index) => {
            const pileType = PILE_TYPE_MAP[index] as 'up' | 'down';
            return { element: createPileElement(index, value, pileType), type: pileType };
        });
        
        // Filter by type
        const upPiles = pileElements
            .filter(pile => pile.type === 'up')
            .map(pile => pile.element);
            
        const downPiles = pileElements
            .filter(pile => pile.type === 'down')
            .map(pile => pile.element);
        
        return (
            <div className="piles-container">
                {upPiles}
                {downPiles}
            </div>
        );
    };
    
    /**
     * Render player's hand with draggable cards using modern array methods
     */
    const renderHand = () => {
        const isDraggable = isCurrentPlayer;
        const playerHand = G.players[playerID].hand;
        
        const handCards = playerHand.map((handValue, index) => (
            <div key={index} className="card-wrapper">
                <Card 
                    id={handValue} 
                    value={handValue} 
                    isDraggable={isDraggable}
                />
            </div>
        ));
        
        return (
            <div className="cards-container">
                {handCards}
            </div>
        );
    };

    /**
     * Render the game header with title and deck information
     */
    const renderHeader = () => (
        <div className="game-header">
            <h1 className="game-title">The Game</h1>
            <div className="game-info">
                <div className="deck-container">
                    <div className="deck-label">Remaining Cards</div>
                    <Card id="deck" value={G.deck.length} />
                </div>
            </div>
        </div>
    );
    
    /**
     * Render the turn indicator
     */
    const renderTurnIndicator = () => (
        <div className={`turn-indicator ${isCurrentPlayer ? 'active' : ''}`}>
            {isCurrentPlayer ? "Your Turn" : `${currentPlayerName}'s Turn`}
        </div>
    );
    
    /**
     * Render the action buttons
     */
    const renderActionButtons = () => {
        if (ctx.gameover) return null;
        
        return (
            <div className="actions-container">
                <Button 
                    className="primary-button"
                    type="primary" 
                    disabled={G.turnMovesMade < MinRequiredMoves(G, ctx) || !isCurrentPlayer} 
                    onClick={onEndTurn}
                >
                    End Turn
                </Button>
                <Button 
                    className="secondary-button"
                    onClick={props.undo} 
                    type="default" 
                    disabled={G.turnMovesMade === 0 || !isCurrentPlayer}
                >
                    Undo
                </Button>
            </div>
        );
    };
    
    /**
     * Render the game rules section
     */
    const renderGameRules = () => (
        <div className="game-rules mt-md">
            <details>
                <summary>Game Rules</summary>
                <div className="rules-content">
                    <p>Play cards from your hand onto the four piles:</p>
                    <ul>
                        <li>On ascending piles (starting at 1), play higher numbers or exactly 10 less</li>
                        <li>On descending piles (starting at 100), play lower numbers or exactly 10 more</li>
                        <li>
                            {ctx.numPlayers === 1 
                                ? "In single-player mode, you must play at least 1 card per turn" 
                                : "In multiplayer mode, you must play at least 2 cards per turn (1 if the deck is empty)"}
                        </li>
                        <li>The goal is to play all cards from the deck and your hands</li>
                    </ul>
                </div>
            </details>
        </div>
    );
    
    return (
        <div className="game-container">
            {renderHeader()}
            {renderPiles()}
            {renderTurnIndicator()}
            
            {showInvalidMove && (
                <div className="invalid-move-alert">
                    Invalid move! Try another card or pile.
                </div>
            )}
            
            <div className="hand-container">
                <h3 className="hand-label">Your Hand</h3>
                {renderHand()}
            </div>
            
            <GameOver gameover={ctx.gameover}/>
            {renderActionButtons()}
            {renderGameRules()}
        </div>
    );
};

export default TheGameBoard;
