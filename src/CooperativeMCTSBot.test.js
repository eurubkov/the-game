const mockMCTSBotConstructor = jest.fn();

jest.mock('boardgame.io/ai', () => ({
  MCTSBot: class {
    constructor(opts) {
      mockMCTSBotConstructor(opts);
    }
  }
}));

const CooperativeMCTSBot = require('./CooperativeMCTSBot').default;

beforeEach(() => {
  mockMCTSBotConstructor.mockClear();
});

test('uses the original MCTS bot settings and game AI objectives', () => {
  const game = {
    ai: {
      enumerate: jest.fn(),
      objectives: jest.fn()
    }
  };

  new CooperativeMCTSBot({
    game,
    seed: 123
  });

  expect(mockMCTSBotConstructor).toHaveBeenCalledWith({
    game,
    seed: 123,
    enumerate: game.ai.enumerate,
    objectives: game.ai.objectives,
    iterations: 15000,
    playoutDepth: 100
  });
});
