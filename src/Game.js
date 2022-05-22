const DrawCard = (G, ctx) => {
    const card = G.deck.pop();
    G.hands[ctx.currentPlayer].push(card);
}

export const TheGame = {
    setup: (ctx) => ({
        deck: ctx.random.Shuffle(Array.from({ length: 98 }, (v, i) => i + 2)),
        hands: Array(2).fill([])
    }),

    phases: {
        draw: {
            moves: { DrawCard },
            start: true,
            endIf: G => (G.deck.length <= 98 - 14),
            turn: { minMoves: 1, maxMoves: 1 }
        }
    }
};