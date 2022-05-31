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
    const currentPlayerName = props.matchData[playerID].name;
    const onEndTurn = () => {
        events.endTurn();
    }
    const onDragDrop = (e) => {
        e.preventDefault();
        const card = e.dataTransfer.getData("card");
        const pile = INDEX_TO_PILE_MAP[e.target.id];
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
        <h3 style={{ textAlign: "center" }}>Piles</h3>
        <div style={pilesStyle}>{pilesElements}</div>
        <h2 style={{ textAlign: "center", color: "red" }}>{currentPlayerName}'s Turn</h2>
        <h3 style={{ textAlign: "center" }}>Your Hand</h3>
        <div style={pilesStyle}>{hand}</div>
        <button disabled={!isDraggable} onClick={onEndTurn}>End Turn</button>
    </div>)
};


export default TheGameBoard;