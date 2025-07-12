import { Game } from 'boardgame.io';
import { INVALID_MOVE, PlayerView } from 'boardgame.io/core';

interface Move {
  move: string;
  args?: [number, string];
  score?: number;
}

// Interface for game metadata
export interface GameMetadata {
  seed: number;
  numPlayers: number;
}

const DECK_SIZE = 98;
const GET_HAND_SIZE = (G, ctx) => {
  if (ctx.numPlayers === 1) return 8; // Single player gets 8 cards
  if (ctx.numPlayers === 2) return 7; // 2 players get 7 cards each
  return 6; // 3+ players get 6 cards each
};

export const FIRST_UP = "first_up";
export const SECOND_UP = "second_up";
export const FIRST_DOWN = "first_down";
export const SECOND_DOWN = "second_down";

export const UP_PILES = [FIRST_UP, SECOND_UP];
export const DOWN_PILES = [FIRST_DOWN, SECOND_DOWN];

export const PILES_MAP = {
  [FIRST_UP]: 0,
  [SECOND_UP]: 1,
  [FIRST_DOWN]: 2,
  [SECOND_DOWN]: 3
}


const DrawCard = (G, ctx) => {
  DrawCardForPlayer(G, ctx, ctx.currentPlayer);
}

const DrawCardForPlayer = (G, ctx, playerID) => {
  // Defensive check for undefined values
  if (!G || !G.deck || !G.players || !G.players[playerID]) {
    console.error('DrawCardForPlayer: Missing required game state properties', { 
      hasG: !!G, 
      hasDeck: G && !!G.deck, 
      hasPlayers: G && !!G.players,
      hasPlayer: G && G.players && !!G.players[playerID]
    });
    return;
  }
  
  // Initialize hand if it doesn't exist
  if (!G.players[playerID].hand) {
    G.players[playerID].hand = [];
  }
  
  const card = G.deck.pop();
  if (card !== undefined) {
    G.players[playerID].hand.push(card);
    G.players[playerID].hand.sort((a, b) => a - b);
  } else {
    console.error('DrawCardForPlayer: Attempted to draw from empty deck');
  }
}

const Replenish = (G, ctx) => {
  // Defensive check for undefined values
  if (!G || !G.deck || !G.players || !ctx || !ctx.currentPlayer) {
    console.error('Replenish: Missing required game state properties', { 
      hasG: !!G, 
      hasDeck: G && !!G.deck, 
      hasPlayers: G && !!G.players,
      hasCtx: !!ctx,
      hasCurrentPlayer: ctx && !!ctx.currentPlayer
    });
    return;
  }
  
  // Ensure the current player exists
  if (!G.players[ctx.currentPlayer]) {
    console.error(`Replenish: Current player ${ctx.currentPlayer} not found in players`, G.players);
    return;
  }
  
  // Initialize hand if it doesn't exist
  if (!G.players[ctx.currentPlayer].hand) {
    G.players[ctx.currentPlayer].hand = [];
  }
  
  try {
    while (G.deck.length > 0 && G.players[ctx.currentPlayer].hand.length < GET_HAND_SIZE(G, ctx)) {
      DrawCard(G, ctx);
    }
  } catch (error) {
    console.error('Error in Replenish:', error);
  }
}

const PlayCard = (G, ctx, card, pile) => {
  // Defensive check for undefined values
  if (!G || !G.players || !G.piles || !ctx || !ctx.currentPlayer) {
    console.error('PlayCard: Missing required game state properties', { 
      hasG: !!G, 
      hasPlayers: G && !!G.players,
      hasPiles: G && !!G.piles,
      hasCtx: !!ctx,
      hasCurrentPlayer: ctx && !!ctx.currentPlayer
    });
    return INVALID_MOVE;
  }
  
  // Ensure the current player exists
  if (!G.players[ctx.currentPlayer]) {
    console.error(`PlayCard: Current player ${ctx.currentPlayer} not found in players`, G.players);
    return INVALID_MOVE;
  }
  
  // Ensure the player has a hand
  if (!G.players[ctx.currentPlayer].hand) {
    console.error(`PlayCard: Current player ${ctx.currentPlayer} has no hand`, G.players[ctx.currentPlayer]);
    return INVALID_MOVE;
  }
  
  // Validate card and pile
  if (card === undefined || pile === undefined || !PILES_MAP.hasOwnProperty(pile)) {
    console.error('PlayCard: Invalid card or pile', { card, pile });
    return INVALID_MOVE;
  }
  
  try {
    const cardIndex = G.players[ctx.currentPlayer].hand.indexOf(+card);
    if (cardIndex < 0 || !CanPlayCard(G, ctx, card, pile)) {
      return INVALID_MOVE;
    }
    G.players[ctx.currentPlayer].hand.splice(cardIndex, 1);
    G.piles[PILES_MAP[pile]] = parseInt(card);
    G.turnMovesMade++;
  } catch (error) {
    console.error('Error in PlayCard:', error);
    return INVALID_MOVE;
  }
}

export const CanPlayCard = (G, ctx, card, pile) => {
  // Defensive check for undefined values
  if (!G || !G.piles || card === undefined || pile === undefined) {
    console.error('CanPlayCard: Missing required parameters', { 
      hasG: !!G, 
      hasPiles: G && !!G.piles,
      hasCard: card !== undefined,
      hasPile: pile !== undefined
    });
    return false;
  }
  
  // Validate pile
  if (!PILES_MAP.hasOwnProperty(pile)) {
    console.error('CanPlayCard: Invalid pile', { pile });
    return false;
  }
  
  try {
    if (UP_PILES.includes(pile)) {
      const pileIndex = PILES_MAP[pile];
      if (G.piles[pileIndex] === undefined) {
        console.error('CanPlayCard: Pile value is undefined', { pileIndex, piles: G.piles });
        return false;
      }
      if (card > G.piles[pileIndex] || G.piles[pileIndex] - card === 10) {
        return true;
      }
      return false;
    } else if (DOWN_PILES.includes(pile)) {
      const pileIndex = PILES_MAP[pile];
      if (G.piles[pileIndex] === undefined) {
        console.error('CanPlayCard: Pile value is undefined', { pileIndex, piles: G.piles });
        return false;
      }
      if (card < G.piles[pileIndex] || card - G.piles[pileIndex] === 10) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error in CanPlayCard:', error);
    return false;
  }
}

export const MinRequiredMoves = (G, ctx) => {
  // Defensive check for undefined values
  if (!G || !G.deck || !ctx) {
    console.error('MinRequiredMoves: Missing required parameters', { 
      hasG: !!G, 
      hasDeck: G && !!G.deck,
      hasCtx: !!ctx
    });
    return 1; // Default to 1 move if we can't determine
  }
  
  try {
    // In single-player mode, require only 1 move when the deck has cards
    // In multiplayer mode, require 2 moves when the deck has cards
    if (ctx.numPlayers === 1) {
      return 1; // Single player always only needs to make 1 move
    }
    return G.deck.length > 0 ? 2 : 1; // Multiplayer: 2 moves when deck has cards, 1 when empty
  } catch (error) {
    console.error('Error in MinRequiredMoves:', error);
    return 1; // Default to 1 move on error
  }
}

const HasValidMoves = (G, ctx, player) => {
  // Defensive check for undefined player or hand
  if (!player || !player.hand) {
    console.error('HasValidMoves: Player or player.hand is undefined', { player });
    return false;
  }
  
  const piles = Object.keys(PILES_MAP);
  for (const pile of piles) {
    if (player.hand.length === 0 || player.hand.some(card => CanPlayCard(G, ctx, card, pile))) {
      return true;
    }
  }
  return false;
}

const determineStartingPlayer = (G, ctx) => {
  // Defensive check for undefined values
  if (!ctx.playOrder || !Array.isArray(ctx.playOrder) || ctx.playOrder.length === 0) {
    console.error('determineStartingPlayer: Invalid playOrder', { playOrder: ctx.playOrder });
    return "0"; // Default to player 0 if playOrder is invalid
  }

  try {
    const playerMetrics = ctx.playOrder.map(playerID => {
      // Ensure player and hand exist
      if (!G.players[playerID] || !G.players[playerID].hand) {
        console.error(`determineStartingPlayer: Player ${playerID} or hand is undefined`, { 
          player: G.players[playerID] 
        });
        return { playerID, metric: 999 }; // High metric (less preferred)
      }

      const hand = G.players[playerID].hand;
      
      // Handle case where hand is empty or has only one card
      if (hand.length === 0) {
        return { playerID, metric: 999 };
      }
      
      if (hand.length === 1) {
        return { playerID, metric: 50 }; // Middle metric
      }
      
      const sortedHand = [...hand].sort((a, b) => a - b);

      // Score low cards (good for up piles)
      const lowCards = sortedHand.slice(0, Math.min(2, sortedHand.length));
      const lowScore = lowCards.length > 1 ? lowCards[1] - 1 : 50;

      // Score high cards (good for down piles) 
      const highCards = sortedHand.slice(-Math.min(2, sortedHand.length));
      const highScore = highCards.length > 1 ? 100 - highCards[highCards.length - 2] : 50;

      const mixedScore = (lowCards[0] - 1) + (100 - highCards[highCards.length - 1]);
      const metric = Math.min(lowScore, highScore, mixedScore);
      return { playerID, metric };
    });

    playerMetrics.sort((a, b) => a.metric - b.metric);
    return playerMetrics[0].playerID;
  } catch (error) {
    console.error('Error in determineStartingPlayer:', error);
    return ctx.playOrder[0]; // Default to first player in playOrder
  }
}

const EndTurn = (G, ctx) => {
  // Defensive check for undefined values
  if (!G || !ctx || !ctx.events) {
    console.error('EndTurn: Missing required game state properties', { 
      hasG: !!G, 
      hasCtx: !!ctx,
      hasEvents: ctx && !!ctx.events
    });
    return INVALID_MOVE;
  }
  
  try {
    // Check if the player has made the minimum required moves
    const minRequiredMoves = MinRequiredMoves(G, ctx);
    if (G.turnMovesMade < minRequiredMoves) {
      return INVALID_MOVE;
    }
    ctx.events.endTurn();
  } catch (error) {
    console.error('Error in EndTurn:', error);
    return INVALID_MOVE;
  }
}

// Use type assertion for the entire game object to handle type mismatches with boardgame.io
const TheGame = {
  name: "TheGame",
  minPlayers: 1,
  maxPlayers: 5,
  playerView: PlayerView.STRIP_SECRETS,
  setup: (ctx) => {
    try {
      // Defensive check for undefined values
      if (!ctx) {
        console.error('setup: Missing required context', { hasCtx: !!ctx });
        // Return a default game state even if context is missing
        return {
          seed: Math.floor(Math.random() * 1000000) + 1,
          deck: Array.from({ length: DECK_SIZE }, (v, i) => i + 2),
          piles: [1, 1, 100, 100],
          players: {
            "0": { hand: [] },
            "1": { hand: [] },
            "2": { hand: [] },
            "3": { hand: [] },
            "4": { hand: [] },
          },
          turnMovesMade: 0
        };
      }
      
      // Generate a random seed if one isn't provided through game config
      // This will be a number between 1 and 1,000,000
      const seed = (ctx as any)._random?.seed || Math.floor(Math.random() * 1000000) + 1;
      
      // Create the deck with a fallback if random is undefined
      let deck;
      if (ctx.random && typeof ctx.random.Shuffle === 'function') {
        deck = ctx.random.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2));
      } else {
        console.warn('setup: ctx.random.Shuffle is not available, using unsorted deck');
        deck = Array.from({ length: DECK_SIZE }, (v, i) => i + 2);
      }

      return {
        // Store the seed for leaderboard purposes
        seed: seed,
        deck: deck,
        piles: [1, 1, 100, 100],
        players: {
          "0": { hand: [] },
          "1": { hand: [] },
          "2": { hand: [] },
          "3": { hand: [] },
          "4": { hand: [] },
        },
        turnMovesMade: 0
      };
    } catch (error) {
      console.error('Error in setup:', error);
      // Return a default game state on error
      return {
        seed: Math.floor(Math.random() * 1000000) + 1,
        deck: Array.from({ length: DECK_SIZE }, (v, i) => i + 2),
        piles: [1, 1, 100, 100],
        players: {
          "0": { hand: [] },
          "1": { hand: [] },
          "2": { hand: [] },
          "3": { hand: [] },
          "4": { hand: [] },
        },
        turnMovesMade: 0
      };
    }
  },

  ai: {
    enumerate: (G, ctx) => {
      try {
        // Defensive check for undefined values
        if (!G || !G.players || !ctx || !ctx.currentPlayer) {
          console.error('ai.enumerate: Missing required game state properties', { 
            hasG: !!G, 
            hasPlayers: G && !!G.players,
            hasCtx: !!ctx,
            hasCurrentPlayer: ctx && !!ctx.currentPlayer
          });
          return []; // Return empty moves array if we can't proceed
        }
        
        const moves: Move[] = [];
        const player = G.players[ctx.currentPlayer];
        
        // Ensure player and hand exist
        if (!player || !player.hand || !Array.isArray(player.hand)) {
          console.error('ai.enumerate: Player or player.hand is invalid', { 
            hasPlayer: !!player,
            hasHand: player && !!player.hand,
            isHandArray: player && player.hand && Array.isArray(player.hand)
          });
          return []; // Return empty moves array if player or hand is invalid
        }

        // 1. Every PlayCard with scoring
        for (const card of player.hand) {
          for (const pile of [FIRST_UP, SECOND_UP, FIRST_DOWN, SECOND_DOWN]) {
            if (CanPlayCard(G, ctx, card, pile)) {
              const pileValue = G.piles[PILES_MAP[pile]];
              let score;
              if (isTenJump(G, [card, pile])) {
                score = 0; // Ten jumps get lowest score (most preferred)
              } else {
                score = Math.abs(card - pileValue); // Simple difference scoring
              }
              moves.push({ move: 'PlayCard', args: [card, pile], score });
            }
          }
        }

        // 2. EndTurn when allowed
        if (G.turnMovesMade >= MinRequiredMoves(G, ctx)) {
          moves.push({ move: 'EndTurn', score: 5 }); // Lower score to make it more preferred than large gaps
        }

        return moves;
      } catch (error) {
        console.error('Error in ai.enumerate:', error);
        return []; // Return empty moves array on error
      }
    },

    // @ts-ignore - The 'objectives' property is used by boardgame.io but not in the type definitions
    objectives: (G, ctx) => {
      try {
        // Defensive check for undefined values
        if (!G || !G.deck || !G.players || !G.piles) {
          console.error('ai.objectives: Missing required game state properties', { 
            hasG: !!G, 
            hasDeck: G && !!G.deck,
            hasPlayers: G && !!G.players,
            hasPiles: G && !!G.piles
          });
          return {}; // Return empty objectives if we can't proceed
        }
        
        return {
          // Primary goal: minimize total cards remaining
          minimizeCards: {
            weight: 1000,
            checker: (G, ctx) => {
              try {
                if (!G || !G.deck || !G.players) {
                  return false; // Can't check if game state is invalid
                }
                
                const totalCards = G.deck.length +
                  Object.values(G.players).reduce((sum, p: any) => {
                    if (!p || !p.hand) return sum;
                    return sum + p.hand.length;
                  }, 0);

                // Reward states with fewer cards
                return totalCards === 0;
              } catch (error) {
                console.error('Error in minimizeCards checker:', error);
                return false; // Default to false on error
              }
            }
          } as any,

          // Reward balanced pile progression
          balancedPiles: {
            weight: 70,
            checker: (G, ctx) => {
              try {
                if (!G || !G.deck || !G.piles) {
                  return false; // Can't check if game state is invalid
                }
                
                // Calculate how much "room" each pile has left
                const upRoom1 = 100 - G.piles[0];
                const upRoom2 = 100 - G.piles[1];
                const downRoom1 = G.piles[2] - 1;
                const downRoom2 = G.piles[3] - 1;

                // Reward states where at least 2 piles have decent room
                const pileRooms = [upRoom1, upRoom2, downRoom1, downRoom2];
                const decentRooms = pileRooms.filter(room => room >= G.deck.length - 2);
                return decentRooms.length >= 2;
              } catch (error) {
                console.error('Error in balancedPiles checker:', error);
                return false; // Default to false on error
              }
            }
          }
        };
      } catch (error) {
        console.error('Error in ai.objectives:', error);
        return {}; // Return empty objectives on error
      }
    }
  } as any,

  endIf: (G, ctx) => {
    // Defensive check for undefined values
    if (!G || !G.deck || !G.players || !ctx || !ctx.currentPlayer || !ctx.playOrder) {
      console.error('endIf: Missing required game state properties', { 
        hasG: !!G, 
        hasDeck: G && !!G.deck, 
        hasPlayers: G && !!G.players,
        hasCtx: !!ctx,
        hasCurrentPlayer: ctx && !!ctx.currentPlayer,
        hasPlayOrder: ctx && !!ctx.playOrder
      });
      return { won: false, error: 'Game state is invalid' };
    }

    if (G.deck.length === 0 && Object.keys(G.players).every(x => G.players[x] && G.players[x].hand && G.players[x].hand.length === 0)) {
      return {
        won: true,
        players: G.players,
        seed: G.seed,
        numPlayers: ctx.numPlayers,
        deckLength: G.deck.length
      }
    }

    const minRequiredMoves = MinRequiredMoves(G, ctx);
    const movesMade = G.turnMovesMade;
    
    // Ensure the current player exists before checking for valid moves
    if (!G.players[ctx.currentPlayer]) {
      console.error(`endIf: Current player ${ctx.currentPlayer} not found in players`, G.players);
      return { won: false, error: 'Current player not found' };
    }
    
    const currentPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[ctx.currentPlayer]);

    if (!currentPlayerHasValidMoves && movesMade < minRequiredMoves) {
      return {
        won: false,
        players: G.players,
        seed: G.seed,
        numPlayers: ctx.numPlayers,
        deckLength: G.deck.length
      }
    } else if (!currentPlayerHasValidMoves && movesMade >= minRequiredMoves) {
      // Validate that the next player has valid moves, otherwise end the game
      // Ensure playOrder and playOrderPos exist and are valid
      if (!ctx.playOrder || typeof ctx.playOrderPos !== 'number') {
        console.error('endIf: Missing playOrder or playOrderPos', { 
          hasPlayOrder: !!ctx.playOrder, 
          playOrderPos: ctx.playOrderPos 
        });
        return { won: false, error: 'Play order information is missing' };
      }
      
      const nextPlayer = ctx.playOrder[(ctx.playOrderPos + 1) % ctx.numPlayers];
      
      // Ensure the next player exists before checking for valid moves
      if (!G.players[nextPlayer]) {
        console.error(`endIf: Next player ${nextPlayer} not found in players`, G.players);
        return { won: false, error: 'Next player not found' };
      }
      
      const nextPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[nextPlayer]);

      if (!nextPlayerHasValidMoves) {
        return {
          won: false,
          players: G.players,
          seed: G.seed,
          numPlayers: ctx.numPlayers,
          deckLength: G.deck.length
        }
      }
    }
  },

  phases: {
    draw: {
      start: true,
      endIf: (G, ctx) => {
        // Defensive check for undefined values
        if (!G || !G.deck || !ctx || typeof ctx.numPlayers !== 'number') {
          console.error('draw.endIf: Missing required game state properties', { 
            hasG: !!G, 
            hasDeck: G && !!G.deck,
            hasCtx: !!ctx,
            numPlayers: ctx && ctx.numPlayers
          });
          return true; // End the phase if we can't determine
        }
        
        try {
          return G.deck.length <= DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx);
        } catch (error) {
          console.error('Error in draw.endIf:', error);
          return true; // End the phase on error
        }
      },
      onBegin: (G, ctx) => {
        // Defensive check for undefined values
        if (!G || !G.deck || !ctx || !ctx.playOrder || typeof ctx.numPlayers !== 'number') {
          console.error('draw.onBegin: Missing required game state properties', { 
            hasG: !!G, 
            hasDeck: G && !!G.deck,
            hasCtx: !!ctx,
            hasPlayOrder: ctx && !!ctx.playOrder,
            numPlayers: ctx && ctx.numPlayers
          });
          return; // Skip if we can't proceed
        }
        
        try {
          while (G.deck.length > DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx)) {
            for (let i = 0; i < ctx.numPlayers; i++) {
              if (i < ctx.playOrder.length) {
                DrawCardForPlayer(G, ctx, ctx.playOrder[i]);
              } else {
                console.error(`draw.onBegin: Player index ${i} out of bounds in playOrder`, { 
                  playOrderLength: ctx.playOrder.length 
                });
              }
            }
          }
        } catch (error) {
          console.error('Error in draw.onBegin:', error);
        }
      },
      next: "determinePlayOrder"
    },
    determinePlayOrder: {
      turn: {
        onBegin: (G, ctx) => {
          // Defensive check for undefined values
          if (!G || !ctx || !ctx.events) {
            console.error('determinePlayOrder.onBegin: Missing required game state properties', { 
              hasG: !!G, 
              hasCtx: !!ctx,
              hasEvents: ctx && !!ctx.events
            });
            return; // Skip if we can't proceed
          }
          
          try {
            const startingPlayerID = determineStartingPlayer(G, ctx);
            ctx.events.endTurn({ next: startingPlayerID });
          } catch (error) {
            console.error('Error in determinePlayOrder.onBegin:', error);
          }
        },
        onEnd: (G, ctx) => {
          // Defensive check for undefined values
          if (!ctx || !ctx.events) {
            console.error('determinePlayOrder.onEnd: Missing required game state properties', { 
              hasCtx: !!ctx,
              hasEvents: ctx && !!ctx.events
            });
            return; // Skip if we can't proceed
          }
          
          try {
            ctx.events.endPhase();
          } catch (error) {
            console.error('Error in determinePlayOrder.onEnd:', error);
          }
        }
      },
      next: "playCard"
    },
    playCard: {
      endIf: (G, ctx) => {
        // Defensive check for undefined values
        if (!G || !G.deck) {
          console.error('playCard.endIf: Missing required game state properties', { 
            hasG: !!G, 
            hasDeck: G && !!G.deck
          });
          return true; // End the phase if we can't determine
        }
        
        try {
          return G.deck.length === 0;
        } catch (error) {
          console.error('Error in playCard.endIf:', error);
          return true; // End the phase on error
        }
      },
      moves: {
        PlayCard,
        EndTurn
      },
      turn: {
        minMoves: 1, // Set to 1 for all player counts, we'll enforce the 2-move minimum for multiplayer in the EndTurn move
        maxMoves: 7,
        onEnd: (G, ctx) => {
          // Defensive check for undefined values
          if (!G || !ctx) {
            console.error('playCard.turn.onEnd: Missing required game state properties', { 
              hasG: !!G, 
              hasCtx: !!ctx
            });
            return; // Skip if we can't proceed
          }
          
          try {
            Replenish(G, ctx);
          } catch (error) {
            console.error('Error in playCard.turn.onEnd:', error);
          }
        },
        onBegin: (G, ctx) => {
          // Defensive check for undefined values
          if (!G) {
            console.error('playCard.turn.onBegin: Missing required game state properties', { 
              hasG: !!G
            });
            return; // Skip if we can't proceed
          }
          
          try {
            G.turnMovesMade = 0;
          } catch (error) {
            console.error('Error in playCard.turn.onBegin:', error);
          }
        }
      },
      next: "playCardEmptyDeck"
    },
    playCardEmptyDeck: {
      moves: {
        PlayCard,
        EndTurn
      },
      turn: {
        minMoves: 1, maxMoves: 7,
        onBegin: (G, ctx) => {
          // Defensive check for undefined values
          if (!G) {
            console.error('playCardEmptyDeck.turn.onBegin: Missing required game state properties', { 
              hasG: !!G
            });
            return; // Skip if we can't proceed
          }
          
          try {
            G.turnMovesMade = 0;
          } catch (error) {
            console.error('Error in playCardEmptyDeck.turn.onBegin:', error);
          }
        }
      }
    }
  }
};

export function isTenJump(G, [card, pile]) {
  // Defensive check for undefined values
  if (!G || !G.piles || card === undefined || pile === undefined) {
    console.error('isTenJump: Missing required parameters', { 
      hasG: !!G, 
      hasPiles: G && !!G.piles,
      hasCard: card !== undefined,
      hasPile: pile !== undefined
    });
    return false;
  }
  
  // Validate pile
  if (!PILES_MAP.hasOwnProperty(pile)) {
    console.error('isTenJump: Invalid pile', { pile });
    return false;
  }
  
  try {
    const pileIndex = PILES_MAP[pile];
    if (G.piles[pileIndex] === undefined) {
      console.error('isTenJump: Pile value is undefined', { pileIndex, piles: G.piles });
      return false;
    }
    
    const pileVal = G.piles[pileIndex];
    return (UP_PILES.includes(pile) && pileVal - card === 10) ||
      (DOWN_PILES.includes(pile) && card - pileVal === 10);
  } catch (error) {
    console.error('Error in isTenJump:', error);
    return false;
  }
}

// Use a two-step type assertion to force TypeScript to accept our implementation
// First cast to unknown, then to Game to bypass type checking
export default TheGame as unknown as Game;
