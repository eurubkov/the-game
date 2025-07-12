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
  if (!ctx || !ctx.numPlayers) {
    console.error("ctx or ctx.numPlayers is null/undefined in GET_HAND_SIZE");
    return 6; // Default to 6 as a fallback
  }
  
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
  if (!G || !ctx || !ctx.currentPlayer) {
    console.error("G, ctx, or ctx.currentPlayer is null/undefined in DrawCard");
    return;
  }
  DrawCardForPlayer(G, ctx, ctx.currentPlayer);
}

const DrawCardForPlayer = (G, ctx, playerID) => {
  if (!G || !G.deck || !G.players) {
    console.error("G, G.deck, or G.players is null/undefined in DrawCardForPlayer");
    return;
  }
  
  if (!G.players[playerID] || !G.players[playerID].hand) {
    console.error(`Player ${playerID} or their hand is null/undefined in DrawCardForPlayer`);
    return;
  }
  
  if (G.deck.length === 0) {
    console.warn("Attempted to draw from an empty deck in DrawCardForPlayer");
    return;
  }
  
  const card = G.deck.pop();
  G.players[playerID].hand.push(card);
  G.players[playerID].hand.sort((a, b) => a - b);
}

const Replenish = (G, ctx) => {
  if (!G || !ctx || !G.deck || !G.players || !ctx.currentPlayer) {
    console.error("G, ctx, G.deck, G.players, or ctx.currentPlayer is null/undefined in Replenish");
    return;
  }
  
  if (!G.players[ctx.currentPlayer] || !G.players[ctx.currentPlayer].hand) {
    console.error(`Current player or their hand is null/undefined in Replenish`);
    return;
  }
  
  while (G.deck.length > 0 && G.players[ctx.currentPlayer].hand.length < GET_HAND_SIZE(G, ctx)) {
    DrawCard(G, ctx);
  }
}

const PlayCard = (G, ctx, card, pile) => {
  if (!G || !ctx || !G.players || !G.piles || !ctx.currentPlayer) {
    console.error("G, ctx, G.players, G.piles, or ctx.currentPlayer is null/undefined in PlayCard");
    return INVALID_MOVE;
  }
  
  if (!G.players[ctx.currentPlayer] || !G.players[ctx.currentPlayer].hand) {
    console.error(`Current player or their hand is null/undefined in PlayCard`);
    return INVALID_MOVE;
  }
  
  const cardIndex = G.players[ctx.currentPlayer].hand.indexOf(+card);
  if (cardIndex < 0 || !CanPlayCard(G, ctx, card, pile)) {
    return INVALID_MOVE;
  }
  
  G.players[ctx.currentPlayer].hand.splice(cardIndex, 1);
  G.piles[PILES_MAP[pile]] = parseInt(card);
  G.turnMovesMade++;
}

export const CanPlayCard = (G, ctx, card, pile) => {
  if (!G || !G.piles) {
    console.error("G or G.piles is null/undefined in CanPlayCard");
    return false;
  }
  
  if (UP_PILES.includes(pile)) {
    const pileIndex = PILES_MAP[pile];
    if (card > G.piles[pileIndex] || G.piles[pileIndex] - card === 10) {
      return true;
    }
    return false;
  } else if (DOWN_PILES.includes(pile)) {
    const pileIndex = PILES_MAP[pile];
    if (card < G.piles[pileIndex] || card - G.piles[pileIndex] === 10) {
      return true;
    }
    return false;
  } else {
    return false;
  }
}

export const MinRequiredMoves = (G, ctx) => {
  // In single-player mode, require only 1 move when the deck has cards
  // In multiplayer mode, require 2 moves when the deck has cards
  if (!ctx) {
    console.error("ctx is null/undefined in MinRequiredMoves");
    return 1; // Default to 1 as a fallback
  }
  
  if (!ctx.numPlayers) {
    console.error("ctx.numPlayers is null/undefined in MinRequiredMoves");
    return 1; // Default to 1 as a fallback
  }
  
  if (ctx.numPlayers === 1) {
    return 1; // Single player always only needs to make 1 move
  }
  
  if (!G || !G.deck) {
    console.error("G or G.deck is null/undefined in MinRequiredMoves");
    return 1; // Default to 1 as a fallback
  }
  
  return G.deck.length > 0 ? 2 : 1; // Multiplayer: 2 moves when deck has cards, 1 when empty
}

const HasValidMoves = (G, ctx, player) => {
  if (!G || !ctx || !player) {
    console.error("G, ctx, or player is null/undefined in HasValidMoves");
    return false;
  }
  
  if (!player.hand) {
    console.error("player.hand is null/undefined in HasValidMoves");
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
  if (!G || !ctx || !G.players || !ctx.playOrder) {
    console.error("G, ctx, G.players, or ctx.playOrder is null/undefined in determineStartingPlayer");
    return "0"; // Default to player 0 as a fallback
  }
  
  try {
    const playerMetrics = ctx.playOrder.map(playerID => {
      if (!G.players[playerID] || !G.players[playerID].hand) {
        console.error(`Player ${playerID} or their hand is null/undefined in determineStartingPlayer`);
        return { playerID, metric: 999 }; // High metric means less preferred
      }
      
      const hand = G.players[playerID].hand;
      if (hand.length < 2) {
        console.error(`Player ${playerID}'s hand has fewer than 2 cards in determineStartingPlayer`);
        return { playerID, metric: 999 };
      }
      
      const sortedHand = [...hand].sort((a, b) => a - b);

      // Score low cards (good for up piles)
      const lowCards = sortedHand.slice(0, 2);
      const lowScore = lowCards[1] - 1;

      // Score high cards (good for down piles) 
      const highCards = sortedHand.slice(-2);
      const highScore = 100 - highCards[highCards.length - 2];

      const mixedScore = (lowCards[0] - 1) + (100 - highCards[highCards.length - 1]);
      const metric = Math.min(lowScore, highScore, mixedScore);
      return { playerID, metric };
    });

    playerMetrics.sort((a, b) => a.metric - b.metric);
    return playerMetrics[0].playerID;
  } catch (error) {
    console.error("Error in determineStartingPlayer:", error);
    return "0"; // Default to player 0 as a fallback
  }
}

const EndTurn = (G, ctx) => {
  if (!G || !ctx) {
    console.error("G or ctx is null/undefined in EndTurn");
    return INVALID_MOVE;
  }
  
  if (!G.turnMovesMade) {
    console.error("G.turnMovesMade is null/undefined in EndTurn");
    return INVALID_MOVE;
  }
  
  // Check if the player has made the minimum required moves
  const minRequiredMoves = MinRequiredMoves(G, ctx);
  if (G.turnMovesMade < minRequiredMoves) {
    return INVALID_MOVE;
  }
  
  if (!ctx.events) {
    console.error("ctx.events is null/undefined in EndTurn");
    return INVALID_MOVE;
  }
  
  ctx.events.endTurn();
}

// Use type assertion for the entire game object to handle type mismatches with boardgame.io
const TheGame = {
  name: "TheGame",
  minPlayers: 1,
  maxPlayers: 5,
  playerView: PlayerView.STRIP_SECRETS,
  setup: (ctx) => {
    if (!ctx) {
      console.error("ctx is null/undefined in setup");
      // Create a default game state
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
    
    try {
      // Generate a random seed if one isn't provided through game config
      // This will be a number between 1 and 1,000,000
      const seed = (ctx as any)._random?.seed || Math.floor(Math.random() * 1000000) + 1;

      return {
        // Store the seed for leaderboard purposes
        seed: seed,
        deck: ctx.random?.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2)) || 
              Array.from({ length: DECK_SIZE }, (v, i) => i + 2), // Fallback if random is undefined
        piles: [1, 1, 100, 100],
        players: {
          "0": {
            hand: []
          },
          "1": {
            hand: []
          },
          "2": {
            hand: []
          },
          "3": {
            hand: []
          },
          "4": {
            hand: []
          },
        },
        turnMovesMade: 0
      };
    } catch (error) {
      console.error("Error in setup:", error);
      // Create a default game state
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
      if (!G || !ctx || !G.players || !ctx.currentPlayer || !G.piles) {
        console.error("G, ctx, G.players, ctx.currentPlayer, or G.piles is null/undefined in ai.enumerate");
        return [];
      }
      
      try {
        const moves: Move[] = [];
        
        if (!G.players[ctx.currentPlayer] || !G.players[ctx.currentPlayer].hand) {
          console.error(`Current player or their hand is null/undefined in ai.enumerate`);
          return [];
        }
        
        const player = G.players[ctx.currentPlayer];

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
        if (G.turnMovesMade !== undefined && G.turnMovesMade >= MinRequiredMoves(G, ctx)) {
          moves.push({ move: 'EndTurn', score: 5 }); // Lower score to make it more preferred than large gaps
        }

        return moves;
      } catch (error) {
        console.error("Error in ai.enumerate:", error);
        return [];
      }
    },

    // @ts-ignore - The 'objectives' property is used by boardgame.io but not in the type definitions
    objectives: (G, ctx) => {
      if (!G || !ctx) {
        console.error("G or ctx is null/undefined in ai.objectives");
        return {};
      }
      
      try {
        return {
          // Primary goal: minimize total cards remaining
          minimizeCards: {
            weight: 1000,
            checker: (G, ctx) => {
              if (!G || !G.deck || !G.players) {
                console.error("G, G.deck, or G.players is null/undefined in minimizeCards.checker");
                return false;
              }
              
              try {
                const totalCards = G.deck.length +
                  Object.values(G.players).reduce((sum, p: any) => {
                    if (!p || !p.hand) return sum;
                    return sum + p.hand.length;
                  }, 0);

                // Reward states with fewer cards
                return totalCards === 0;
              } catch (error) {
                console.error("Error in minimizeCards.checker:", error);
                return false;
              }
            }
          } as any,

          // Reward balanced pile progression
          balancedPiles: {
            weight: 70,
            checker: (G, ctx) => {
              if (!G || !G.piles || !G.deck) {
                console.error("G, G.piles, or G.deck is null/undefined in balancedPiles.checker");
                return false;
              }
              
              try {
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
                console.error("Error in balancedPiles.checker:", error);
                return false;
              }
            }
          }
        };
      } catch (error) {
        console.error("Error in ai.objectives:", error);
        return {};
      }
    }
  } as any,

  endIf: (G, ctx) => {
    if (!G || !ctx) {
      console.error("G or ctx is null/undefined in endIf");
      return;
    }
    
    try {
      // Check if all cards have been played (win condition)
      if (G.deck && G.deck.length === 0 && G.players && Object.keys(G.players).every(x => G.players[x] && G.players[x].hand && G.players[x].hand.length === 0)) {
        return {
          won: true,
          players: G.players,
          seed: G.seed,
          numPlayers: ctx.numPlayers,
          deckLength: G.deck.length
        };
      }
      
      // Check if current player has valid moves
      if (!G.turnMovesMade || !ctx.currentPlayer || !ctx.playOrder || !G.players || !G.players[ctx.currentPlayer]) {
        console.error("G.turnMovesMade, ctx.currentPlayer, ctx.playOrder, G.players, or G.players[ctx.currentPlayer] is null/undefined in endIf");
        return;
      }
      
      const minRequiredMoves = MinRequiredMoves(G, ctx);
      const movesMade = G.turnMovesMade;
      const currentPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[ctx.currentPlayer]);
      
      // Game over if player can't make the minimum required moves
      if (!currentPlayerHasValidMoves && movesMade < minRequiredMoves) {
        return {
          won: false,
          players: G.players,
          seed: G.seed,
          numPlayers: ctx.numPlayers,
          deckLength: G.deck.length
        };
      } else if (!currentPlayerHasValidMoves && movesMade >= minRequiredMoves) {
        // Check if next player has valid moves
        if (ctx.playOrderPos === undefined || ctx.numPlayers === undefined) {
          console.error("ctx.playOrderPos or ctx.numPlayers is undefined in endIf");
          return;
        }
        
        const nextPlayerPos = (ctx.playOrderPos + 1) % ctx.numPlayers;
        if (nextPlayerPos >= ctx.playOrder.length) {
          console.error("Invalid next player position in endIf");
          return;
        }
        
        const nextPlayer = ctx.playOrder[nextPlayerPos];
        if (!nextPlayer || !G.players[nextPlayer]) {
          console.error("Next player or their data is null/undefined in endIf");
          return;
        }
        
        const nextPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[nextPlayer]);
        
        // Game over if next player also has no valid moves
        if (!nextPlayerHasValidMoves) {
          return {
            won: false,
            players: G.players,
            seed: G.seed,
            numPlayers: ctx.numPlayers,
            deckLength: G.deck.length
          };
        }
      }
    } catch (error) {
      console.error("Error in endIf:", error);
      return;
    }
  },

  phases: {
    draw: {
      start: true,
      endIf: (G, ctx) => {
        if (!G || !ctx || !G.deck || !ctx.numPlayers) {
          console.error("G, ctx, G.deck, or ctx.numPlayers is null/undefined in draw.endIf");
          return true; // End the phase as a fallback
        }
        return G.deck.length <= DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx);
      },
      onBegin: (G, ctx) => {
        if (!G || !ctx || !G.deck || !ctx.numPlayers || !ctx.playOrder) {
          console.error("G, ctx, G.deck, ctx.numPlayers, or ctx.playOrder is null/undefined in draw.onBegin");
          return;
        }
        
        try {
          while (G.deck.length > DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx)) {
            for (let i = 0; i < ctx.numPlayers; i++) {
              if (i < ctx.playOrder.length) {
                DrawCardForPlayer(G, ctx, ctx.playOrder[i]);
              }
            }
          }
        } catch (error) {
          console.error("Error in draw.onBegin:", error);
        }
      },
      next: "determinePlayOrder"
    },
    determinePlayOrder: {
      turn: {
        onBegin: (G, ctx) => {
          if (!G || !ctx) {
            console.error("G or ctx is null/undefined in determinePlayOrder.onBegin");
            return;
          }
          
          try {
            const startingPlayerID = determineStartingPlayer(G, ctx);
            // Store the selected player ID in the game state
            G.startingPlayerID = startingPlayerID;
            
            if (!ctx.events) {
              console.error("ctx.events is null/undefined in determinePlayOrder.onBegin");
              return;
            }
            
            ctx.events.endTurn({ next: startingPlayerID });
          } catch (error) {
            console.error("Error in determinePlayOrder.onBegin:", error);
          }
        },
        onEnd: (G, ctx) => {
          if (!ctx || !ctx.events) {
            console.error("ctx or ctx.events is null/undefined in determinePlayOrder.onEnd");
            return;
          }
          
          ctx.events.endPhase();
        }
      },
      next: "playCard"
    },
    playCard: {
      endIf: (G, ctx) => {
        if (!G || !G.deck) {
          console.error("G or G.deck is null/undefined in playCard.endIf");
          return false;
        }
        return G.deck.length === 0;
      },
      moves: {
        PlayCard,
        EndTurn
      },
      turn: {
        minMoves: 1, // Set to 1 for all player counts, we'll enforce the 2-move minimum for multiplayer in the EndTurn move
        maxMoves: 7,
        onEnd: (G, ctx) => {
          if (!G || !ctx) {
            console.error("G or ctx is null/undefined in playCard.turn.onEnd");
            return;
          }
          
          Replenish(G, ctx);
        },
        onBegin: (G, ctx) => {
          if (!G) {
            console.error("G is null/undefined in playCard.turn.onBegin");
            return;
          }
          
          G.turnMovesMade = 0;
        },
        order: {
          // Custom turn order that starts with the selected player
          first: (G) => {
            if (!G) {
              console.error("G is null/undefined in playCard.turn.order.first");
              return 0;
            }
            
            return G.startingPlayerID ? parseInt(G.startingPlayerID) : 0;
          },
          next: (G, ctx) => {
            if (!G || !ctx || ctx.numPlayers === undefined || ctx.playOrderPos === undefined) {
              console.error("G, ctx, ctx.numPlayers, or ctx.playOrderPos is null/undefined in playCard.turn.order.next");
              return 0;
            }
            
            return (ctx.playOrderPos + 1) % ctx.numPlayers;
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
          if (!G) {
            console.error("G is null/undefined in playCardEmptyDeck.turn.onBegin");
            return;
          }
          
          G.turnMovesMade = 0;
        },
        // Maintain the same turn order as in the playCard phase
        order: {
          first: (G) => {
            if (!G) {
              console.error("G is null/undefined in playCardEmptyDeck.turn.order.first");
              return 0;
            }
            
            return G.startingPlayerID ? parseInt(G.startingPlayerID) : 0;
          },
          next: (G, ctx) => {
            if (!G || !ctx || ctx.numPlayers === undefined || ctx.playOrderPos === undefined) {
              console.error("G, ctx, ctx.numPlayers, or ctx.playOrderPos is null/undefined in playCardEmptyDeck.turn.order.next");
              return 0;
            }
            
            return (ctx.playOrderPos + 1) % ctx.numPlayers;
          }
        }
      }
    }
  }
};

export function isTenJump(G, [card, pile]) {
  if (!G || !G.piles) {
    console.error("G or G.piles is null/undefined in isTenJump");
    return false;
  }
  
  const pileVal = G.piles[PILES_MAP[pile]];
  return (UP_PILES.includes(pile) && pileVal - card === 10) ||
    (DOWN_PILES.includes(pile) && card - pileVal === 10);
}

// Use a two-step type assertion to force TypeScript to accept our implementation
// First cast to unknown, then to Game to bypass type checking
export default TheGame as unknown as Game;
