import { INVALID_MOVE, PlayerView } from 'boardgame.io/core';

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
    DrawCardForPlayer(G, ctx, ctx.currentPlayer);
}

const DrawCardForPlayer = (G, ctx, playerID) => {
    G.deck = ctx.random.Shuffle(G.deck);
    const card = G.deck.pop();
    G.players[playerID].hand.push(card);
}

const Replenish = (G, ctx) => {
    while (G.deck.length > 0 && G.players[ctx.currentPlayer].hand.length < HAND_SIZE) {
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

const HasValidMoves = (G, ctx) => {
    const piles = Object.keys(PILES_MAP);
    for (const pile of piles) {
        if (G.players[ctx.currentPlayer].hand.length === 0 || G.players[ctx.currentPlayer].hand.some(card => CanPlayCard(G, ctx, card, pile))) {
            return true;
        }
    }
    return false;

}


export const TheGame = {
    name: "TheGame",
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
            }
        }
    }),

    ai: {
        enumerate: (G, ctx) => {
            let moves = [];
            for (let card of G.players[ctx.currentPlayer].hand) {
                for (let pile of Object.keys(PILES_MAP)) {
                    if (CanPlayCard(G, ctx, card, pile)) {
                        moves.push({
                            move: "PlayCard", args: [card, pile]
                        })
                    }
                }
            }
            return moves;
        }
    },

    endIf: (G, ctx) => {
        if (G.deck.length === 0 && Object.keys(G.players).every(x => x.hand.length === 0)) {
            return { won: true }
        }

        if (!HasValidMoves(G, ctx)) {
            return { won: false }
        }


    },

    phases: {
        draw: {
            start: true,
            endIf: (G, ctx) => (G.deck.length <= DECK_SIZE - ctx.numPlayers * HAND_SIZE),
            onBegin: (G, ctx) => {
                while (G.deck.length > DECK_SIZE - ctx.numPlayers * HAND_SIZE) {
                    for (let i = 0; i < ctx.numPlayers; i++) {
                        DrawCardForPlayer(G, ctx, ctx.playOrder[i]);
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