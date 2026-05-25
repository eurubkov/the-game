import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { INVALID_MOVE } from 'boardgame.io/core';
import { CreateGameReducer, InitializeGame } from 'boardgame.io/internal';
import TheGame, {
  CanPlayCard,
  FIRST_DOWN,
  FIRST_UP,
  MinRequiredMoves,
  SECOND_DOWN,
  SECOND_UP
} from './TheGame';
import TheGameBoard from './Board';

const gameConfig = TheGame;
const gameMoves = gameConfig.phases.playCard.moves;
const playTurn = gameConfig.phases.playCard.turn;
const makeMove = (type, args, playerID = '0') => ({
  type: 'MAKE_MOVE',
  payload: { type, args, playerID }
});

const createPlayers = (hands = {}) => {
  return ['0', '1', '2', '3', '4'].reduce((players, playerID) => {
    players[playerID] = { hand: hands[playerID] || [] };
    return players;
  }, {});
};

const createG = (overrides = {}) => ({
  seed: 123,
  deck: [30, 31, 32],
  piles: [20, 25, 80, 75],
  players: createPlayers({ '0': [10, 30, 90], '1': [40, 41] }),
  turnMovesMade: 0,
  ...overrides,
  players: overrides.players || createPlayers({ '0': [10, 30, 90], '1': [40, 41] })
});

const createCtx = (overrides = {}) => ({
  numPlayers: 1,
  currentPlayer: '0',
  playOrder: ['0'],
  playOrderPos: 0,
  phase: 'playCard',
  events: {
    endTurn: jest.fn()
  },
  ...overrides
});

describe('The Game card play rules', () => {
  test('allows normal ascending plays and the backwards-by-10 exception', () => {
    const G = createG({ piles: [20, 25, 80, 75] });
    const ctx = createCtx();

    expect(CanPlayCard(G, ctx, 21, FIRST_UP)).toBe(true);
    expect(CanPlayCard(G, ctx, 10, FIRST_UP)).toBe(true);
    expect(CanPlayCard(G, ctx, 19, FIRST_UP)).toBe(false);
  });

  test('allows normal descending plays and the backwards-by-10 exception', () => {
    const G = createG({ piles: [20, 25, 80, 75] });
    const ctx = createCtx();

    expect(CanPlayCard(G, ctx, 79, FIRST_DOWN)).toBe(true);
    expect(CanPlayCard(G, ctx, 90, FIRST_DOWN)).toBe(true);
    expect(CanPlayCard(G, ctx, 81, FIRST_DOWN)).toBe(false);
  });

  test('rejects invalid piles and wrong direction plays', () => {
    const G = createG({ piles: [20, 25, 80, 75] });
    const ctx = createCtx();

    expect(CanPlayCard(G, ctx, 30, 'missing_pile')).toBe(false);
    expect(CanPlayCard(G, ctx, 16, SECOND_UP)).toBe(false);
    expect(CanPlayCard(G, ctx, 84, SECOND_DOWN)).toBe(false);
  });
});

describe('minimum required moves', () => {
  test('requires two cards while the deck has cards for any player count', () => {
    expect(MinRequiredMoves(createG({ deck: [2] }), createCtx({ numPlayers: 1 }))).toBe(2);
    expect(MinRequiredMoves(createG({ deck: [2] }), createCtx({ numPlayers: 2 }))).toBe(2);
    expect(MinRequiredMoves(createG({ deck: [2] }), createCtx({ numPlayers: 5 }))).toBe(2);
  });

  test('requires one card after the deck is empty for any player count', () => {
    expect(MinRequiredMoves(createG({ deck: [] }), createCtx({ numPlayers: 1 }))).toBe(1);
    expect(MinRequiredMoves(createG({ deck: [] }), createCtx({ numPlayers: 4 }))).toBe(1);
  });
});

describe('moves and turn flow', () => {
  test('PlayCard removes the card, updates the pile, and increments turn move count', () => {
    const G = createG({
      piles: [20, 25, 80, 75],
      players: createPlayers({ '0': [10, 30, 90] })
    });
    const ctx = createCtx();

    expect(gameMoves.PlayCard(G, ctx, 30, FIRST_UP)).toBeUndefined();
    expect(G.players['0'].hand).toEqual([10, 90]);
    expect(G.piles[0]).toBe(30);
    expect(G.turnMovesMade).toBe(1);
  });

  test('PlayCard rejects invalid cards without mutating state', () => {
    const G = createG({
      piles: [20, 25, 80, 75],
      players: createPlayers({ '0': [10, 30, 90] })
    });
    const ctx = createCtx();

    expect(gameMoves.PlayCard(G, ctx, 11, FIRST_UP)).toBe(INVALID_MOVE);
    expect(G.players['0'].hand).toEqual([10, 30, 90]);
    expect(G.piles[0]).toBe(20);
    expect(G.turnMovesMade).toBe(0);
  });

  test('EndTurn rejects ending early while the deck has cards', () => {
    const G = createG({
      deck: [50],
      players: createPlayers({ '0': [30, 90] }),
      turnMovesMade: 1
    });
    const ctx = createCtx({ numPlayers: 1 });

    expect(gameMoves.EndTurn(G, ctx)).toBe(INVALID_MOVE);
    expect(ctx.events.endTurn).not.toHaveBeenCalled();
  });

  test('EndTurn accepts a valid turn and replenishes the current player on turn end', () => {
    const G = createG({
      deck: [50, 51, 52],
      players: createPlayers({ '0': [30, 90] }),
      turnMovesMade: 2
    });
    const ctx = createCtx({ numPlayers: 1 });

    expect(gameMoves.EndTurn(G, ctx)).toBeUndefined();
    expect(ctx.events.endTurn).toHaveBeenCalledTimes(1);

    playTurn.onEnd(G, ctx);
    expect(G.players['0'].hand).toEqual([30, 50, 51, 52, 90]);
    expect(G.deck).toEqual([]);
  });

  test('empty-handed players can be skipped after the deck is empty', () => {
    const G = createG({
      deck: [],
      players: createPlayers({ '0': [] }),
      turnMovesMade: 0
    });
    const ctx = createCtx({ numPlayers: 1 });

    expect(gameMoves.EndTurn(G, ctx)).toBeUndefined();
    expect(ctx.events.endTurn).toHaveBeenCalledTimes(1);
  });
});

describe('endgame and player views', () => {
  test('does not declare defeat before the play phase starts', () => {
    const G = createG({
      deck: [2],
      players: createPlayers()
    });
    const ctx = createCtx({ phase: null });

    expect(gameConfig.endIf(G, ctx)).toBeNull();
  });

  test('declares victory when the deck and all hands are empty', () => {
    const G = createG({
      deck: [],
      players: createPlayers()
    });
    const ctx = createCtx({ numPlayers: 2, playOrder: ['0', '1'] });

    expect(gameConfig.endIf(G, ctx)).toMatchObject({ won: true, deckLength: 0 });
  });

  test('declares defeat when the current player cannot meet the required moves', () => {
    const G = createG({
      deck: [2],
      piles: [98, 97, 3, 4],
      players: createPlayers({ '0': [50] }),
      turnMovesMade: 0
    });
    const ctx = createCtx({ numPlayers: 1 });

    expect(gameConfig.endIf(G, ctx)).toMatchObject({ won: false });
  });

  test('declares defeat when a player has no cards but the deck still has cards', () => {
    const G = createG({
      deck: [2],
      players: createPlayers({ '0': [] }),
      turnMovesMade: 0
    });
    const ctx = createCtx({ numPlayers: 1 });

    expect(gameConfig.endIf(G, ctx)).toMatchObject({ won: false });
  });

  test('does not declare defeat when current player can pass after meeting the minimum and next player can move', () => {
    const G = createG({
      deck: [],
      piles: [98, 99, 3, 2],
      players: createPlayers({ '0': [50], '1': [99] }),
      turnMovesMade: 1
    });
    const ctx = createCtx({
      numPlayers: 2,
      playOrder: ['0', '1'],
      playOrderPos: 0
    });

    expect(gameConfig.endIf(G, ctx)).toBeNull();
  });

  test('redacts other players hands while preserving observer access', () => {
    const G = createG({
      players: createPlayers({ '0': [2, 3], '1': [90, 91] })
    });
    const ctx = createCtx({ numPlayers: 2, playOrder: ['0', '1'] });

    expect(gameConfig.playerView(G, ctx, '0').players).toEqual({
      '0': { hand: [2, 3] },
      '1': { hand: [null, null] },
      '2': { hand: [] },
      '3': { hand: [] },
      '4': { hand: [] }
    });
    expect(gameConfig.playerView(G, ctx, 'observer').players['1'].hand).toEqual([90, 91]);
  });
});

describe('boardgame.io reducer endgame integration', () => {
  const createReducerState = ({ G, ctx }) => {
    const state = InitializeGame({ game: gameConfig, numPlayers: ctx.numPlayers });
    return {
      state: {
        ...state,
        G,
        ctx: {
          ...state.ctx,
          ...ctx,
          phase: 'playCard',
          gameover: undefined
        }
      },
      reducer: CreateGameReducer({ game: gameConfig })
    };
  };

  test('initializes through draw into play without immediate gameover', () => {
    const state = InitializeGame({ game: gameConfig, numPlayers: 1 });

    expect(state.ctx.phase).toBe('playCard');
    expect(state.ctx.gameover).toBeUndefined();
    expect(state.G.deck).toHaveLength(90);
    expect(state.G.players['0'].hand).toHaveLength(8);
  });

  test('sets victory on the actual reducer path after the last card is played', () => {
    const { reducer, state } = createReducerState({
      G: {
        seed: 123,
        deck: [],
        piles: [1, 1, 100, 100],
        players: createPlayers({ '0': [2] }),
        turnMovesMade: 0,
        startingPlayerID: '0'
      },
      ctx: createCtx({ numPlayers: 1, turn: 1 })
    });

    const nextState = reducer(state, makeMove('PlayCard', [2, FIRST_UP]));

    expect(nextState.ctx.gameover).toMatchObject({ won: true, deckLength: 0 });
    expect(nextState.G.players['0'].hand).toEqual([]);
    expect(nextState.G.piles[0]).toBe(2);
  });

  test('keeps the reducer state unchanged when ending after one play while the deck has cards', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { reducer, state } = createReducerState({
      G: {
        seed: 123,
        deck: [50],
        piles: [1, 1, 100, 100],
        players: createPlayers({ '0': [2, 3] }),
        turnMovesMade: 0,
        startingPlayerID: '0'
      },
      ctx: createCtx({ numPlayers: 1, turn: 1 })
    });

    const afterOnePlay = reducer(state, makeMove('PlayCard', [2, FIRST_UP]));
    const afterInvalidEndTurn = reducer(afterOnePlay, makeMove('EndTurn'));

    expect(consoleError).toHaveBeenCalledWith('ERROR:', 'invalid move: EndTurn args: undefined');
    expect(afterInvalidEndTurn._stateID).toBe(afterOnePlay._stateID);
    expect(afterInvalidEndTurn.ctx.gameover).toBeUndefined();
    expect(afterInvalidEndTurn.G.turnMovesMade).toBe(1);
    expect(afterInvalidEndTurn.G.deck).toEqual([50]);
    consoleError.mockRestore();
  });

  test('sets defeat on the reducer path when turn passes to a player who cannot play', () => {
    const { reducer, state } = createReducerState({
      G: {
        seed: 123,
        deck: [],
        piles: [98, 99, 3, 2],
        players: createPlayers({ '0': [], '1': [50] }),
        turnMovesMade: 1,
        startingPlayerID: '0'
      },
      ctx: createCtx({
        numPlayers: 2,
        playOrder: ['0', '1'],
        playOrderPos: 0,
        currentPlayer: '0',
        turn: 5
      })
    });

    const nextState = reducer(state, makeMove('EndTurn'));

    expect(nextState.ctx.currentPlayer).toBe('1');
    expect(nextState.ctx.gameover).toMatchObject({ won: false, deckLength: 0 });
    expect(nextState.ctx.gameover.players['1'].hand).toEqual([50]);
  });
});

describe('board status rendering', () => {
  const renderBoard = (G) => {
    render(
      <TheGameBoard
        G={G}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0'],
          numPlayers: 1
        }}
        moves={{
          PlayCard: jest.fn(),
          EndTurn: jest.fn()
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }]}
        undo={jest.fn()}
      />
    );
  };

  test('shows the official required move count and disables end turn until it is met', () => {
    renderBoard(createG({
      deck: [2],
      players: createPlayers({ '0': [10, 30, 90] }),
      turnMovesMade: 1
    }));

    expect(screen.getByText(/2 cards while the deck has cards/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end turn/i })).toBeDisabled();
  });

  test('enables end turn when the required moves are met', () => {
    renderBoard(createG({
      deck: [2],
      players: createPlayers({ '0': [10, 30, 90] }),
      turnMovesMade: 2
    }));

    expect(screen.getByRole('button', { name: /end turn/i })).toBeEnabled();
  });

  test('shows player hand counts and keeps action buttons under the hand cards', () => {
    const { container } = render(
      <TheGameBoard
        G={createG({
          players: createPlayers({
            '0': [10, 30, 90],
            '1': [null, null, null, null]
          }),
          turnMovesMade: 2
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0', '1'],
          numPlayers: 2
        }}
        moves={{
          PlayCard: jest.fn(),
          EndTurn: jest.fn()
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }, { id: '1', name: 'Friend' }]}
        undo={jest.fn()}
      />
    );

    const playerOverview = screen.getByLabelText(/players and cards remaining/i);
    expect(playerOverview).toHaveTextContent(/you/i);
    expect(playerOverview).toHaveTextContent(/3 cards/i);
    expect(playerOverview).toHaveTextContent(/friend/i);
    expect(playerOverview).toHaveTextContent(/4 cards/i);

    const handContainer = container.querySelector('.hand-container');
    const cardsContainer = container.querySelector('.cards-container');
    const actionsContainer = container.querySelector('.actions-container');

    expect(handContainer).toContainElement(actionsContainer);
    expect(
      cardsContainer.compareDocumentPosition(actionsContainer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('highlights your hand only while it is your turn', () => {
    const boardProps = (currentPlayer) => ({
      G: createG({
        players: createPlayers({
          '0': [10, 30, 90],
          '1': [40, 41]
        }),
        turnMovesMade: 0
      }),
      ctx: {
        currentPlayer,
        playOrder: ['0', '1'],
        numPlayers: 2
      },
      moves: {
        PlayCard: jest.fn(),
        EndTurn: jest.fn()
      },
      events: { endTurn: jest.fn() },
      playerID: '0',
      matchData: [{ id: '0', name: 'You' }, { id: '1', name: 'Friend' }],
      undo: jest.fn()
    });

    const { container, rerender } = render(<TheGameBoard {...boardProps('0')} />);
    const getHandContainer = () => container.querySelector('.hand-container');

    expect(getHandContainer()).toHaveClass('active-hand-container');
    expect(container.querySelector('.hand-turn-badge')).toHaveTextContent(/your turn/i);

    rerender(<TheGameBoard {...boardProps('1')} />);

    expect(getHandContainer()).not.toHaveClass('active-hand-container');
    expect(container.querySelector('.hand-turn-badge')).toBeNull();
  });

  test('plays a selected hand card by tapping a valid pile', async () => {
    const user = userEvent.setup();
    const PlayCard = jest.fn();

    render(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90] }),
          turnMovesMade: 0
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0'],
          numPlayers: 1
        }}
        moves={{
          PlayCard,
          EndTurn: jest.fn()
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }]}
        undo={jest.fn()}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hand card 30/i }));
    });

    const targetPile = screen.getByRole('button', { name: /ascending pile a, current value 20/i });
    expect(screen.getByText(/your hand: 30 selected/i)).toBeInTheDocument();
    expect(targetPile).toHaveClass('valid-drop-target');

    await act(async () => {
      await user.click(targetPile);
    });

    expect(PlayCard).toHaveBeenCalledWith(30, FIRST_UP);
    expect(screen.queryByText(/your hand: 30 selected/i)).not.toBeInTheDocument();
  });

  test('shows a small error and does not play when a selected card is tapped onto an invalid pile', async () => {
    const user = userEvent.setup();
    const PlayCard = jest.fn();

    render(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [90] }),
          turnMovesMade: 0
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0'],
          numPlayers: 1
        }}
        moves={{
          PlayCard,
          EndTurn: jest.fn()
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }]}
        undo={jest.fn()}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hand card 90/i }));
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /descending pile b, current value 75/i }));
    });

    expect(PlayCard).not.toHaveBeenCalled();
    expect(screen.getByText(/invalid move/i)).toBeInTheDocument();
  });

  test('clears selected card when ending the turn', async () => {
    const user = userEvent.setup();
    const EndTurn = jest.fn();

    render(
      <TheGameBoard
        G={createG({
          deck: [2],
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90] }),
          turnMovesMade: 2
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0'],
          numPlayers: 1
        }}
        moves={{
          PlayCard: jest.fn(),
          EndTurn
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }]}
        undo={jest.fn()}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hand card 30/i }));
    });
    expect(screen.getByText(/your hand: 30 selected/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /end turn/i }));
    });

    expect(EndTurn).toHaveBeenCalled();
    expect(screen.queryByText(/your hand: 30 selected/i)).not.toBeInTheDocument();
  });

  test('clears selected card when the card leaves the visible hand', async () => {
    const user = userEvent.setup();
    const props = {
      ctx: {
        currentPlayer: '0',
        playOrder: ['0'],
        numPlayers: 1
      },
      moves: {
        PlayCard: jest.fn(),
        EndTurn: jest.fn()
      },
      events: { endTurn: jest.fn() },
      playerID: '0',
      matchData: [{ id: '0', name: 'You' }],
      undo: jest.fn()
    };
    const { rerender } = render(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90] }),
          turnMovesMade: 0
        })}
        {...props}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hand card 30/i }));
    });
    expect(screen.getByText(/your hand: 30 selected/i)).toBeInTheDocument();

    rerender(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 90] }),
          turnMovesMade: 1
        })}
        {...props}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/your hand: 30 selected/i)).not.toBeInTheDocument();
    });
  });

  test('clears selected card when the current player changes', async () => {
    const user = userEvent.setup();
    const sharedProps = {
      moves: {
        PlayCard: jest.fn(),
        EndTurn: jest.fn()
      },
      events: { endTurn: jest.fn() },
      playerID: '0',
      matchData: [{ id: '0', name: 'You' }, { id: '1', name: 'Player 2' }],
      undo: jest.fn()
    };
    const { rerender } = render(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90], '1': [40] }),
          turnMovesMade: 0
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0', '1'],
          numPlayers: 2
        }}
        {...sharedProps}
      />
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hand card 30/i }));
    });
    expect(screen.getByText(/your hand: 30 selected/i)).toBeInTheDocument();

    rerender(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90], '1': [40] }),
          turnMovesMade: 0
        })}
        ctx={{
          currentPlayer: '1',
          playOrder: ['0', '1'],
          numPlayers: 2
        }}
        {...sharedProps}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/your hand: 30 selected/i)).not.toBeInTheDocument();
    });
  });

  test('does not expose tap-to-play controls to non-current players or observers', async () => {
    const user = userEvent.setup();
    const PlayCard = jest.fn();
    const baseProps = {
      G: createG({
        piles: [20, 25, 80, 75],
        players: createPlayers({ '0': [10, 30, 90], '1': [30] }),
        turnMovesMade: 0
      }),
      ctx: {
        currentPlayer: '0',
        playOrder: ['0', '1'],
        numPlayers: 2
      },
      moves: {
        PlayCard,
        EndTurn: jest.fn()
      },
      events: { endTurn: jest.fn() },
      matchData: [{ id: '0', name: 'You' }, { id: '1', name: 'Player 2' }],
      undo: jest.fn()
    };
    const { rerender } = render(
      <TheGameBoard
        {...baseProps}
        playerID="1"
      />
    );

    expect(screen.queryByRole('button', { name: /hand card 30/i })).not.toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /ascending pile a, current value 20/i }));
    });
    expect(PlayCard).not.toHaveBeenCalled();

    rerender(
      <TheGameBoard
        {...baseProps}
        playerID="observer"
      />
    );

    expect(screen.queryByRole('button', { name: /hand card 30/i })).not.toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /ascending pile a, current value 20/i }));
    });
    expect(PlayCard).not.toHaveBeenCalled();
  });

  test('supports keyboard selection and pile activation', () => {
    const PlayCard = jest.fn();

    render(
      <TheGameBoard
        G={createG({
          piles: [20, 25, 80, 75],
          players: createPlayers({ '0': [10, 30, 90] }),
          turnMovesMade: 0
        })}
        ctx={{
          currentPlayer: '0',
          playOrder: ['0'],
          numPlayers: 1
        }}
        moves={{
          PlayCard,
          EndTurn: jest.fn()
        }}
        events={{ endTurn: jest.fn() }}
        playerID="0"
        matchData={[{ id: '0', name: 'You' }]}
        undo={jest.fn()}
      />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /hand card 30/i }), { key: 'Enter' });
    expect(screen.getByText(/your hand: 30 selected/i)).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('button', { name: /ascending pile a, current value 20/i }), { key: ' ' });
    expect(PlayCard).toHaveBeenCalledWith(30, FIRST_UP);
  });
});
