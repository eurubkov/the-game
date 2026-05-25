import { Bot } from 'boardgame.io/ai';
import { CreateGameReducer } from 'boardgame.io/internal';
import {
  CanPlayCard,
  DOWN_PILES,
  FIRST_DOWN,
  FIRST_UP,
  MinRequiredMoves,
  PILES_MAP,
  SECOND_DOWN,
  SECOND_UP,
  UP_PILES
} from './TheGame';
import { PickFastSearchAction } from './FastBeamSearchSolver';

const BACKWARD_JUMP_SCORE = 1000;
const DEFAULT_EXTRA_PLAY_DAMAGE_LIMIT = 4;
const CONSERVATIVE_EXTRA_PLAY_DAMAGE_LIMIT = 3;
// 2p/3p benchmark failures came from mid-game pile traps, so search starts earlier there.
const DEFAULT_ROLLOUT_DECK_THRESHOLD = 50;
const SOLO_ROLLOUT_DECK_THRESHOLD = 70;
const THREE_PLAYER_ROLLOUT_DECK_THRESHOLD = 50;
const LARGE_GAME_ROLLOUT_DECK_THRESHOLD = 30;
const ROLLOUT_DEPTH = 180;
const ROLLOUT_CANDIDATE_LIMIT = 6;
const TURN_SEQUENCE_LIMIT = 48;
const TURN_SEQUENCE_PLAY_CANDIDATE_LIMIT = 4;
const TURN_SEQUENCE_EXTRA_PLAYS = 2;
const TURN_SEQUENCE_DECK_MIN = 46;
const TURN_SEQUENCE_DECK_MAX = 60;
const EMPTY_DECK_SEQUENCE_PLAY_LIMIT = 6;
const BOT_PILES = [FIRST_UP, SECOND_UP, FIRST_DOWN, SECOND_DOWN];
const REQUIRED_PLAN_WEIGHTS = {
  pileRange: 1,
  playableCards: 2,
  jumpOpportunities: 20
};

type CooperativeBotStrategy = {
  name: string;
  rolloutDeckThreshold: number;
  extraPlayDamageLimit: number;
  useTurnSequenceSearch: boolean;
  useFastSearch: boolean;
};

type PlannedPlay = {
  card: number;
  pile: string;
};

type PlanNode = {
  G: any;
  sequence: PlannedPlay[];
};

type TurnSequence = {
  actions: any[];
  key: string;
};

const isMakeMove = (action, moveName) => (
  action?.type === 'MAKE_MOVE' && action.payload?.type === moveName
);

const getMoveArgs = (action) => action?.payload?.args || [];

const getPlayKey = (card, pile) => `${card}:${pile}`;

const getActionKey = (action) => (
  `${action?.payload?.type || action?.type}:${JSON.stringify(action?.payload?.args || [])}`
);

const getPlayerID = (ctx, playerID) => playerID || ctx.currentPlayer;

const getTotalCards = (G) => (
  G.deck.length + Object.values(G.players).reduce((sum: number, player: any) => (
    sum + player.hand.length
  ), 0)
);

export const GetCooperativeBotStrategy = (ctx): CooperativeBotStrategy => {
  if (ctx.numPlayers === 1) {
    return {
      name: 'solo-fast-policy-rollout',
      rolloutDeckThreshold: SOLO_ROLLOUT_DECK_THRESHOLD,
      extraPlayDamageLimit: CONSERVATIVE_EXTRA_PLAY_DAMAGE_LIMIT,
      useTurnSequenceSearch: false,
      useFastSearch: true
    };
  }

  if (ctx.numPlayers === 2) {
    return {
      name: 'two-player-sequence-search',
      rolloutDeckThreshold: DEFAULT_ROLLOUT_DECK_THRESHOLD,
      extraPlayDamageLimit: DEFAULT_EXTRA_PLAY_DAMAGE_LIMIT,
      useTurnSequenceSearch: true,
      useFastSearch: false
    };
  }

  if (ctx.numPlayers === 3) {
    return {
      name: 'three-player-reducer-rollout',
      rolloutDeckThreshold: THREE_PLAYER_ROLLOUT_DECK_THRESHOLD,
      extraPlayDamageLimit: CONSERVATIVE_EXTRA_PLAY_DAMAGE_LIMIT,
      useTurnSequenceSearch: false,
      useFastSearch: false
    };
  }

  return {
    name: 'large-game-fast-turn-search',
    rolloutDeckThreshold: LARGE_GAME_ROLLOUT_DECK_THRESHOLD,
    extraPlayDamageLimit: CONSERVATIVE_EXTRA_PLAY_DAMAGE_LIMIT,
    useTurnSequenceSearch: false,
    useFastSearch: true
  };
};

export const GetBotMoveDamage = (G, action) => {
  if (!isMakeMove(action, 'PlayCard')) {
    return Number.POSITIVE_INFINITY;
  }

  const [card, pile] = getMoveArgs(action);
  const pileIndex = PILES_MAP[pile];
  const pileValue = G.piles[pileIndex];

  if (UP_PILES.includes(pile)) {
    if (pileValue - card === 10) {
      return -BACKWARD_JUMP_SCORE;
    }
    return card - pileValue;
  }

  if (DOWN_PILES.includes(pile)) {
    if (card - pileValue === 10) {
      return -BACKWARD_JUMP_SCORE;
    }
    return pileValue - card;
  }

  return Number.POSITIVE_INFINITY;
};

export const ScoreBotMove = (G, action) => {
  if (!isMakeMove(action, 'PlayCard')) {
    return Number.NEGATIVE_INFINITY;
  }

  const damage = GetBotMoveDamage(G, action);

  if (damage < 0) {
    return BACKWARD_JUMP_SCORE;
  }

  return 100 - damage;
};

const cloneBotState = (G) => ({
  ...G,
  deck: [...G.deck],
  piles: [...G.piles],
  players: Object.keys(G.players).reduce((players, playerID) => {
    players[playerID] = {
      ...G.players[playerID],
      hand: [...G.players[playerID].hand]
    };
    return players;
  }, {})
});

const getLegalPlayDescriptors = (G, ctx, playerID) => {
  const player = G.players[playerID];

  if (!player) {
    return [];
  }

  const plays: PlannedPlay[] = [];
  for (const card of player.hand) {
    for (const pile of BOT_PILES) {
      if (CanPlayCard(G, ctx, card, pile)) {
        plays.push({ card, pile });
      }
    }
  }
  return plays;
};

const applyPlannedPlay = (G, playerID, play) => {
  const nextG = cloneBotState(G);
  const hand = nextG.players[playerID].hand;
  const cardIndex = hand.indexOf(play.card);
  hand.splice(cardIndex, 1);
  nextG.piles[PILES_MAP[play.pile]] = play.card;
  nextG.turnMovesMade = (nextG.turnMovesMade || 0) + 1;
  return nextG;
};

const getAllHandCards = (G) => Object.values(G.players).flatMap((player: any) => player.hand);

const countPlayableCards = (G, ctx, cards) => cards.filter(card => (
  BOT_PILES.some(pile => CanPlayCard(G, ctx, card, pile))
)).length;

const countJumpOpportunities = (G, cards) => {
  const cardSet = new Set(cards);
  let count = 0;

  for (const pileValue of [G.piles[0], G.piles[1]]) {
    if (cardSet.has(pileValue - 10)) {
      count += 1;
    }
  }

  for (const pileValue of [G.piles[2], G.piles[3]]) {
    if (cardSet.has(pileValue + 10)) {
      count += 1;
    }
  }

  return count;
};

const scorePlannedState = (G, ctx) => {
  const allHandCards = getAllHandCards(G);
  const pileRange =
    (100 - G.piles[0]) +
    (100 - G.piles[1]) +
    (G.piles[2] - 1) +
    (G.piles[3] - 1);

  return (
    REQUIRED_PLAN_WEIGHTS.pileRange * pileRange +
    REQUIRED_PLAN_WEIGHTS.playableCards * countPlayableCards(G, ctx, allHandCards) +
    REQUIRED_PLAN_WEIGHTS.jumpOpportunities * countJumpOpportunities(G, allHandCards)
  );
};

export const BuildRequiredTurnPlan = (G, ctx, playerID = getPlayerID(ctx, undefined)) => {
  const requiredMovesRemaining = Math.max(0, MinRequiredMoves(G, ctx) - (G.turnMovesMade || 0));

  if (requiredMovesRemaining === 0) {
    return [];
  }

  let frontier: PlanNode[] = [{
    G: cloneBotState(G),
    sequence: []
  }];

  for (let depth = 0; depth < requiredMovesRemaining; depth += 1) {
    const nextFrontier: PlanNode[] = [];

    for (const node of frontier) {
      const legalPlays = getLegalPlayDescriptors(node.G, ctx, playerID);

      for (const play of legalPlays) {
        nextFrontier.push({
          G: applyPlannedPlay(node.G, playerID, play),
          sequence: [...node.sequence, play]
        });
      }
    }

    if (nextFrontier.length === 0) {
      break;
    }

    frontier = nextFrontier;
  }

  const completePlans = frontier.filter(node => node.sequence.length === requiredMovesRemaining);

  if (completePlans.length === 0) {
    return [];
  }

  completePlans.sort((a, b) => scorePlannedState(b.G, ctx) - scorePlannedState(a.G, ctx));
  return completePlans[0].sequence;
};

export const PickCooperativeBotAction = (G, ctx, actions, playerID = getPlayerID(ctx, undefined)) => {
  const playActions = actions
    .filter(action => isMakeMove(action, 'PlayCard'))
    .map(action => ({ action, score: ScoreBotMove(G, action) }))
    .sort((a, b) => b.score - a.score);
  const endTurnAction = actions.find(action => isMakeMove(action, 'EndTurn'));

  if (playActions.length === 0) {
    return endTurnAction || actions[0];
  }

  const requiredMovesRemaining = Math.max(0, MinRequiredMoves(G, ctx) - (G.turnMovesMade || 0));

  if (requiredMovesRemaining > 0) {
    const plan = BuildRequiredTurnPlan(G, ctx, playerID);
    const firstPlannedPlay = plan[0];

    if (firstPlannedPlay) {
      const plannedAction = playActions.find(({ action }) => {
        const [card, pile] = getMoveArgs(action);
        return getPlayKey(card, pile) === getPlayKey(firstPlannedPlay.card, firstPlannedPlay.pile);
      });

      if (plannedAction) {
        return plannedAction.action;
      }
    }

    return playActions[0].action;
  }

  const bestPlay = playActions
    .slice()
    .sort((a, b) => GetBotMoveDamage(G, a.action) - GetBotMoveDamage(G, b.action))[0];
  const minRequiredMoves = MinRequiredMoves(G, ctx);
  const hasMetMinimum = (G.turnMovesMade || 0) >= minRequiredMoves;

  if (hasMetMinimum && endTurnAction) {
    if (G.deck.length === 0) {
      return bestPlay.action;
    }

    if (GetBotMoveDamage(G, bestPlay.action) > GetCooperativeBotStrategy(ctx).extraPlayDamageLimit) {
      return endTurnAction;
    }
  }

  return bestPlay.action;
};

const scoreRolloutState = (state) => {
  const remainingCards = getTotalCards(state.G);
  let score = -remainingCards * 1000 - state.G.deck.length;

  if (state.ctx.gameover?.won) {
    score += 1_000_000;
  } else if (state.ctx.gameover) {
    score -= 100_000;
  }

  return score;
};

const selectRolloutCandidates = (G, actions, baseAction) => {
  const candidates = actions
    .filter(action => isMakeMove(action, 'PlayCard'))
    .slice()
    .sort((a, b) => ScoreBotMove(G, b) - ScoreBotMove(G, a))
    .slice(0, ROLLOUT_CANDIDATE_LIMIT);

  const addUnique = (action) => {
    if (action && !candidates.some(candidate => getActionKey(candidate) === getActionKey(action))) {
      candidates.push(action);
    }
  };

  addUnique(baseAction);
  addUnique(actions.find(action => isMakeMove(action, 'EndTurn')));

  return candidates;
};

const getSequenceKey = (actions) => actions.map(getActionKey).join('>');

const getSequencePlayLimit = (G, ctx, playerID) => {
  const player = G.players[playerID];

  if (!player) {
    return 0;
  }

  if (G.deck.length === 0) {
    return Math.min(player.hand.length, EMPTY_DECK_SEQUENCE_PLAY_LIMIT);
  }

  const requiredMovesRemaining = Math.max(0, MinRequiredMoves(G, ctx) - (G.turnMovesMade || 0));
  return Math.min(player.hand.length, requiredMovesRemaining + TURN_SEQUENCE_EXTRA_PLAYS);
};

const selectTurnSequencePlayCandidates = (G, ctx, actions, playerID) => {
  const candidates: any[] = [];
  const addUnique = (action) => {
    if (action && !candidates.some(candidate => getActionKey(candidate) === getActionKey(action))) {
      candidates.push(action);
    }
  };

  const playActions = actions
    .filter(action => isMakeMove(action, 'PlayCard'))
    .slice();
  const requiredPlan = BuildRequiredTurnPlan(G, ctx, playerID);
  const nextPlannedPlay = requiredPlan[0];

  if (nextPlannedPlay) {
    addUnique(playActions.find(action => {
      const [card, pile] = getMoveArgs(action);
      return getPlayKey(card, pile) === getPlayKey(nextPlannedPlay.card, nextPlannedPlay.pile);
    }));
  }

  playActions
    .sort((a, b) => ScoreBotMove(G, b) - ScoreBotMove(G, a))
    .forEach(addUnique);

  playActions
    .slice()
    .sort((a, b) => GetBotMoveDamage(G, a) - GetBotMoveDamage(G, b))
    .forEach(addUnique);

  return candidates.slice(0, TURN_SEQUENCE_PLAY_CANDIDATE_LIMIT);
};

/**
 * CooperativeMCTSBot keeps the original public name used by the app, but uses a
 * small deterministic turn planner and late-game rollouts instead of slow random
 * playouts.
 */
class CooperativeMCTSBot extends Bot {
  private reducer: any;

  constructor(opts) {
    super({ enumerate: opts.enumerate || opts.game.ai.enumerate, seed: opts.seed || opts.game.seed });
    this.reducer = CreateGameReducer({ game: opts.game });
  }

  private rollout(state) {
    let rolloutState = state;

    for (let depth = 0; depth < ROLLOUT_DEPTH && rolloutState.ctx.gameover === undefined; depth += 1) {
      const playerID = rolloutState.ctx.activePlayers
        ? Object.keys(rolloutState.ctx.activePlayers)[0]
        : rolloutState.ctx.currentPlayer;
      const actions = this.enumerate(rolloutState.G, rolloutState.ctx, playerID).filter(Boolean);
      const action = PickCooperativeBotAction(rolloutState.G, rolloutState.ctx, actions, playerID);

      if (!action) {
        break;
      }

      const nextState = this.reducer(rolloutState, action);

      if (!nextState || nextState._stateID === rolloutState._stateID) {
        break;
      }

      rolloutState = nextState;
    }

    return scoreRolloutState(rolloutState);
  }

  private pickRolloutAction(state, playerID, actions, baseAction, strategy: CooperativeBotStrategy) {
    if (
      state._stateID === undefined ||
      state.G.deck.length > strategy.rolloutDeckThreshold ||
      actions.length <= 1
    ) {
      return baseAction;
    }

    let bestAction = baseAction;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const action of selectRolloutCandidates(state.G, actions, baseAction)) {
      const nextState = this.reducer(state, action);

      if (!nextState || nextState._stateID === state._stateID) {
        continue;
      }

      const baseTieBreaker = getActionKey(action) === getActionKey(baseAction) ? 0.1 : 0;
      const score = this.rollout(nextState) + baseTieBreaker;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  private generateTurnSequences(state, playerID, rootActions, baseAction) {
    const sequences: TurnSequence[] = [];
    const seen = new Set<string>();
    const maxPlays = getSequencePlayLimit(state.G, state.ctx, playerID);

    const addSequence = (sequence) => {
      if (sequence.length === 0 || sequences.length >= TURN_SEQUENCE_LIMIT) {
        return;
      }

      const key = getSequenceKey(sequence);
      if (!seen.has(key)) {
        seen.add(key);
        sequences.push({ actions: sequence, key });
      }
    };

    const visit = (searchState, sequence, playsMade) => {
      addSequence(sequence);

      if (
        sequences.length >= TURN_SEQUENCE_LIMIT ||
        searchState.ctx.gameover !== undefined ||
        searchState.ctx.currentPlayer !== playerID ||
        playsMade >= maxPlays
      ) {
        return;
      }

      const actions = sequence.length === 0
        ? rootActions
        : this.enumerate(searchState.G, searchState.ctx, playerID).filter(Boolean);
      const endTurnAction = actions.find(action => isMakeMove(action, 'EndTurn'));

      if (endTurnAction) {
        addSequence([...sequence, endTurnAction]);
      }

      for (const action of selectTurnSequencePlayCandidates(searchState.G, searchState.ctx, actions, playerID)) {
        const nextState = this.reducer(searchState, action);

        if (!nextState || nextState._stateID === searchState._stateID) {
          continue;
        }

        visit(nextState, [...sequence, action], playsMade + 1);

        if (sequences.length >= TURN_SEQUENCE_LIMIT) {
          break;
        }
      }
    };

    addSequence([baseAction]);
    visit(state, [], 0);

    return sequences;
  }

  private pickTurnSequenceAction(state, playerID, actions, baseAction) {
    if (
      state._stateID === undefined ||
      (state.G.turnMovesMade || 0) === 0 ||
      state.G.deck.length < TURN_SEQUENCE_DECK_MIN ||
      state.G.deck.length > TURN_SEQUENCE_DECK_MAX ||
      actions.length <= 1
    ) {
      return baseAction;
    }

    let bestAction = baseAction;
    let bestScore = Number.NEGATIVE_INFINITY;
    const baseActionKey = getActionKey(baseAction);

    for (const sequence of this.generateTurnSequences(state, playerID, actions, baseAction)) {
      let nextState = state;

      for (const action of sequence.actions) {
        nextState = this.reducer(nextState, action);

        if (!nextState) {
          break;
        }
      }

      if (!nextState || nextState._stateID === state._stateID) {
        continue;
      }

      const firstAction = sequence.actions[0];

      const baseTieBreaker = getActionKey(firstAction) === baseActionKey ? 0.1 : 0;
      const completedTurnTieBreaker = nextState.ctx.currentPlayer !== playerID ? 0.01 : 0;
      const score = this.rollout(nextState) + baseTieBreaker + completedTurnTieBreaker;

      if (score > bestScore) {
        bestScore = score;
        bestAction = firstAction;
      }
    }

    return bestAction;
  }

  play(state, playerID) {
    const { G, ctx } = state;
    const strategy = GetCooperativeBotStrategy(ctx);
    const actions = this.enumerate(G, ctx, playerID).filter(Boolean);
    const baseAction = PickCooperativeBotAction(G, ctx, actions, playerID);
    const rolloutAction = this.pickRolloutAction(state, playerID, actions, baseAction, strategy);
    const sequenceAction = strategy.useTurnSequenceSearch
      ? this.pickTurnSequenceAction(state, playerID, actions, rolloutAction)
      : rolloutAction;
    const action = strategy.useFastSearch
      ? PickFastSearchAction(G, ctx, actions, sequenceAction)
      : sequenceAction;

    return Promise.resolve({
      action
    });
  }
}

export default CooperativeMCTSBot;
