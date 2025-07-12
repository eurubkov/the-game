import { Game } from 'boardgame.io';
import { INVALID_MOVE, PlayerView } from 'boardgame.io/core';

interface Move {
    move: string;
    args?: [number, string];
    score: number;
}

// Interface for game metadata
export interface GameMetadata {
  seed: number;
  numPlayers: number;
}

const DECK_SIZE = 98;
const GET_HAND_SIZE = (G, ctx) => ctx.numPlayers === 2 ? 7 : 6;

const FIRST_UP = "first_up";
const SECOND_UP = "second_up";
const FIRST_DOWN = "first_down";
const SECOND_DOWN = "second_down";

const UP_PILES = [FIRST_UP, SECOND_UP];
const DOWN_PILES = [FIRST_DOWN, SECOND_DOWN];

const PILES_MAP = {
    [FIRST_UP]: 0,
    [SECOND_UP]: 1,
    [FIRST_DOWN]: 2,
    [SECOND_DOWN]: 3
}


const DrawCard = (G, ctx) => {
    DrawCardForPlayer(G, ctx, ctx.currentPlayer);
}

const DrawCardForPlayer = (G, ctx, playerID) => {
    G.deck = ctx.random.Shuffle(G.deck);
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

export const MinRequiredMoves = (G) => {
    return G.deck.length > 0 ? 2 : 1;
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

const evaluateMove = (G, ctx, move) => {
    const cardValue = move.args[0];
    const pile = move.args[1];
    let score = Infinity;

    const pileValue = G.piles[PILES_MAP[pile]];

    if (UP_PILES.includes(pile)) {
        if (G.piles[PILES_MAP[pile]] - cardValue === 10) {
            score = -1;
        } else {
            score = cardValue - pileValue;
        }
    } else {
        if (cardValue - G.piles[PILES_MAP[pile]] === 10) {
            score = -1;
        } else {
            score = pileValue - cardValue;
        }
    }

    return score;
}

const determineStartingPlayer = (G, ctx) => {
    const playerMetrics = ctx.playOrder.map(playerID => {
        const hand = G.players[playerID].hand;
        const sortedHand = [...hand].sort((a, b) => a - b);
    
        const lowestTwo = sortedHand[0] + sortedHand[1];
        const highestTwoAbs = Math.abs(200 - sortedHand[sortedHand.length - 1] - sortedHand[sortedHand.length - 2]);
        const lowestAndHighest = sortedHand[0] + Math.abs(100 - sortedHand[sortedHand.length - 1]);
    
        const metric = Math.min(lowestTwo, highestTwoAbs, lowestAndHighest);
        return { playerID, metric };
      });
    
      // Sort the players based on metric
      playerMetrics.sort((a, b) => a.metric - b.metric);
    
      // Return the player with the smallest metric
      return playerMetrics[0].playerID;
}

const EndTurn = (G, ctx) => {
    ctx.events.endTurn();
}

// Use type assertion for the entire game object to handle type mismatches with boardgame.io
const TheGame = {
    name: "TheGame",
    minPlayers: 2,
    maxPlayers: 5,
    playerView: PlayerView.STRIP_SECRETS,
    setup: (ctx) => ({
        deck: ctx.random.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2)),
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
    }),

    ai: {
        enumerate: (G, ctx) => {
          let moves: Move[] = [];
          const thresholdScore = 5;
          let shouldEndTurn = true;
          
          for (let card of G.players[ctx.currentPlayer].hand) {
            for (let pile of Object.keys(PILES_MAP)) {
              if (CanPlayCard(G, ctx, card, pile)) {
                const score = evaluateMove(G, ctx, { move: "PlayCard", args: [card, pile] });
                if (score < thresholdScore || G.turnMovesMade < MinRequiredMoves(G)) {
                  shouldEndTurn = false;
                }
                moves.push({
                  move: "PlayCard", args: [card, pile], score
                });
              }
            }
          }
      
          if (shouldEndTurn) {
            moves.push({
              move: "EndTurn", score: -20
            });
          }
      
          moves.sort((a, b) => a.score - b.score);
      
          // Just consider the move with the highest score
          return [moves[0]];
        }
      },

    endIf: (G, ctx) => {
        if (G.deck.length === 0 && Object.keys(G.players).every(x => G.players[x].hand.length === 0)) {
            return { won: true, players: G.players }
        }

        const minRequiredMoves = MinRequiredMoves(G);
        const movesMade = G.turnMovesMade;
        const currentPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[ctx.currentPlayer]);
        
        if (!currentPlayerHasValidMoves && movesMade < minRequiredMoves) {
            return { won: false, players: G.players }
        } else if (!currentPlayerHasValidMoves && movesMade >= minRequiredMoves) {
            // Validate that the next player has valid moves, otherwise end the game
            const nextPlayer = ctx.playOrder[(ctx.playOrderPos + 1) % ctx.numPlayers];
            const nextPlayerHasValidMoves = HasValidMoves(G, ctx, G.players[nextPlayer]);

            if (!nextPlayerHasValidMoves) {
                return { won: false, players: G.players }
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
                    ctx.events.endTurn({next: startingPlayerID});
                },
                onEnd: (G, ctx) => {
                    ctx.events.endPhase();
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
                minMoves: 2, maxMoves: 7,
                onEnd: (G, ctx) => {
                    Replenish(G, ctx);
                },
                onBegin: (G, ctx) => {
                    G.turnMovesMade = 0;
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
                }
            }
        }
    }
};

export default TheGame;
