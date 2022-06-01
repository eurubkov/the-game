import React from "react";
import { CanPlayCard } from "./Game.js";
import Card from "./Card.js";
import { DragDropContainer, DropTarget } from 'react-drag-drop-container';

const pilesStyle = {
    justifyContent: "center",
    display: "flex",
    flexWrap: "wrap",
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
    const currentPlayerName = props.matchData[ctx.currentPlayer].name;
    const onEndTurn = () => {
        events.endTurn();
    }
    const onDragDrop = (e) => {
        e.preventDefault();
        const card = e.dragData;
        const pile = INDEX_TO_PILE_MAP[e.target.id];
        if (CanPlayCard(G, ctx, card, pile) === false) {
            alert("Invalid move!");
        } else {
            moves.PlayCard(card, pile);
        }
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
            (<div key={i} style={directionStyle}>{direction}<DropTarget targetKey="pile" onHit={(e) => onDragDrop(e)} ><Card value={G.piles[i]} id={i} key={i} style={pileStyle} /></DropTarget></div>)
        );
    }
    const isDraggable = ctx.currentPlayer === playerID;
    let hand = [];
    for (let i = 0; i < G.players[playerID].hand.length; i++) {
        const handValue = G.players[playerID].hand[i];
        hand.push((
            <DragDropContainer targetKey="pile" dragData={handValue}><Card value={handValue} key={i} style={pileStyle} /></DragDropContainer>))
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