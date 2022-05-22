import { INVALID_MOVE } from 'boardgame.io/core';

const DECK_SIZE = 98;
const HAND_SIZE = 7;

const DrawCard = (G, ctx) => {
    const card = G.deck.pop();
    G.hands[ctx.currentPlayer].push(card);
}

const Replenish = (G, ctx) => {
    while (G.deck.length > 0 && G.hands[ctx.currentPlayer].length < HAND_SIZE) {
        DrawCard(G, ctx);
    }
}

const PlayCard = (G, ctx, card) => {
    const cardIndex = G.hands[ctx.currentPlayer].indexOf(card);
    if (cardIndex < 0) {
        return INVALID_MOVE;
    }
    G.hands[ctx.currentPlayer].splice(cardIndex, 1);
}



export const TheGame = {
    setup: (ctx) => ({
        deck: ctx.random.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2)),
        hands: Array(2).fill([])
    }),

    phases: {
        draw: {
            start: true,
            endIf: (G, ctx) => (G.deck.length <= DECK_SIZE - ctx.numPlayers * HAND_SIZE),
            onBegin: (G, ctx) => {
                while (G.deck.length > DECK_SIZE - ctx.playOrder.length * HAND_SIZE) {
                    for (let i = 0; i < ctx.numPlayers; i++) {
                        const card = G.deck.pop();
                        G.hands[ctx.playOrder[i]].push(card);
                    }
                }
            },
            next: "playCard"
        },
        playCard: {
            endIf: (G, ctx) => (G.deck.length === 0),
            moves: {
                PlayCard
            },
            turn: {
                minMoves: 2, maxMoves: 7,
                onEnd: (G, ctx) => {
                    Replenish(G, ctx)
                }
            },
            next: "playCardEmptyDeck"
        },
        playCardEmptyDeck: {
            moves: {
                PlayCard
            },
            turn: {
                minMoves: 1, maxMoves: 7
            }
        }
    }
};