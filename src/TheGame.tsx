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
  const card = G.deck.pop();
  G.players[playerID].hand.push(card);
  G.players[playerID].hand.sort((a, b) => a - b);
}

const Replenish = (G, ctx) => {
  while (G.deck.length > 0 && G.players[ctx.currentPlayer].hand.length < GET_HAND_SIZE(G, ctx)) {
    DrawCard(G, ctx);
  }
}

const PlayCard = (G, ctx, card, pile) => {
  const cardIndex = G.players[ctx.currentPlayer].hand.indexOf(+card);
  if (cardIndex < 0 || !CanPlayCard(G, ctx, card, pile)) {
    return INVALID_MOVE;
  }
  G.players[ctx.currentPlayer].hand.splice(cardIndex, 1);
  G.piles[PILES_MAP[pile]] = parseInt(card);

  // Track how many cards the current player has played this turn
  G.turnMovesMade = (G.turnMovesMade || 0) + 1;
}

export const CanPlayCard = (G, ctx, card, pile) => {
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
  if (!ctx.numPlayers) {
    throw Error("Should have at least one player");
  }
  if (ctx.numPlayers === 1) {
    return 1; // Single player always only needs to make 1 move
  }
  return G.deck.length > 0 ? 2 : 1; // Multiplayer: 2 moves when deck has cards, 1 when empty
}

const HasValidMoves = (G, ctx, player) => {
  const piles = Object.keys(PILES_MAP);
  for (const pile of piles) {
    if (player.hand.length === 0 || player.hand.some(card => CanPlayCard(G, ctx, card, pile))) {
      return true;
    }
  }
  return false;
}

const determineStartingPlayer = (G, ctx) => {
  const playerMetrics = ctx.playOrder.map(playerID => {
    const hand = G.players[playerID].hand;
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
}

const EndTurn = (G, ctx) => {
  // Check if the player has made the minimum required moves
  const minRequiredMoves = MinRequiredMoves(G, ctx);
  if (G.players[ctx.currentPlayer].hand.lengh > 0 && G.turnMovesMade < minRequiredMoves) {
    return INVALID_MOVE;
  }
  ctx.events?.endTurn();
}

// Use type assertion for the entire game object to handle type mismatches with boardgame.io
const TheGame = {
  name: "TheGame",
  minPlayers: 1,
  maxPlayers: 5,
  playerView: PlayerView.STRIP_SECRETS,
  setup: (ctx) => {
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
  },

  ai: {
    enumerate: (G, ctx) => {
      const moves: Move[] = [];
      const player = G.players[ctx.currentPlayer];
      
      // 1. Every PlayCard with simple scoring
      for (const card of player.hand) {
        for (const pile of [FIRST_UP, SECOND_UP, FIRST_DOWN, SECOND_DOWN]) {
          if (CanPlayCard(G, ctx, card, pile)) {
            // Simple scoring - let the MCTS algorithm figure out the best moves
            // based on the objectives
            moves.push({ 
              move: 'PlayCard', 
              args: [card, pile]
            });
          }
        }
      }

      // 2. EndTurn when allowed
      if (G.turnMovesMade >= MinRequiredMoves(G, ctx) || (player.hand.length === 0 && G.deck.length === 0)) {
        moves.push({ move: 'EndTurn' });
      }

      return moves;
    },

    // @ts-ignore - The 'objectives' property is used by boardgame.io but not in the type definitions
    objectives: (G, ctx) => {
      const totalCards =
        G.deck.length + Object.values(G.players).reduce((s: number, p: any) => s + p.hand.length, 0);
      
      // Calculate pile playability metrics
      const upPilePlayability = [
        100 - G.piles[0], // Cards playable on first up pile
        100 - G.piles[1]  // Cards playable on second up pile
      ];
      
      const downPilePlayability = [
        G.piles[2] - 1,  // Cards playable on first down pile
        G.piles[3] - 1   // Cards playable on second down pile
      ];
      
      // Calculate total playable cards across all piles
      const totalPlayableCards = upPilePlayability.reduce((a, b) => a + b, 0) + 
                                downPilePlayability.reduce((a, b) => a + b, 0);
      
      return {
        // Primary goal: minimize total cards remaining
        victory: {
          weight: 50_000, // Highest priority on winning
          checker: () => totalCards === 0,
        },
        // Reward maximizing playable cards
        maximizePlayability: {
          weight: 3000,
          checker: () => {
            // This objective is met when the total playable cards is high relative to cards remaining
            return totalPlayableCards >= Math.max(totalCards * 3.8, 98);
          }
        },
        
        // Reward having good pile spacing
        pileSpacing: {
          weight: 1500,
          checker: () => {
            // Good spacing means the piles of the same type are not too close together
            const upPileSpacing = Math.abs(G.piles[0] - G.piles[1]);
            const downPileSpacing = Math.abs(G.piles[2] - G.piles[3]);
            return (upPileSpacing >= 10 && downPileSpacing >= 10);
          }
        },

      };
    }
  } as any,

  endIf: (G, ctx) => {
    try {
      if (!ctx) {
        return null;
      }
      
      // Create a safe game result object with default values
      const createSafeGameResult = (won = false) => {
        return {
          won,
          players: G?.players || {},
          seed: G?.seed || 0,
          numPlayers: ctx?.numPlayers || 1,
          deckLength: G?.deck?.length || 0
        };
      };
      
      // Check for win condition - all cards played
      if (G?.deck && G.deck.length === 0 && G?.players && 
          Object.keys(G.players).every(x => 
            G.players[x] && G.players[x].hand && G.players[x].hand.length === 0)) {
        return createSafeGameResult(true);
      }

      // Check for loss conditions
      if (!G || !ctx.currentPlayer || !G.players || !G.players[ctx.currentPlayer]) {
        return null;
      }
      
      const minRequiredMoves = MinRequiredMoves(G, ctx);
      const movesMade = G.turnMovesMade || 0;
      const currentPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[ctx.currentPlayer]);

      if (!currentPlayerHasValidMoves && movesMade < minRequiredMoves) {
        return createSafeGameResult(false);
      } else if (!currentPlayerHasValidMoves && movesMade >= minRequiredMoves) {
        // Validate that the next player has valid moves, otherwise end the game
        if (!ctx.playOrder || ctx.playOrderPos === undefined) {
          return null;
        }
        
        const nextPlayer = ctx.playOrder[(ctx.playOrderPos + 1) % ctx.numPlayers];
        if (!G.players[nextPlayer]) {
          return null;
        }
        
        const nextPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[nextPlayer]);

        if (!nextPlayerHasValidMoves) {
          return createSafeGameResult(false);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error in endIf function:", error);
      return null;
    }
  },

  phases: {
    draw: {
      start: true,
      endIf: (G, ctx) => (G.deck.length <= DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx)),
      onBegin: (G, ctx) => {
        while (G.deck.length > DECK_SIZE - ctx.numPlayers * GET_HAND_SIZE(G, ctx)) {
          for (let i = 0; i < ctx.numPlayers; i++) {
            DrawCardForPlayer(G, ctx, ctx.playOrder[i]);
          }
        }
      },
      next: "determinePlayOrder"
    },
    determinePlayOrder: {
      turn: {
        onBegin: (G, ctx) => {
          const startingPlayerID = determineStartingPlayer(G, ctx);
          // Store the selected player ID in the game state
          G.startingPlayerID = startingPlayerID;
          ctx.events?.endTurn({ next: startingPlayerID });
        },
        onEnd: (G, ctx) => {
          ctx.events?.endPhase();
        }
      },
      next: "playCard"
    },
    playCard: {
      endIf: (G, ctx) => (G.deck.length === 0),
      moves: {
        PlayCard,
        EndTurn
      },
      turn: {
        minMoves: 1, // Set to 1 for all player counts, we'll enforce the 2-move minimum for multiplayer in the EndTurn move
        maxMoves: 7,
        onEnd: (G, ctx) => {
          Replenish(G, ctx);
        },
        onBegin: (G, ctx) => {
          G.turnMovesMade = 0;
          if (G.deck.length === 0 && G.players[ctx.currentPlayer].hand.length === 0) {
            G.turnMovesMade = 2;
            ctx.events?.endTurn();
          }
        },
        order: {
          // Custom turn order that starts with the selected player
          first: (G) => {
            return G.startingPlayerID ? parseInt(G.startingPlayerID) : 0;
          },
          next: (G, ctx) => {
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
          G.turnMovesMade = 0;
        },
        // Maintain the same turn order as in the playCard phase
        order: {
          first: (G) => {
            return G.startingPlayerID ? parseInt(G.startingPlayerID) : 0;
          },
          next: (G, ctx) => {
            return (ctx.playOrderPos + 1) % ctx.numPlayers;
          }
        }
      }
    }
  }
};

// Use a two-step type assertion to force TypeScript to accept our implementation
// First cast to unknown, then to Game to bypass type checking
export default TheGame as unknown as Game;
