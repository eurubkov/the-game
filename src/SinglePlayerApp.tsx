import * as React from 'react';
import { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import CooperativeMCTSBot from './CooperativeMCTSBot';
import TheGame from './TheGame';
import LocalBoard from './LocalBoard';
import { Button, Form, InputNumber, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './App.css';

// Create a client for single-player mode
const createSinglePlayerClient = (numPlayers: number, numBots: number, customSeed?: number) => {
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

  // Configure game with optional custom seed
  const gameConfig = customSeed !== undefined
    ? { ...TheGame, seed: customSeed }
    : TheGame;

  return Client({
    game: gameConfig,
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
  const [useCustomSeed, setUseCustomSeed] = useState(false);
  const [customSeed, setCustomSeed] = useState<number | null>(null);

  // Calculate number of bots (total players minus the human player)
  const numBots = totalPlayers - 1;

  const handleStartGame = () => {
    const Client = createSinglePlayerClient(
      totalPlayers, 
      numBots, 
      useCustomSeed && customSeed !== null ? customSeed : undefined
    );
    setGameClient(() => Client);
    setGameStarted(true);
  };

  const handleBackToSetup = () => {
    // First set gameStarted to false to hide the component
    setGameStarted(false);
    // Use setTimeout to ensure component is fully unmounted before setting GameClient to null
    setTimeout(() => {
      try {
        setGameClient(null);
      } catch (error) {
        console.error("Error cleaning up game client:", error);
      }
    }, 100); // Slightly longer timeout to ensure proper cleanup
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
              `${numBots} ${numBots === 1 ? 'bot' : 'bots'} will play with you`
            }
          </div>
        </Form.Item>
        
        <Form.Item 
          label={
            <span>
              Use Custom Seed 
              <Tooltip title="Using a custom seed allows you to replay the same game configuration. Games with the same seed and player count will have the same card distribution.">
                <QuestionCircleOutlined style={{ marginLeft: 8 }} />
              </Tooltip>
            </span>
          }
        >
          <Switch 
            checked={useCustomSeed} 
            onChange={(checked) => setUseCustomSeed(checked)} 
          />
        </Form.Item>
        
        {useCustomSeed && (
          <Form.Item label="Seed Value">
            <InputNumber 
              min={1} 
              max={9999999} 
              value={customSeed} 
              onChange={(value) => setCustomSeed(value as number)} 
              style={{ width: '100%' }}
              placeholder="Enter a number to use as seed"
            />
            <div style={{ padding: '8px 0', color: '#666', fontSize: '0.9em' }}>
              Share this seed with friends to compare your performance on the same game!
            </div>
          </Form.Item>
        )}
        
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleStartGame}
            disabled={useCustomSeed && customSeed === null}
          >
            Start Game
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SinglePlayerApp;
