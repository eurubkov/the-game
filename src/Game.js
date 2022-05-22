import { INVALID_MOVE } from 'boardgame.io/core';

const DECK_SIZE = 98;
const HAND_SIZE = 7;

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
    const card = G.deck.pop();
    G.hands[ctx.currentPlayer].push(card);
}

const Replenish = (G, ctx) => {
    while (G.deck.length > 0 && G.hands[ctx.currentPlayer].length < HAND_SIZE) {
        DrawCard(G, ctx);
    }
}

const PlayCard = (G, ctx, card, pile) => {
    const cardIndex = G.hands[ctx.currentPlayer].indexOf(card);
    if (cardIndex < 0 || !CanPlayCard(G, ctx, card, pile)) {
        return INVALID_MOVE;
    }
    G.hands[ctx.currentPlayer].splice(cardIndex, 1);
    G.piles[PILES_MAP[pile]] = card;
}

const CanPlayCard = (G, ctx, card, pile) => {
    console.log(card)
    console.log(pile)
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



export const TheGame = {
    setup: (ctx) => ({
        deck: ctx.random.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2)),
        hands: Array(2).fill([]),
        piles: [1, 1, 100, 100]
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