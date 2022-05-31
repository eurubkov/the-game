import React from "react";
import { CanPlayCard } from "./Game.js";
import Card from "./Card.js";

const pilesStyle = {
    justifyContent: "center",
    display: "flex",
}
const pileStyle = {
    border: '1px solid #555',
    width: '50px',
    height: '50px',
    lineHeight: '50px',
    textAlign: 'center'
};
const directionStyle = {
    textAlign: "center"
};

const INDEX_TO_PILE_MAP = {
    0: "first_up",
    1: "second_up",
    2: "first_down",
    3: "second_down"
}



const TheGameBoard = ({ ctx, G, moves, events, playerID, ...props }) => {
    console.log(G);
    const currentPlayerName = props.matchData[ctx.currentPlayer].name;
    const onEndTurn = () => {
        events.endTurn();
    }
    const onDragDrop = (e) => {
        e.preventDefault();
        const card = e.dataTransfer.getData("card").replace("<h1>", "").replace("</h1>", "");
        const pile = INDEX_TO_PILE_MAP[e.target.id];
        if (CanPlayCard(G, ctx, card, pile) === false) {
            alert("Invalid move!");
        } else {
            moves.PlayCard(card, pile);
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
            return (<h1>You Beat The Game!</h1>);
        }
        else {
            return (<h1>You Lost. Try Better Next Time!</h1>);
        }
    }

    let pilesElements = [];
    for (let i = 0; i < G.piles.length; i++) {
        let direction = i < 2 ? "UP" : "DOWN";
        pilesElements.push(
            (<div key={i} style={directionStyle}>{direction}<Card value={G.piles[i]} id={i} onDrop={(e) => onDragDrop(e)} onDragOver={allowDropCard} key={i} style={pileStyle} /></div>)
        );
    }
    const isDraggable = ctx.currentPlayer === playerID;
    let hand = [];
    for (let i = 0; i < G.players[playerID].hand.length; i++) {
        hand.push((<Card value={G.players[playerID].hand[i]} onDragStart={onDragCard} draggable={isDraggable} key={i} style={pileStyle} />))
    }
    return (<div>
        <Card value={G.deck.length} />
        <h3 style={{ textAlign: "center" }}>Piles</h3>
        <div style={pilesStyle}>{pilesElements}</div>
        <h2 style={{ textAlign: "center", color: "red" }}>{currentPlayerName}'s Turn</h2>
        <h3 style={{ textAlign: "center" }}>Your Hand</h3>
        <div style={pilesStyle}>{hand}</div>
        <button disabled={!isDraggable} onClick={onEndTurn}>End Turn</button>
        <button onClick={props.undo}>Undo</button>
    </div>)
};


export default TheGameBoard;