import * as React from "react";
import { useState, useEffect } from "react";
import { Table, Button, Typography, Divider } from 'antd';
import './Leaderboard.css';

// Define the structure of a leaderboard entry
export interface LeaderboardEntry {
  id: string;
  timestamp: number;
  seed: number;
  numPlayers: number;
  remainingCards: number;
  won: boolean;
}

// Function to save an entry to the leaderboard
export const saveToLeaderboard = (entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>) => {
  // Get existing leaderboard
  const leaderboard = getLeaderboard();
  
  // Create a new entry with id and timestamp
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: Date.now().toString(),
    timestamp: Date.now()
  };
  
  // Add the new entry
  leaderboard.push(newEntry);
  
  // Save back to localStorage
  localStorage.setItem('theGame_leaderboard', JSON.stringify(leaderboard));
  
  return newEntry;
};

// Function to get the leaderboard from localStorage
export const getLeaderboard = (): LeaderboardEntry[] => {
  const leaderboardJson = localStorage.getItem('theGame_leaderboard');
  if (!leaderboardJson) {
    return [];
  }
  
  try {
    return JSON.parse(leaderboardJson);
  } catch (e) {
    console.error('Failed to parse leaderboard data', e);
    return [];
  }
};

// Function to clear the leaderboard
export const clearLeaderboard = () => {
  localStorage.removeItem('theGame_leaderboard');
};

// Calculate total cards in a game
export const calculateTotalRemainingCards = (
  deckLength: number, 
  players: Record<string, { hand: number[] }>
): number => {
  // Count cards in deck
  const cardsInDeck = deckLength;
  
  // Count cards in players' hands
  const cardsInHands = Object.values(players).reduce(
    (total, player) => total + player.hand.length, 
    0
  );
  
  // Return total
  return cardsInDeck + cardsInHands;
};

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load leaderboard data
    setLeaderboard(getLeaderboard());
    setLoading(false);
  }, []);
  
  const handleClearLeaderboard = () => {
    clearLeaderboard();
    setLeaderboard([]);
  };
  
  const columns = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => new Date(timestamp).toLocaleString(),
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => b.timestamp - a.timestamp,
      defaultSortOrder: 'descend' as 'descend',
    },
    {
      title: 'Seed',
      dataIndex: 'seed',
      key: 'seed',
    },
    {
      title: 'Players',
      dataIndex: 'numPlayers',
      key: 'numPlayers',
    },
    {
      title: 'Remaining Cards',
      dataIndex: 'remainingCards',
      key: 'remainingCards',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.remainingCards - b.remainingCards,
    },
    {
      title: 'Result',
      dataIndex: 'won',
      key: 'won',
      render: (won: boolean) => won ? 'Victory' : 'Defeat',
      filters: [
        { text: 'Victory', value: true },
        { text: 'Defeat', value: false },
      ],
      onFilter: (value: boolean, record: LeaderboardEntry) => record.won === value,
    },
  ];
  
  return (
    <div className="leaderboard-container">
      <Typography.Title level={2}>Leaderboard</Typography.Title>
      <Divider />
      
      <div className="leaderboard-description">
        <Typography.Paragraph>
          This leaderboard shows your game results, sorted by date. 
          The fewer remaining cards at the end of the game, the better your performance.
          Games with the same seed and player count can be compared directly.
        </Typography.Paragraph>
      </div>
      
      <Table 
        dataSource={leaderboard} 
        columns={columns} 
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      <div className="leaderboard-actions">
        <Button 
          danger 
          onClick={handleClearLeaderboard}
          disabled={leaderboard.length === 0}
        >
          Clear Leaderboard
        </Button>
      </div>
    </div>
  );
};

export default Leaderboard;
