import { MCTSBot } from 'boardgame.io/ai';

/**
 * CooperativeMCTSBot - A bot for The Game using MCTS with custom objectives
 * 
 * This bot leverages the game's AI configuration to make strategic decisions
 * based on the objectives defined in TheGame.tsx
 */
class CooperativeMCTSBot extends MCTSBot {
  constructor(opts) {
    super({ ...opts, ...opts.game.ai, iterations: 50000, playoutDepth: 50 });
  }
}

export default CooperativeMCTSBot;
