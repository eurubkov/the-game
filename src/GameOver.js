import React from "react";
import { AwesomeButton } from "react-awesome-button";
import "react-awesome-button/dist/styles.css";

const endgameOverlayStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
  };

const Button = ({ onPress, text, type = "primary" }) => {
return (
    <AwesomeButton
        type={type}
        ripple
        onPress={onPress}
    >
        {text}
    </AwesomeButton>
);
}

const GameOver = ({ gameover }) => {
    console.log(gameover);
    const restartGame = () => {
        window.location.href = '/';
    }
    const playAgainButton = <Button onPress={restartGame} text={"Play Again"} />;
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