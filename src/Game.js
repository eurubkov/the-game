const DrawCard = (G, ctx) => {
    const card = G.deck.pop();
    G.hands[ctx.currentPlayer].push(card);
}

const DECK_SIZE = 98;
const HAND_SIZE = 7;

export const TheGame = {
    setup: (ctx) => ({
        deck: ctx.random.Shuffle(Array.from({ length: DECK_SIZE }, (v, i) => i + 2)),
        hands: Array(2).fill([])
    }),

    phases: {
        draw: {
            moves: { DrawCard },
            start: true,
            endIf: (G, ctx) => (G.deck.length <= DECK_SIZE - ctx.numPlayers * HAND_SIZE),
            onBegin: (G, ctx) => {
                while (G.deck.length > DECK_SIZE - ctx.playOrder.length * HAND_SIZE) {
                    for (let i = 0; i < ctx.numPlayers; i++) {
                        const card = G.deck.pop();
                        G.hands[ctx.playOrder[i]].push(card);
                    }
                }
            }
        }
    }
};