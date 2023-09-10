import * as React from "react";
import { Button } from 'antd';

const endgameOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
  };

const GameOver = ({ gameover }) => {
    console.log(gameover);
    const restartGame = () => {
        window.location.href = '/';
    }
    const playAgainButton = <Button type="primary" onClick={restartGame}>Play Again</Button>;
    if (gameover) {
        if (gameover.won) {
            return (<div style={endgameOverlayStyle}>
            <h1>You Beat The Game!</h1>
            { playAgainButton }
          </div>);
        } else {
            return (<div style={endgameOverlayStyle}>
            <h1>You Lost. Try Better Next Time!</h1>
            { playAgainButton }
          </div>);
        }
    } else {
        return <></>
    }
};

export default GameOver;