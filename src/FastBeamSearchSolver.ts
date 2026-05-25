import {
  FIRST_DOWN,
  FIRST_UP,
  SECOND_DOWN,
  SECOND_UP
} from './TheGame';

const FAST_PILE_NAMES = [FIRST_UP, SECOND_UP, FIRST_DOWN, SECOND_DOWN];
const FAST_INITIAL_OPTION_LIMIT = 28;
const FAST_FUTURE_OPTION_LIMIT = 10;
const FAST_PLAY_CANDIDATE_LIMIT = 8;
const FAST_EXTRA_PLAYS = 3;
const FAST_EMPTY_DECK_PLAY_LIMIT = 8;
const FAST_BACKWARD_JUMP_SCORE = 1000;
const FAST_SEARCH_CONFIGS = {
  solo: {
    deckThreshold: 80,
    depth: 5,
    rootOptions: 28,
    futureOptions: 10,
    nodeLimit: 4_000
  },
  twoPlayer: {
    deckThreshold: 70,
    depth: 5,
    rootOptions: 24,
    futureOptions: 8,
    nodeLimit: 4_000
  },
  threePlayer: {
    deckThreshold: 65,
    depth: 4,
    rootOptions: 20,
    futureOptions: 7,
    nodeLimit: 3_000
  },
  largeGame: {
    deckThreshold: 55,
    depth: 4,
    rootOptions: 16,
    futureOptions: 6,
    nodeLimit: 2_500
  }
};

type FastMove = {
  type: 'PlayCard' | 'EndTurn';
  card?: number;
  pile?: string;
  pileIndex?: number;
  damage?: number;
};

type FastState = {
  deck: number[];
  piles: number[];
  hands: number[][];
  currentIndex: number;
  numPlayers: number;
  turnMovesMade: number;
  gameover?: { won: boolean };
};

type FastTurnOption = {
  firstMove: FastMove;
  moves: FastMove[];
  state: FastState;
  score: number;
};

type FastSearchConfig = {
  deckThreshold: number;
  depth: number;
  rootOptions: number;
  futureOptions: number;
  nodeLimit: number;
};

type FastSearchContext = {
  cache: Map<string, number>;
  config: FastSearchConfig;
  nodes: number;
};

const getActionKey = (action) => (
  `${action?.payload?.type || action?.type}:${JSON.stringify(action?.payload?.args || [])}`
);

const getMoveArgs = (action) => action?.payload?.args || [];

const getTotalCards = (state: FastState) => (
  state.deck.length + state.hands.reduce((sum, hand) => sum + hand.length, 0)
);

const getHandSize = (numPlayers) => {
  if (numPlayers === 1) {
    return 8;
  }

  if (numPlayers === 2) {
    return 7;
  }

  return 6;
};

const getMinRequiredMoves = (state: FastState) => (
  state.deck.length > 0 ? 2 : 1
);

const isUpPile = (pileIndex) => pileIndex < 2;

const canPlayFastCard = (piles, card, pileIndex) => {
  const pileValue = piles[pileIndex];

  if (isUpPile(pileIndex)) {
    return card > pileValue || pileValue - card === 10;
  }

  return card < pileValue || card - pileValue === 10;
};

const getFastMoveDamage = (piles, card, pileIndex) => {
  const pileValue = piles[pileIndex];

  if (isUpPile(pileIndex)) {
    if (pileValue - card === 10) {
      return -FAST_BACKWARD_JUMP_SCORE;
    }
    return card - pileValue;
  }

  if (card - pileValue === 10) {
    return -FAST_BACKWARD_JUMP_SCORE;
  }
  return pileValue - card;
};

const scoreFastMove = (move: FastMove) => {
  if (move.type !== 'PlayCard') {
    return Number.NEGATIVE_INFINITY;
  }

  if ((move.damage || 0) < 0) {
    return FAST_BACKWARD_JUMP_SCORE;
  }

  return 100 - (move.damage || 0);
};

const getFastMoveKey = (move: FastMove) => (
  move.type === 'EndTurn'
    ? 'EndTurn:[]'
    : `PlayCard:[${move.card},"${move.pile}"]`
);

const getFastExtraPlayDamageLimit = (numPlayers) => (
  numPlayers === 1 || numPlayers >= 4 ? 3 : 4
);

const cloneFastState = (state: FastState): FastState => ({
  deck: [...state.deck],
  piles: [...state.piles],
  hands: state.hands.map(hand => [...hand]),
  currentIndex: state.currentIndex,
  numPlayers: state.numPlayers,
  turnMovesMade: state.turnMovesMade,
  gameover: state.gameover ? { ...state.gameover } : undefined
});

const hasFastValidMoves = (state: FastState, playerIndex) => {
  const hand = state.hands[playerIndex];

  if (hand.length === 0) {
    return state.deck.length === 0;
  }

  return hand.some(card => (
    FAST_PILE_NAMES.some((_, pileIndex) => canPlayFastCard(state.piles, card, pileIndex))
  ));
};

const evaluateFastGameover = (state: FastState) => {
  if (state.deck.length === 0 && state.hands.every(hand => hand.length === 0)) {
    state.gameover = { won: true };
    return;
  }

  const minRequiredMoves = getMinRequiredMoves(state);
  const currentPlayerHasValidMoves = hasFastValidMoves(state, state.currentIndex);

  if (!currentPlayerHasValidMoves && state.turnMovesMade < minRequiredMoves) {
    state.gameover = { won: false };
    return;
  }

  if (!currentPlayerHasValidMoves && state.turnMovesMade >= minRequiredMoves) {
    const nextIndex = (state.currentIndex + 1) % state.numPlayers;

    if (!hasFastValidMoves(state, nextIndex)) {
      state.gameover = { won: false };
    }
  }
};

export const CreateFastState = (G, ctx): FastState | undefined => {
  if (ctx.phase !== 'playCard') {
    return undefined;
  }

  const playOrder = (ctx.playOrder || []).slice(0, ctx.numPlayers);
  const currentIndex = playOrder.indexOf(ctx.currentPlayer);

  if (currentIndex < 0) {
    return undefined;
  }

  const state: FastState = {
    deck: [...G.deck],
    piles: [...G.piles],
    hands: playOrder.map(playerID => [...(G.players[playerID]?.hand || [])]),
    currentIndex,
    numPlayers: ctx.numPlayers,
    turnMovesMade: G.turnMovesMade || 0,
    gameover: ctx.gameover ? { won: Boolean(ctx.gameover.won) } : undefined
  };

  if (!state.gameover) {
    evaluateFastGameover(state);
  }

  return state;
};

const replenishFastHand = (state: FastState, playerIndex) => {
  const hand = state.hands[playerIndex];
  const handSize = getHandSize(state.numPlayers);

  while (state.deck.length > 0 && hand.length < handSize) {
    hand.push(state.deck.pop() as number);
  }

  hand.sort((a, b) => a - b);
};

const advanceFastTurn = (state: FastState) => {
  replenishFastHand(state, state.currentIndex);

  if (state.deck.length === 0 && state.hands.every(hand => hand.length === 0)) {
    state.gameover = { won: true };
    return;
  }

  for (let skipped = 0; skipped <= state.numPlayers; skipped += 1) {
    state.currentIndex = (state.currentIndex + 1) % state.numPlayers;
    state.turnMovesMade = 0;

    if (state.deck.length !== 0 || state.hands[state.currentIndex].length !== 0) {
      evaluateFastGameover(state);
      return;
    }

    if (state.hands.every(hand => hand.length === 0)) {
      state.gameover = { won: true };
      return;
    }
  }

  evaluateFastGameover(state);
};

const applyFastMove = (state: FastState, move: FastMove): FastState | undefined => {
  if (state.gameover) {
    return state;
  }

  const nextState = cloneFastState(state);

  if (move.type === 'EndTurn') {
    const currentHand = nextState.hands[nextState.currentIndex];
    const canEndTurn =
      nextState.turnMovesMade >= getMinRequiredMoves(nextState) ||
      (currentHand.length === 0 && nextState.deck.length === 0);

    if (!canEndTurn) {
      return undefined;
    }

    advanceFastTurn(nextState);
    return nextState;
  }

  const hand = nextState.hands[nextState.currentIndex];
  const cardIndex = hand.indexOf(move.card as number);

  if (
    cardIndex < 0 ||
    move.pileIndex === undefined ||
    !canPlayFastCard(nextState.piles, move.card as number, move.pileIndex)
  ) {
    return undefined;
  }

  hand.splice(cardIndex, 1);
  nextState.piles[move.pileIndex] = move.card as number;
  nextState.turnMovesMade += 1;
  evaluateFastGameover(nextState);
  return nextState;
};

const getFastLegalPlays = (state: FastState) => {
  const hand = state.hands[state.currentIndex];
  const plays: FastMove[] = [];

  for (const card of hand) {
    for (let pileIndex = 0; pileIndex < FAST_PILE_NAMES.length; pileIndex += 1) {
      if (canPlayFastCard(state.piles, card, pileIndex)) {
        plays.push({
          type: 'PlayCard',
          card,
          pile: FAST_PILE_NAMES[pileIndex],
          pileIndex,
          damage: getFastMoveDamage(state.piles, card, pileIndex)
        });
      }
    }
  }

  return plays;
};

const selectFastPlayCandidates = (state: FastState, preferredMove?: FastMove) => {
  const candidates: FastMove[] = [];
  const seen = new Set<string>();
  const addUnique = (move: FastMove) => {
    const key = getFastMoveKey(move);

    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(move);
    }
  };

  const plays = getFastLegalPlays(state);

  if (preferredMove?.type === 'PlayCard') {
    const matchingPlay = plays.find(play => getFastMoveKey(play) === getFastMoveKey(preferredMove));

    if (matchingPlay) {
      addUnique(matchingPlay);
    }
  }

  plays
    .slice()
    .sort((a, b) => scoreFastMove(b) - scoreFastMove(a))
    .forEach(addUnique);

  plays
    .slice()
    .sort((a, b) => (a.damage || 0) - (b.damage || 0))
    .forEach(addUnique);

  return candidates.slice(0, FAST_PLAY_CANDIDATE_LIMIT);
};

const countFastPlayableCards = (state: FastState) => {
  let count = 0;

  for (const hand of state.hands) {
    for (const card of hand) {
      if (FAST_PILE_NAMES.some((_, pileIndex) => canPlayFastCard(state.piles, card, pileIndex))) {
        count += 1;
      }
    }
  }

  return count;
};

const countFastJumpOpportunities = (state: FastState) => {
  const cards = new Set(state.hands.flat());
  let count = 0;

  for (const pileValue of [state.piles[0], state.piles[1]]) {
    if (cards.has(pileValue - 10)) {
      count += 1;
    }
  }

  for (const pileValue of [state.piles[2], state.piles[3]]) {
    if (cards.has(pileValue + 10)) {
      count += 1;
    }
  }

  return count;
};

const countBlockedFastHands = (state: FastState) => (
  state.hands.filter((hand, playerIndex) => (
    hand.length > 0 && !hasFastValidMoves(state, playerIndex)
  )).length
);

const getFastPileRange = (state: FastState) => (
  (100 - state.piles[0]) +
  (100 - state.piles[1]) +
  (state.piles[2] - 1) +
  (state.piles[3] - 1)
);

const scoreFastRequiredPlanState = (state: FastState) => (
  getFastPileRange(state) +
  countFastPlayableCards(state) * 2 +
  countFastJumpOpportunities(state) * 20
);

const scoreFastState = (state: FastState) => {
  const remainingCards = getTotalCards(state);

  if (state.gameover?.won) {
    return 1_000_000_000;
  }

  if (state.gameover) {
    return -1_000_000_000 - remainingCards * 100_000;
  }

  return (
    -remainingCards * 5_000 -
    state.deck.length * 200 +
    countFastPlayableCards(state) * 3_000 +
    countFastJumpOpportunities(state) * 25_000 +
    getFastPileRange(state) * 250 -
    countBlockedFastHands(state) * 100_000
  );
};

export const GenerateFastTurnOptions = (
  state: FastState,
  optionLimit = FAST_INITIAL_OPTION_LIMIT,
  preferredMove?: FastMove
): FastTurnOption[] => {
  if (state.gameover) {
    return [];
  }

  const options: FastTurnOption[] = [];
  const seen = new Set<string>();
  const currentHand = state.hands[state.currentIndex];
  const minMovesRemaining = Math.max(0, getMinRequiredMoves(state) - state.turnMovesMade);
  const maxPlays = state.deck.length === 0
    ? Math.min(currentHand.length, FAST_EMPTY_DECK_PLAY_LIMIT)
    : Math.min(currentHand.length, minMovesRemaining + FAST_EXTRA_PLAYS);

  const addOption = (moves: FastMove[], nextState: FastState | undefined) => {
    if (!nextState || moves.length === 0 || options.length >= optionLimit) {
      return;
    }

    const key = moves.map(getFastMoveKey).join('>');
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    options.push({
      firstMove: moves[0],
      moves,
      state: nextState,
      score: scoreFastState(nextState)
    });
  };

  const visit = (searchState: FastState, moves: FastMove[], playsMade: number) => {
    if (options.length >= optionLimit || searchState.gameover) {
      addOption(moves, searchState);
      return;
    }

    const canEndTurn =
      searchState.turnMovesMade >= getMinRequiredMoves(searchState) ||
      (searchState.hands[searchState.currentIndex].length === 0 && searchState.deck.length === 0);

    if (canEndTurn) {
      const endTurnMove: FastMove = { type: 'EndTurn' };
      addOption([...moves, endTurnMove], applyFastMove(searchState, endTurnMove));
    }

    if (playsMade >= maxPlays) {
      return;
    }

    const preferredPlay = moves.length === 0 ? preferredMove : undefined;

    for (const play of selectFastPlayCandidates(searchState, preferredPlay)) {
      const nextState = applyFastMove(searchState, play);

      if (!nextState) {
        continue;
      }

      visit(nextState, [...moves, play], playsMade + 1);

      if (options.length >= optionLimit) {
        return;
      }
    }
  };

  visit(state, [], 0);

  return options
    .sort((a, b) => b.score - a.score)
    .slice(0, optionLimit);
};

const getFastStateKey = (state: FastState, depth) => (
  [
    depth,
    state.currentIndex,
    state.turnMovesMade,
    state.deck.join(','),
    state.piles.join(','),
    state.hands.map(hand => hand.join(',')).join('|'),
    state.gameover ? (state.gameover.won ? 'W' : 'L') : ''
  ].join(';')
);

const scoreFastSearchState = (state: FastState, depth, context: FastSearchContext): number => {
  context.nodes += 1;

  if (state.gameover) {
    return scoreFastState(state);
  }

  if (context.nodes > context.config.nodeLimit || depth <= 0) {
    return scoreFastState(state);
  }

  const cacheKey = getFastStateKey(state, depth);
  const cachedScore = context.cache.get(cacheKey);

  if (cachedScore !== undefined) {
    return cachedScore;
  }

  const options = GenerateFastTurnOptions(state, context.config.futureOptions);

  if (options.length === 0) {
    const score = scoreFastState(state);
    context.cache.set(cacheKey, score);
    return score;
  }

  let bestScore = Number.NEGATIVE_INFINITY;

  for (const option of options) {
    const score = scoreFastSearchState(option.state, depth - 1, context) + option.score * 0.0001;
    bestScore = Math.max(bestScore, score);
  }

  context.cache.set(cacheKey, bestScore);
  return bestScore;
};

const findMatchingAction = (actions, move: FastMove) => {
  if (move.type === 'EndTurn') {
    return actions.find(action => action?.payload?.type === 'EndTurn');
  }

  return actions.find(action => {
    if (action?.payload?.type !== 'PlayCard') {
      return false;
    }

    const [card, pile] = getMoveArgs(action);
    return card === move.card && pile === move.pile;
  });
};

const getMoveFromAction = (action): FastMove | undefined => {
  if (action?.payload?.type === 'EndTurn') {
    return { type: 'EndTurn' };
  }

  if (action?.payload?.type !== 'PlayCard') {
    return undefined;
  }

  const [card, pile] = getMoveArgs(action);
  const pileIndex = FAST_PILE_NAMES.indexOf(pile);

  if (pileIndex < 0) {
    return undefined;
  }

  return {
    type: 'PlayCard',
    card,
    pile,
    pileIndex,
    damage: 0
  };
};

const pickFastPolicyMove = (state: FastState): FastMove | undefined => {
  if (state.gameover) {
    return undefined;
  }

  const plays = getFastLegalPlays(state);
  const currentHand = state.hands[state.currentIndex];
  const canEndTurn =
    state.turnMovesMade >= getMinRequiredMoves(state) ||
    (currentHand.length === 0 && state.deck.length === 0);

  if (plays.length === 0) {
    return canEndTurn ? { type: 'EndTurn' } : undefined;
  }

  const requiredMovesRemaining = Math.max(0, getMinRequiredMoves(state) - state.turnMovesMade);

  if (requiredMovesRemaining > 0) {
    let frontier = [{
      state,
      sequence: [] as FastMove[]
    }];

    for (let depth = 0; depth < requiredMovesRemaining; depth += 1) {
      const nextFrontier: Array<{ state: FastState; sequence: FastMove[] }> = [];

      for (const node of frontier) {
        for (const play of selectFastPlayCandidates(node.state)) {
          const nextState = applyFastMove(node.state, play);

          if (nextState) {
            nextFrontier.push({
              state: nextState,
              sequence: [...node.sequence, play]
            });
          }
        }
      }

      if (nextFrontier.length === 0) {
        break;
      }

      frontier = nextFrontier
        .sort((a, b) => scoreFastRequiredPlanState(b.state) - scoreFastRequiredPlanState(a.state))
        .slice(0, FAST_FUTURE_OPTION_LIMIT);
    }

    const completePlans = frontier.filter(node => node.sequence.length === requiredMovesRemaining);

    if (completePlans.length > 0) {
      return completePlans
        .sort((a, b) => scoreFastRequiredPlanState(b.state) - scoreFastRequiredPlanState(a.state))[0]
        .sequence[0];
    }

    return plays
      .slice()
      .sort((a, b) => scoreFastMove(b) - scoreFastMove(a))[0];
  }

  const bestPlay = plays
    .slice()
    .sort((a, b) => (a.damage || 0) - (b.damage || 0))[0];

  if (
    canEndTurn &&
    state.deck.length > 0 &&
    (bestPlay.damage || 0) > getFastExtraPlayDamageLimit(state.numPlayers)
  ) {
    return { type: 'EndTurn' };
  }

  return bestPlay;
};

const scoreFastPolicyRollout = (state: FastState) => {
  let rolloutState = cloneFastState(state);

  for (let depth = 0; depth < 300 && !rolloutState.gameover; depth += 1) {
    const move = pickFastPolicyMove(rolloutState);

    if (!move) {
      rolloutState.gameover = { won: false };
      break;
    }

    const nextState = applyFastMove(rolloutState, move);

    if (!nextState) {
      rolloutState.gameover = { won: false };
      break;
    }

    rolloutState = nextState;
  }

  return scoreFastState(rolloutState);
};

const getFastSearchConfig = (ctx): FastSearchConfig => {
  if (ctx.numPlayers === 1) {
    return FAST_SEARCH_CONFIGS.solo;
  }

  if (ctx.numPlayers === 2) {
    return FAST_SEARCH_CONFIGS.twoPlayer;
  }

  if (ctx.numPlayers === 3) {
    return FAST_SEARCH_CONFIGS.threePlayer;
  }

  return FAST_SEARCH_CONFIGS.largeGame;
};

const pickFastPolicyRolloutAction = (state: FastState, actions, fallbackAction) => {
  const fallbackKey = getActionKey(fallbackAction);
  const fallbackMove = getMoveFromAction(fallbackAction);
  let bestAction = fallbackAction;
  let bestScore = Number.NEGATIVE_INFINITY;

  if (fallbackMove) {
    if (fallbackMove.type === 'PlayCard') {
      fallbackMove.damage = getFastMoveDamage(state.piles, fallbackMove.card as number, fallbackMove.pileIndex as number);
    }

    const fallbackState = applyFastMove(state, fallbackMove);
    bestScore = fallbackState ? scoreFastPolicyRollout(fallbackState) : Number.NEGATIVE_INFINITY;

    if (bestScore >= 1_000_000_000) {
      return fallbackAction;
    }
  }

  for (const action of actions) {
    const move = getMoveFromAction(action);

    if (!move) {
      continue;
    }

    if (move.type === 'PlayCard') {
      move.damage = getFastMoveDamage(state.piles, move.card as number, move.pileIndex as number);
    }

    const nextState = applyFastMove(state, move);

    if (!nextState) {
      continue;
    }

    const tieBreaker = getActionKey(action) === fallbackKey ? 0.1 : 0;
    const score = scoreFastPolicyRollout(nextState) + tieBreaker;

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
};

const pickFastTurnSearchAction = (
  state: FastState,
  config: FastSearchConfig,
  actions,
  fallbackAction
) => {
  const fallbackKey = getActionKey(fallbackAction);
  const fallbackMove = getMoveFromAction(fallbackAction);
  const context: FastSearchContext = {
    cache: new Map(),
    config,
    nodes: 0
  };
  let bestAction = fallbackAction;
  let bestScore = Number.NEGATIVE_INFINITY;
  const scoreRootState = (rootState: FastState) => (
    scoreFastPolicyRollout(rootState) +
    scoreFastSearchState(rootState, config.depth - 1, context) * 0.001
  );

  if (fallbackMove) {
    if (fallbackMove.type === 'PlayCard') {
      fallbackMove.damage = getFastMoveDamage(state.piles, fallbackMove.card as number, fallbackMove.pileIndex as number);
    }

    const fallbackState = applyFastMove(state, fallbackMove);
    bestScore = fallbackState ? scoreRootState(fallbackState) : Number.NEGATIVE_INFINITY;
  }

  for (const option of GenerateFastTurnOptions(state, config.rootOptions, fallbackMove)) {
    const action = findMatchingAction(actions, option.firstMove);

    if (!action) {
      continue;
    }

    const tieBreaker = getActionKey(action) === fallbackKey ? 0.1 : 0;
    const score = scoreRootState(option.state) + option.score * 0.0001 + tieBreaker;

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
};

export const PickFastSearchAction = (G, ctx, actions, fallbackAction) => {
  if (actions.length <= 1) {
    return fallbackAction;
  }

  const config = getFastSearchConfig(ctx);
  const state = CreateFastState(G, ctx);

  if (!state || state.gameover || state.deck.length > config.deckThreshold) {
    return fallbackAction;
  }

  if (ctx.numPlayers === 1) {
    return pickFastPolicyRolloutAction(state, actions, fallbackAction);
  }

  return pickFastTurnSearchAction(state, config, actions, fallbackAction);
};

export const PickFastBeamSearchAction = PickFastSearchAction;
