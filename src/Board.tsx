import * as React from "react";
import MinRequiredMoves, { CanPlayCard } from "./Game";
import Card from "./Card";
import GameOver from "./GameOver";
import { DragDropContainer, DropTarget } from 'react-drag-drop-container';
import { Button } from 'antd';

const pilesStyle: React.CSSProperties= {
    justifyContent: "center",
    display: "flex",
    flexWrap: "wrap",
}
const pileStyle: React.CSSProperties= {
    border: '1px solid #555',
    width: '50px',
    height: '50px',
    lineHeight: '50px',
    textAlign: 'center'
};
const directionStyle: React.CSSProperties= {
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

    let pilesElements: JSX.Element[] = [];
    for (let i = 0; i < G.piles.length; i++) {
        let direction = i < 2 ? "UP" : "DOWN";
        pilesElements.push(
            (<div key={i} style={directionStyle}>{direction}<DropTarget targetKey="pile" onHit={(e) => onDragDrop(e)} ><Card value={G.piles[i]} id={i} key={i} style={pileStyle} /></DropTarget></div>)
        );
    }
    const isDraggable = ctx.currentPlayer === playerID;
    let hand: JSX.Element[] = [];
    for (let i = 0; i < G.players[playerID].hand.length; i++) {
        const handValue = G.players[playerID].hand[i];
        hand.push((
            <DragDropContainer targetKey="pile" dragData={handValue}><Card id={handValue} value={handValue} key={i} style={pileStyle} /></DragDropContainer>))
    }

    return (<div>
        <div>
            <h6 style={{ textAlign: "left" }}>Remaining Cards in Deck</h6>
            <Card id={G.deck.length} value={G.deck.length} />
        </div>
        <h3 style={{ textAlign: "center" }}>Piles</h3>
        <div style={pilesStyle}>{pilesElements}</div>
        <h2 style={{ textAlign: "center", color: "red" }}>{currentPlayerName}'s Turn</h2>
        <h3 style={{ textAlign: "center" }}>Your Hand</h3>
        <div style={pilesStyle}>{hand}</div>
        {!ctx.gameover && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <Button 
            type="primary" 
            disabled={G.turnMovesMade < MinRequiredMoves(G) || !isDraggable} 
            onClick={onEndTurn}>
            End Turn
            </Button>
            <Button 
            onClick={props.undo} 
            type="default" 
            disabled={G.turnMovesMade === 0 || !isDraggable}>
            Undo
            </Button>
        </div>
        )}
        
    </div>)
};


export default TheGameBoard;