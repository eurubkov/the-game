const {
  BuildRequiredTurnPlan,
  GetBotMoveDamage,
  GetCooperativeBotStrategy,
  PickCooperativeBotAction
} = require('./CooperativeMCTSBot');
const {
  FIRST_UP,
  SECOND_DOWN,
  SECOND_UP
} = require('./TheGame');

const makePlay = (card, pile) => ({
  type: 'MAKE_MOVE',
  payload: {
    type: 'PlayCard',
    args: [card, pile]
  }
});

const makeEndTurn = () => ({
  type: 'MAKE_MOVE',
  payload: {
    type: 'EndTurn'
  }
});

const makeContext = (overrides = {}) => ({
  currentPlayer: '0',
  numPlayers: 1,
  ...overrides
});

const makeGameState = (overrides = {}) => ({
  deck: [50],
  piles: [1, 1, 100, 100],
  players: {
    '0': {
      hand: []
    }
  },
  turnMovesMade: 0,
  ...overrides
});

test('uses beam search for multiplayer strategy variants', () => {
  expect(GetCooperativeBotStrategy({ numPlayers: 2 })).toMatchObject({
    name: 'two-player-beam-search',
    useFastSearch: true
  });
  expect(GetCooperativeBotStrategy({ numPlayers: 3 })).toMatchObject({
    name: 'three-player-beam-search',
    useFastSearch: true
  });
  expect(GetCooperativeBotStrategy({ numPlayers: 5 })).toMatchObject({
    name: 'large-game-fast-turn-search',
    useFastSearch: true
  });
});

test('scores backwards-by-10 plays as best moves on both pile directions', () => {
  const G = makeGameState({
    piles: [25, 1, 100, 75]
  });

  expect(GetBotMoveDamage(G, makePlay(15, FIRST_UP))).toBe(-1000);
  expect(GetBotMoveDamage(G, makePlay(85, SECOND_DOWN))).toBe(-1000);
  expect(GetBotMoveDamage(G, makePlay(30, FIRST_UP))).toBe(5);
});

test('builds required turn plan instead of choosing isolated greedy plays', () => {
  const G = makeGameState({
    piles: [20, 1, 100, 100],
    players: {
      '0': {
        hand: [10, 30]
      }
    }
  });
  const ctx = makeContext();

  expect(BuildRequiredTurnPlan(G, ctx)).toEqual([
    { card: 10, pile: FIRST_UP },
    { card: 30, pile: FIRST_UP }
  ]);
});

test('ends turn after meeting the minimum when extra play damage is too high', () => {
  const G = makeGameState({
    players: {
      '0': {
        hand: [90]
      }
    },
    turnMovesMade: 2
  });
  const ctx = makeContext();
  const endTurn = makeEndTurn();
  const action = PickCooperativeBotAction(G, ctx, [
    makePlay(90, SECOND_UP),
    endTurn
  ]);

  expect(action).toBe(endTurn);
});
