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
  G.turnMovesMade++;
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
  if (G.turnMovesMade < minRequiredMoves) {
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
    },

    // @ts-ignore - The 'objectives' property is used by boardgame.io but not in the type definitions
    objectives: (G, ctx) => {
      return {
        // Primary goal: minimize total cards remaining
        minimizeCards: {
          weight: 1000,
          checker: (G, ctx) => {
            const totalCards = G.deck.length +
              Object.values(G.players).reduce((sum, p: any) => sum + p.hand.length, 0);

            // Reward states with fewer cards
            return totalCards === 0;
          }
        } as any,

        // Reward balanced pile progression
        balancedPiles: {
          weight: 70,
          checker: (G, ctx) => {
            // Calculate how much "room" each pile has left
            const upRoom1 = 100 - G.piles[0];
            const upRoom2 = 100 - G.piles[1];
            const downRoom1 = G.piles[2] - 1;
            const downRoom2 = G.piles[3] - 1;


            // Reward states where at least 2 piles have decent room
            const pileRooms = [upRoom1, upRoom2, downRoom1, downRoom2];
            const decentRooms = pileRooms.filter(room => room >= G.deck.length - 2);
            return decentRooms.length >= 2;
          }
        }
      };
    }
  } as any,

  endIf: (G, ctx) => {
    if (G.deck && G.deck.length === 0 && G.players && Object.keys(G.players).every(x => G.players[x] && G.players[x].hand && G.players[x].hand.length === 0)) {
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
      const nextPlayer = ctx.playOrder[(ctx.playOrderPos + 1) % ctx.numPlayers];
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

export function isTenJump(G, [card, pile]) {
  const pileVal = G.piles[PILES_MAP[pile]];
  return (UP_PILES.includes(pile) && pileVal - card === 10) ||
    (DOWN_PILES.includes(pile) && card - pileVal === 10);
}

// Use a two-step type assertion to force TypeScript to accept our implementation
// First cast to unknown, then to Game to bypass type checking
export default TheGame as unknown as Game;
