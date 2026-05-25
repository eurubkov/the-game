import CooperativeMCTSBot, {
  BuildRequiredTurnPlan,
  GetCooperativeBotStrategy,
  PickCooperativeBotAction,
  ScoreBotMove
} from './CooperativeMCTSBot';
import { InitializeGame } from 'boardgame.io/internal';
import { Simulate } from 'boardgame.io/ai';
import TheGame, { FIRST_DOWN, FIRST_UP, SECOND_UP } from './TheGame';

const createPlayers = (hands = {}) => {
  return ['0', '1', '2', '3', '4'].reduce((players, playerID) => {
    players[playerID] = { hand: hands[playerID] || [] };
    return players;
  }, {});
};

const createG = (overrides = {}) => ({
  deck: [50],
  piles: [20, 40, 80, 60],
  players: createPlayers({ '0': [10, 21, 90] }),
  turnMovesMade: 0,
  ...overrides,
  players: overrides.players || createPlayers({ '0': [10, 21, 90] })
});

const createCtx = (overrides = {}) => ({
  numPlayers: 1,
  currentPlayer: '0',
  playOrder: ['0'],
  playOrderPos: 0,
  phase: 'playCard',
  ...overrides
});

const makeMove = (type, args) => ({
  type: 'MAKE_MOVE',
  payload: { type, args, playerID: '0' }
});

describe('Cooperative bot move scoring', () => {
  test('scores backwards-by-10 jumps above ordinary low-damage plays', () => {
    const G = createG({ piles: [20, 40, 80, 60] });
    const backwardUp = makeMove('PlayCard', [10, FIRST_UP]);
    const smallUp = makeMove('PlayCard', [21, FIRST_UP]);
    const backwardDown = makeMove('PlayCard', [90, FIRST_DOWN]);

    expect(ScoreBotMove(G, backwardUp)).toBeGreaterThan(ScoreBotMove(G, smallUp));
    expect(ScoreBotMove(G, backwardDown)).toBeGreaterThan(ScoreBotMove(G, smallUp));
  });

  test('prefers the lowest-damage pile for ordinary plays', () => {
    const G = createG({ piles: [20, 40, 80, 60] });
    const highDamage = makeMove('PlayCard', [45, FIRST_UP]);
    const lowDamage = makeMove('PlayCard', [45, SECOND_UP]);

    expect(ScoreBotMove(G, lowDamage)).toBeGreaterThan(ScoreBotMove(G, highDamage));
  });
});

describe('Cooperative bot action selection', () => {
  test('selects explicit strategies by player count', () => {
    expect(GetCooperativeBotStrategy(createCtx({ numPlayers: 1 }))).toMatchObject({
      name: 'solo-fast-policy-rollout',
      useFastSearch: true,
      useTurnSequenceSearch: false
    });
    expect(GetCooperativeBotStrategy(createCtx({ numPlayers: 2 }))).toMatchObject({
      name: 'two-player-sequence-search',
      useFastSearch: false,
      useTurnSequenceSearch: true
    });
    expect(GetCooperativeBotStrategy(createCtx({ numPlayers: 3 }))).toMatchObject({
      name: 'three-player-reducer-rollout',
      useFastSearch: false,
      useTurnSequenceSearch: false
    });
    expect(GetCooperativeBotStrategy(createCtx({ numPlayers: 5 }))).toMatchObject({
      name: 'large-game-fast-turn-search',
      useFastSearch: true,
      useTurnSequenceSearch: false
    });
  });

  test('plans the required sequence instead of taking the lowest immediate damage first', () => {
    const G = createG({
      deck: [50],
      piles: [20, 99, 80, 2],
      players: createPlayers({ '0': [35, 45] }),
      turnMovesMade: 0
    });
    const ctx = createCtx();
    const setupJump = makeMove('PlayCard', [45, FIRST_UP]);
    const greedyPlay = makeMove('PlayCard', [35, FIRST_UP]);

    expect(BuildRequiredTurnPlan(G, ctx, '0')).toEqual([
      { card: 45, pile: FIRST_UP },
      { card: 35, pile: FIRST_UP }
    ]);
    expect(PickCooperativeBotAction(G, ctx, [greedyPlay, setupJump], '0')).toBe(setupJump);
  });

  test('plays the best card before the required turn minimum is met', () => {
    const G = createG({ turnMovesMade: 0, deck: [50] });
    const ctx = createCtx();
    const actions = [
      makeMove('PlayCard', [21, FIRST_UP]),
      makeMove('PlayCard', [10, FIRST_UP])
    ];

    expect(PickCooperativeBotAction(G, ctx, actions)).toBe(actions[1]);
  });

  test('ends the turn after the minimum when only risky extra plays remain and deck has cards', () => {
    const G = createG({
      deck: [50],
      piles: [20, 40, 80, 60],
      turnMovesMade: 2
    });
    const ctx = createCtx();
    const endTurn = makeMove('EndTurn');
    const riskyPlay = makeMove('PlayCard', [70, FIRST_UP]);

    expect(PickCooperativeBotAction(G, ctx, [riskyPlay, endTurn])).toBe(endTurn);
  });

  test('uses a more conservative extra-play threshold for solo, three-player, and large games', () => {
    const G = createG({
      deck: [50],
      piles: [20, 40, 80, 60],
      players: createPlayers({ '0': [24] }),
      turnMovesMade: 2
    });
    const endTurn = makeMove('EndTurn');
    const fourDamagePlay = makeMove('PlayCard', [24, FIRST_UP]);

    expect(PickCooperativeBotAction(G, createCtx({ numPlayers: 1 }), [fourDamagePlay, endTurn])).toBe(endTurn);
    expect(PickCooperativeBotAction(G, createCtx({ numPlayers: 2 }), [fourDamagePlay, endTurn])).toBe(fourDamagePlay);
    expect(PickCooperativeBotAction(G, createCtx({ numPlayers: 3 }), [fourDamagePlay, endTurn])).toBe(endTurn);
    expect(PickCooperativeBotAction(G, createCtx({ numPlayers: 5 }), [fourDamagePlay, endTurn])).toBe(endTurn);
  });

  test('takes a backwards jump after the minimum even while deck has cards', () => {
    const G = createG({
      deck: [50],
      piles: [20, 40, 80, 60],
      turnMovesMade: 2
    });
    const ctx = createCtx();
    const endTurn = makeMove('EndTurn');
    const backwardJump = makeMove('PlayCard', [10, FIRST_UP]);

    expect(PickCooperativeBotAction(G, ctx, [endTurn, backwardJump])).toBe(backwardJump);
  });

  test('keeps playing after the deck is empty while playable cards remain', () => {
    const G = createG({
      deck: [],
      turnMovesMade: 1
    });
    const ctx = createCtx();
    const endTurn = makeMove('EndTurn');
    const play = makeMove('PlayCard', [21, FIRST_UP]);

    expect(PickCooperativeBotAction(G, ctx, [endTurn, play])).toBe(play);
  });

  test('uses the real ai enumerate output and returns a legal action', async () => {
    const G = createG({
      deck: [50],
      piles: [20, 40, 80, 60],
      players: createPlayers({ '0': [10, 21, 90] }),
      turnMovesMade: 0
    });
    const ctx = createCtx();
    const bot = new CooperativeMCTSBot({
      game: TheGame,
      enumerate: TheGame.ai.enumerate,
      seed: 'test'
    });

    const { action } = await bot.play({ G, ctx }, '0');

    expect(action).toMatchObject({
      type: 'MAKE_MOVE',
      payload: {
        type: 'PlayCard',
        args: [10, FIRST_UP]
      }
    });
  });

  test('uses broad fast turn search to win a seeded five-bot game', async () => {
    const game = { ...TheGame, seed: '11' };
    const state = InitializeGame({ game, numPlayers: 5 });
    const bot = new CooperativeMCTSBot({
      game,
      enumerate: game.ai.enumerate,
      seed: '11'
    });

    const result = await Simulate({ game, bots: bot, state, depth: 300 });
    const remainingCards = result.state.G.deck.length + Object.values(result.state.G.players).reduce(
      (sum, player) => sum + player.hand.length,
      0
    );

    expect(result.state.ctx.gameover?.won).toBe(true);
    expect(remainingCards).toBe(0);
  });

  test('uses deterministic rollout search early enough to avoid the seeded two-bot collapse', async () => {
    const game = { ...TheGame, seed: '13' };
    const state = InitializeGame({ game, numPlayers: 2 });
    const bot = new CooperativeMCTSBot({
      game,
      enumerate: game.ai.enumerate,
      seed: '13'
    });

    const result = await Simulate({ game, bots: bot, state, depth: 400 });
    const remainingCards = result.state.G.deck.length + Object.values(result.state.G.players).reduce(
      (sum, player) => sum + player.hand.length,
      0
    );

    expect(result.state.ctx.gameover).toBeDefined();
    expect(remainingCards).toBeLessThanOrEqual(10);
  });

  test('uses mid-turn sequence search to improve a seeded two-bot endgame', async () => {
    const game = { ...TheGame, seed: '18' };
    const state = InitializeGame({ game, numPlayers: 2 });
    const bot = new CooperativeMCTSBot({
      game,
      enumerate: game.ai.enumerate,
      seed: '18'
    });

    const result = await Simulate({ game, bots: bot, state, depth: 400 });
    const remainingCards = result.state.G.deck.length + Object.values(result.state.G.players).reduce(
      (sum, player) => sum + player.hand.length,
      0
    );

    expect(result.state.ctx.gameover).toBeDefined();
    expect(remainingCards).toBeLessThanOrEqual(1);
  });

  test('uses the fast solo solver to avoid the seeded solo collapse', async () => {
    const game = { ...TheGame, seed: '13' };
    const state = InitializeGame({ game, numPlayers: 1 });
    const bot = new CooperativeMCTSBot({
      game,
      enumerate: game.ai.enumerate,
      seed: '13'
    });

    const result = await Simulate({ game, bots: bot, state, depth: 400 });
    const remainingCards = result.state.G.deck.length + Object.values(result.state.G.players).reduce(
      (sum, player) => sum + player.hand.length,
      0
    );

    expect(result.state.ctx.gameover).toBeDefined();
    expect(remainingCards).toBeLessThanOrEqual(11);
  });
});
