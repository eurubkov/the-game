import React, { useEffect, useState, useReducer } from "react";

const pilesStyle = {
    justifyContent: "flex-start",
    display: "flex",
}
const pileStyle = {
    border: '1px solid #555',
    width: '50px',
    height: '50px',
    lineHeight: '50px',
    textAlign: 'center',
};

const INDEX_TO_PILE_MAP = {
    0: "first_up",
    1: "second_up",
    2: "first_down",
    3: "second_down"
}



const TheGameBoard = ({ ctx, G, moves }) => {
    const [playerHand, setPlayerHand] = useState(G.hands[ctx.currentPlayer]);
    const [piles, setPiles] = useState(G.piles);

    const onDragDrop = (card, pile) => moves.PlayCard(card, pile);
    const dragCard = (e) => {
        e.dataTransfer.setData("card", e.target.innerHTML);
    }
    const dropCard = (e) => {
        e.preventDefault();
        const card = e.dataTransfer.getData("card");
        const pileIndex = e.target.id;
        onDragDrop(card, INDEX_TO_PILE_MAP[pileIndex]);
        const handIdx = playerHand.indexOf(+card);
        const handCopy = [...playerHand];
        handCopy.splice(handIdx, 1);
        setPlayerHand(handCopy);
        const pilesCopy = [...piles];
        pilesCopy[pileIndex] = parseInt(card);
        setPiles(pilesCopy);
    }
    const allowDropCard = (e) => {
        e.preventDefault();
    }

    if (ctx.gameover) {
        if (ctx.gameover.won) {
            return (<div>You Beat The Game!</div>);
        }
        else {
            return (<div>You Lost. Try Better Next Time!</div>);
        }
    }

    let pilesElements = [];
    for (let i = 0; i < piles.length; i++) {
        pilesElements.push((<div id={i} onDrop={dropCard} onDragOver={allowDropCard} key={i} style={pileStyle}>{piles[i]}</div>));
    }

    let hand = [];
    for (let i = 0; i < playerHand.length; i++) {
        hand.push((<div onDragStart={dragCard} draggable="true" key={i} style={pileStyle}>{playerHand[i]}</div>))
    }
    return (<div>
        <h3>Piles</h3>
        <div style={pilesStyle}>{pilesElements}</div>
        <h3>Hand</h3>
        <div style={pilesStyle}>{hand}</div>
    </div>)
};


export default TheGameBoard;