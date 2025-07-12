import * as React from 'react';
import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { MCTSBot } from 'boardgame.io/ai';
import CooperativeMCTSBot from './CooperativeMCTSBot';
import TheGame from './TheGame';
import LocalBoard from './LocalBoard';
import { Button, Select, Form, InputNumber } from 'antd';
import './App.css';

// Create a client for single-player mode
const createSinglePlayerClient = (numPlayers: number, numBots: number) => {
  // Create an object of bot factories for the specified number of bots
  const botFactories = {};
  
  // Add bots to fill player slots
  // Player 0 is always the human player, so bots start at position 1
  for (let i = 1; i < numPlayers; i++) {
    console.log(`Adding bot for player ${i}`);
    // Use the CooperativeMCTSBot as requested
    botFactories[i] = CooperativeMCTSBot;
  }

  console.log(`Creating game with ${numPlayers} players (1 human + ${numPlayers - 1} bots)`);
  console.log('Bot factories:', Object.keys(botFactories));

  return Client({
    game: TheGame,
    board: LocalBoard,
    numPlayers,
    multiplayer: Local({
      bots: botFactories
    }),
    debug: false,
  });
};

const SinglePlayerApp: React.FC = () => {
  // Total players includes you (human) + bots
  const [totalPlayers, setTotalPlayers] = useState(2);
  const [gameStarted, setGameStarted] = useState(false);
  const [GameClient, setGameClient] = useState<React.ComponentType<any> | null>(null);

  // Calculate number of bots (total players minus the human player)
  const numBots = totalPlayers - 1;

  const handleStartGame = () => {
    const Client = createSinglePlayerClient(totalPlayers, numBots);
    setGameClient(() => Client);
    setGameStarted(true);
  };

  const handleBackToSetup = () => {
    setGameStarted(false);
    setGameClient(null);
  };

  if (gameStarted && GameClient) {
    return (
      <div className="single-player-container">
        <Button 
          onClick={handleBackToSetup} 
          style={{ margin: '10px' }}
        >
          Back to Setup
        </Button>
        <GameClient playerID="0" />
      </div>
    );
  }

  return (
    <div className="single-player-setup">
      <h1>The Game - Single Player Setup</h1>
      <Form layout="vertical" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Form.Item label="Total Players (you + bots)">
          <InputNumber 
            min={1} 
            max={5} 
            value={totalPlayers} 
            onChange={(value) => {
              const newValue = value as number;
              setTotalPlayers(newValue);
            }} 
          />
        </Form.Item>
        
        <Form.Item label="Number of Bots">
          <div style={{ padding: '8px 0', color: '#666' }}>
            {numBots <= 0 ? 
              "You will play alone (single-player mode)" : 
              `${numBots} ${numBots === 1 ? 'bot' : 'bots'} will play against you`
            }
          </div>
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" onClick={handleStartGame}>
            Start Game
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SinglePlayerApp;
