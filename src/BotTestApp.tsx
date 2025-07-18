import * as React from 'react';
import { useState, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import CooperativeMCTSBot from './CooperativeMCTSBot';
import TheGame from './TheGame';
import LocalBoard from './LocalBoard';
import { Button, Form, InputNumber, Switch, Tooltip, Card, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './App.css';
import './BotTest.css';

const { Title, Text } = Typography;

// Create a client for bot-only mode
const createBotOnlyClient = (numBots: number, customSeed?: number) => {
  // Create an object of bot factories for all players
  const botFactories = {};
  
  // Add bots for all player slots
  for (let i = 0; i < numBots; i++) {
    console.log(`Adding bot for player ${i}`);
    botFactories[i] = CooperativeMCTSBot;
  }

  console.log(`Creating game with ${numBots} bots`);
  console.log('Bot factories:', Object.keys(botFactories));

  // Configure game with optional custom seed
  const gameConfig = customSeed !== undefined
    ? { ...TheGame, seed: customSeed }
    : TheGame;

  return Client({
    game: gameConfig,
    board: LocalBoard,
    numPlayers: numBots,
    multiplayer: Local({
      bots: botFactories
    }),
    debug: false,
  });
};

// Component to display game results
const GameResult = ({ result, onNewGame }) => {
  // Calculate total cards left (deck + all players' hands)
  const calculateTotalCardsLeft = () => {
    let totalCards = result.deckLength || 0;
    
    // Add cards from all players' hands
    if (result.players) {
      Object.values(result.players).forEach((player: any) => {
        if (player && player.hand) {
          totalCards += player.hand.length;
        }
      });
    }
    
    return totalCards;
  };
  
  const totalCardsLeft = calculateTotalCardsLeft();
  
  return (
    <Card className="game-result-card">
      <Title level={3}>Game {result.won ? 'Won!' : 'Lost'}</Title>
      <div className="game-result-details">
        <Text>Number of Bots: {result.numPlayers}</Text>
        <Text>Seed: {result.seed}</Text>
        <Text>Cards Left in Deck: {result.deckLength}</Text>
        <Text strong>Total Cards Left: {totalCardsLeft}</Text>
      </div>
      <Button type="primary" onClick={onNewGame} style={{ marginTop: '20px' }}>
        Start New Game
      </Button>
    </Card>
  );
};

const BotTestApp: React.FC = () => {
  // State for game configuration
  const [numBots, setNumBots] = useState(2);
  const [gameStarted, setGameStarted] = useState(false);
  const [GameClient, setGameClient] = useState<React.ComponentType<any> | null>(null);
  const [useCustomSeed, setUseCustomSeed] = useState(false);
  const [customSeed, setCustomSeed] = useState<number | null>(null);
  // Always auto-play in bot test mode
  const [gameResult, setGameResult] = useState<any>(null);
  const [gameKey, setGameKey] = useState(0); // Used to force remount of game component

  // Function to start a new game
  const handleStartGame = () => {
    try {
      const Client = createBotOnlyClient(
        numBots, 
        useCustomSeed && customSeed !== null ? customSeed : undefined
      );
      setGameClient(() => Client);
      setGameStarted(true);
      setGameResult(null);
      setGameKey(prevKey => prevKey + 1);
    } catch (error) {
      console.error("Error starting game:", error);
      // Reset state in case of error
      setGameStarted(false);
      setGameClient(null);
    }
  };

  // Function to handle back to setup
  const handleBackToSetup = () => {
    setGameStarted(false);
    setTimeout(() => {
      setGameClient(null);
    }, 0);
  };

  // Function to handle game over
  const handleGameOver = (result) => {
    setGameResult(result);
  };

  // Auto-play effect - runs at a fixed rate
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (gameStarted && !gameResult) {
      // Use a safer approach to trigger bot moves
      // Instead of manipulating the DOM directly, we'll use a state update
      intervalId = setInterval(() => {
        // Force a re-render by updating a counter in state
        setGameKey(prevKey => prevKey + 1);
      }, 1000); // Slower rate to avoid potential race conditions
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gameStarted, gameResult]);

  // If game is over, show results
  if (gameResult) {
    return (
      <div className="bot-test-container">
        <Button 
          onClick={handleBackToSetup} 
          style={{ margin: '10px' }}
        >
          Back to Setup
        </Button>
        <GameResult result={gameResult} onNewGame={handleStartGame} />
      </div>
    );
  }

  // If game is started, show game board with auto-play controls
  if (gameStarted && GameClient) {
    return (
      <div className="bot-test-container">
        <div className="bot-test-controls">
          <Button 
            onClick={handleBackToSetup} 
            style={{ margin: '10px' }}
          >
            Back to Setup
          </Button>
        </div>
        {/* Wrap GameClient in a try-catch to handle potential errors */}
        <div className="game-client-wrapper">
          <GameClient 
            key={gameKey} 
            playerID="observer" 
            onGameOver={(result) => {
              // Only call handleGameOver if result is not null
              // Use setTimeout to ensure this happens after the current execution context
              // This helps prevent Socket.IO related errors
              if (result) {
                setTimeout(() => {
                  try {
                    handleGameOver(result);
                  } catch (error) {
                    console.error("Error in handleGameOver:", error);
                  }
                }, 0);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Setup screen
  return (
    <div className="bot-test-setup">
      <h1>The Game - Bot Test Mode</h1>
      <p className="setup-description">
        In this mode, only bots will play the game. You can observe how they perform with different settings.
      </p>
      <Form layout="vertical" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Form.Item label="Number of Bots">
          <InputNumber 
            min={1} 
            max={5} 
            value={numBots} 
            onChange={(value) => {
              const newValue = value as number;
              setNumBots(newValue);
            }} 
          />
          <div style={{ padding: '8px 0', color: '#666' }}>
            {numBots} {numBots === 1 ? 'bot' : 'bots'} will play the game
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
              Use the same seed to test different bot configurations on identical games
            </div>
          </Form.Item>
        )}
        
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleStartGame}
            disabled={useCustomSeed && customSeed === null}
          >
            Start Bot Game
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default BotTestApp;
