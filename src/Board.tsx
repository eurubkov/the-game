import * as React from "react";
import { MinRequiredMoves, CanPlayCard } from "./TheGame";
import Card from "./Card";
import GameOver from "./GameOver";
import { Button } from 'antd';
import { useEffect, useMemo, useState } from "react";

/**
 * Type definitions for the game state and props
 */
interface GameState {
    deck: number[];
    piles: number[];
    players: {
        [key: string]: {
            hand: Array<number | null>;
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
    EndTurn: () => void;
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
    onGameOver?: (result: any) => void;
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

const EMPTY_HAND: number[] = [];

const TheGameBoard: React.FC<GameBoardProps> = ({ ctx, G, moves, playerID, ...props }) => {
    const [showInvalidMove, setShowInvalidMove] = useState(false);
    const [draggedCard, setDraggedCard] = useState<number | null>(null);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const currentPlayerName = props.matchData[ctx.currentPlayer]?.name || `Player ${Number(ctx.currentPlayer) + 1}`;
    // In observer mode, we're not a player
    const isObserver = playerID === "observer";
    const isCurrentPlayer = !isObserver && ctx.currentPlayer === playerID;
    const handPlayerID = isObserver ? ctx.currentPlayer : playerID;
    const visibleHand = useMemo<number[]>(
        () => (G.players[handPlayerID]?.hand || EMPTY_HAND).filter((card): card is number => typeof card === "number"),
        [G.players, handPlayerID]
    );
    const currentPlayerHand = G.players[ctx.currentPlayer]?.hand || [];
    const minRequiredMoves = MinRequiredMoves(G, ctx);
    const cardsStillRequired = Math.max(minRequiredMoves - (G.turnMovesMade || 0), 0);
    const activeCard = draggedCard ?? selectedCard;

    useEffect(() => {
        setDraggedCard(null);
        setSelectedCard(null);
    }, [ctx.currentPlayer, playerID]);

    useEffect(() => {
        if (selectedCard !== null && !visibleHand.includes(selectedCard)) {
            setSelectedCard(null);
        }
    }, [selectedCard, visibleHand]);

    const showInvalidMoveToast = () => {
        setShowInvalidMove(true);
        setTimeout(() => setShowInvalidMove(false), 2000);
    };
    
    const onEndTurn = () => {
        setSelectedCard(null);
        moves.EndTurn();
    };

    const canEndTurn = currentPlayerHand.length === 0 && G.deck.length === 0
        ? true
        : (G.turnMovesMade || 0) >= minRequiredMoves;

    const canPlayOnAnyPile = (card: number) => (
        Object.values(INDEX_TO_PILE_MAP).some(pile => CanPlayCard(G, ctx, card, pile))
    );

    const handLabelText = isObserver
        ? `${props.matchData[ctx.currentPlayer].name}'s Hand`
        : selectedCard !== null ? `Your Hand: ${selectedCard} selected` : "Your Hand";

    const playCardOnPile = (card: number, pile: string) => {
        if (!isCurrentPlayer || !CanPlayCard(G, ctx, card, pile)) {
            showInvalidMoveToast();
            return;
        }

        moves.PlayCard(card, pile);
        setDraggedCard(null);
        setSelectedCard(null);
    };

    const onCardTap = (card: number) => {
        if (!isCurrentPlayer) return;

        if (!canPlayOnAnyPile(card)) {
            showInvalidMoveToast();
            return;
        }

        setSelectedCard(previousCard => previousCard === card ? null : card);
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
            showInvalidMoveToast();
            return;
        }
        
        // Convert pile index to pile name (e.g., "first_up", "second_down")
        const pile = INDEX_TO_PILE_MAP[pileIndex];
        
        // Check if the move is valid according to game rules
        playCardOnPile(card, pile);
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
    const createPileElement = (index: number, value: number, pileType: PileType) => {
        const pile = INDEX_TO_PILE_MAP[index];
        const isValidDropTarget = activeCard !== null && CanPlayCard(G, ctx, activeCard, pile);
        const dropClassName = [
            "drop-target",
            activeCard !== null ? "drop-target-active" : "",
            isValidDropTarget ? "valid-drop-target" : ""
        ].filter(Boolean).join(" ");
        const pileLetter = index % 2 === 0 ? 'A' : 'B';
        const pileDirection = pileType === 'up' ? 'Ascending' : 'Descending';
        const onPileTap = () => {
            if (selectedCard === null) return;
            playCardOnPile(selectedCard, pile);
        };
        const onPileKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (selectedCard !== null && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onPileTap();
            }
        };

        return (
        <div key={index} className="pile-column">
            <div className="pile-label">
                <span className="pile-label-icon">{pileType === 'up' ? '↑' : '↓'}</span>
                <span>Pile {pileLetter}</span>
            </div>
            <div 
                className={dropClassName}
                role="button"
                tabIndex={selectedCard !== null ? 0 : -1}
                aria-disabled={!isCurrentPlayer || selectedCard === null}
                aria-label={`${pileDirection} pile ${pileLetter}, current value ${value}`}
                onClick={onPileTap}
                onKeyDown={onPileKeyDown}
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
    };
    
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
                <section className="pile-group up-group" aria-label="Ascending piles">
                    <div className="pile-group-heading">
                        <span className="pile-group-icon">↑</span>
                        <div>
                            <h2>Ascending</h2>
                            <p>Play higher, or exactly 10 less</p>
                        </div>
                    </div>
                    <div className="pile-row">{upPiles}</div>
                </section>
                <section className="pile-group down-group" aria-label="Descending piles">
                    <div className="pile-group-heading">
                        <span className="pile-group-icon">↓</span>
                        <div>
                            <h2>Descending</h2>
                            <p>Play lower, or exactly 10 more</p>
                        </div>
                    </div>
                    <div className="pile-row">{downPiles}</div>
                </section>
            </div>
        );
    };
    
    /**
     * Render player's hand with draggable cards using modern array methods
     */
    const renderHand = () => {
        const isDraggable = isCurrentPlayer;
        
        // Check if the player exists and has a hand
        if (!G.players[handPlayerID] || !G.players[handPlayerID].hand) {
            return (
                <div className="cards-container">
                    <div className="no-cards-message">No cards available</div>
                </div>
            );
        }
        
        const handCards = visibleHand.map((handValue, index) => {
            const isPlayableCard = isDraggable && canPlayOnAnyPile(handValue);

            return (
                <div key={index} className="card-wrapper">
                    <Card
                        id={handValue}
                        value={handValue}
                        isDraggable={isDraggable}
                        isPlayable={isPlayableCard}
                        isSelectable={isPlayableCard}
                        isSelected={selectedCard === handValue}
                        aria-label={`Hand card ${handValue}`}
                        onClick={isDraggable ? () => onCardTap(handValue) : undefined}
                        onDragStartCard={() => setDraggedCard(handValue)}
                        onDragEndCard={() => setDraggedCard(null)}
                    />
                </div>
            );
        });
        
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
            <div className="game-subtitle">Four piles. One shared deck. No wasted moves.</div>
        </div>
    );
    
    /**
     * Render the turn indicator
     */
    const renderTurnIndicator = () => (
        <div className={`turn-indicator ${isCurrentPlayer ? 'your-turn' : 'other-turn'}`}>
            {isCurrentPlayer ? (
                <span className="turn-text">Your Turn</span>
            ) : (
                `${currentPlayerName}'s Turn`
            )}
        </div>
    );

    const renderStatusStrip = () => (
        <div className="status-strip" aria-label="Game status">
            <div className="status-item">
                <span className="status-label">Turn</span>
                <span className="status-value">{isCurrentPlayer ? 'You' : currentPlayerName}</span>
            </div>
            <div className="status-item">
                <span className="status-label">Played</span>
                <span className="status-value">{G.turnMovesMade || 0} / {minRequiredMoves}</span>
            </div>
            <div className="status-item">
                <span className="status-label">Needed</span>
                <span className="status-value">{cardsStillRequired}</span>
            </div>
            <div className="status-item">
                <span className="status-label">Deck</span>
                <span className="status-value">{G.deck.length}</span>
            </div>
            <div className="status-item">
                <span className="status-label">Hand</span>
                <span className="status-value">{visibleHand.length}</span>
            </div>
        </div>
    );

    const renderPlayerOverview = () => {
        const playerIDs = (ctx.playOrder || Object.keys(G.players)).slice(0, ctx.numPlayers);

        return (
            <section className="players-overview" aria-label="Players and cards remaining">
                {playerIDs.map(id => {
                    const handCount = G.players[id]?.hand?.length || 0;
                    const shownBacks = Math.min(handCount, 8);
                    const isActivePlayer = id === ctx.currentPlayer;
                    const isSelf = !isObserver && id === playerID;
                    const playerName = isSelf
                        ? "You"
                        : props.matchData[id]?.name || `Player ${Number(id) + 1}`;

                    return (
                        <div
                            key={id}
                            className={`player-summary ${isActivePlayer ? "active-player-summary" : ""}`}
                        >
                            <div className="player-summary-name">{playerName}</div>
                            <div className="player-card-stack" aria-hidden="true">
                                {shownBacks > 0 ? (
                                    Array.from({ length: shownBacks }).map((_, index) => (
                                        <span
                                            key={index}
                                            className="mini-card-back"
                                            style={{
                                                left: `${index * 8}px`,
                                                transform: `rotate(${(index - (shownBacks - 1) / 2) * 2.4}deg)`
                                            }}
                                        />
                                    ))
                                ) : (
                                    <span className="player-empty-hand" />
                                )}
                            </div>
                            <div className="player-card-count">
                                {handCount} {handCount === 1 ? "card" : "cards"}
                            </div>
                        </div>
                    );
                })}
            </section>
        );
    };
    
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
                    disabled={!canEndTurn || !isCurrentPlayer}
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
                            You must play at least 2 cards while the deck has cards, then at least 1 card once the deck is empty
                        </li>
                        <li>The goal is to play all cards from the deck and your hands</li>
                    </ul>
                </div>
            </details>
        </div>
    );
    
    return (
        <div className={`game-container ${isCurrentPlayer ? 'your-turn' : ''}`}>
            {renderHeader()}
            {renderTurnIndicator()}
            {renderStatusStrip()}
            {renderPlayerOverview()}
            {renderPiles()}
            
            {showInvalidMove && (
                <div className="invalid-move-alert">
                    Invalid move! Try another card or pile.
                </div>
            )}
            
            <div className={`hand-container ${isCurrentPlayer ? "active-hand-container" : ""}`}>
                <h3 className="hand-label">
                    <span>{handLabelText}</span>
                    {isCurrentPlayer && (
                        <span className="hand-turn-badge">Your turn</span>
                    )}
                </h3>
                {renderHand()}
                {renderActionButtons()}
            </div>
            
            {/* Wrap GameOver in error boundary to prevent Socket.IO errors from crashing the app */}
            {(() => {
                try {
                    return (
                        <GameOver 
                            gameover={ctx.gameover} 
                            onGameOver={props.onGameOver ? 
                                (result) => {
                                    if (result && props.onGameOver) {
                                        // Delay the callback to avoid Socket.IO issues
                                        setTimeout(() => {
                                            try {
                                                // Check again that onGameOver is defined before calling it
                                                if (props.onGameOver) {
                                                    props.onGameOver(result);
                                                }
                                            } catch (error) {
                                                console.error("Error in onGameOver callback:", error);
                                            }
                                        }, 0);
                                    }
                                } : undefined
                            }
                            playerID={playerID}
                        />
                    );
                } catch (error) {
                    console.error("Error rendering GameOver component:", error);
                    return (
                        <div className="game-over-error">
                            <h2>{ctx.gameover?.won ? "Victory!" : "Game Over"}</h2>
                            <Button 
                                type="primary" 
                                onClick={() => window.location.href = '/'}
                            >
                                Return to Menu
                            </Button>
                        </div>
                    );
                }
            })()}
            {renderGameRules()}
        </div>
    );
};

export default TheGameBoard;
