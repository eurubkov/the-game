import React from "react";
import { CanPlayCard } from "./Game.js";

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



const TheGameBoard = ({ ctx, G, moves, events, playerID }) => {
    const onEndTurn = () => {
        events.endTurn();
    }
    const onDragDrop = (e) => {
        const card = e.dataTransfer.getData("card");
        const pile = INDEX_TO_PILE_MAP[e.target.id];
        e.preventDefault();
        if (CanPlayCard(G, ctx, card, pile) === false) {
            alert("Invalid move!");
        } else {
            moves.PlayCard(e.dataTransfer.getData("card"), INDEX_TO_PILE_MAP[e.target.id]);
        }
    }
    const onDragCard = (e) => {
        e.dataTransfer.setData("card", e.target.innerHTML);
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
    for (let i = 0; i < G.piles.length; i++) {
        pilesElements.push((<div id={i} onDrop={(e) => onDragDrop(e)} onDragOver={allowDropCard} key={i} style={pileStyle}>{G.piles[i]}</div>));
    }

    let hand = [];
    for (let i = 0; i < G.players[playerID].hand.length; i++) {
        hand.push((<div onDragStart={onDragCard} draggable="true" key={i} style={pileStyle}>{G.players[playerID].hand[i]}</div>))
    }
    return (<div>
        <h3>Piles</h3>
        <div style={pilesStyle}>{pilesElements}</div>
        <h3>Hand</h3>
        <div style={pilesStyle}>{hand}</div>
        <button onClick={onEndTurn}>End Turn</button>
    </div>)
};


export default TheGameBoard;