import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('boardgame.io/react', () => ({
  Client: jest.fn(() => function MockGameClient(props) {
    return (
      <button
        type="button"
        onClick={() => props.onGameOver?.({
          won: false,
          numPlayers: 2,
          seed: 123,
          deckLength: 5,
          players: {
            '0': { hand: [2] }
          }
        })}
      >
        Trigger Game Over
      </button>
    );
  })
}));

jest.mock('boardgame.io/multiplayer', () => ({
  Local: jest.fn(() => ({}))
}));

jest.mock('@ant-design/icons', () => ({
  QuestionCircleOutlined: () => <span />
}));

jest.mock('antd', () => {
  const React = require('react');
  const Form = ({ children }) => <form>{children}</form>;
  Form.Item = ({ children, label }) => (
    <div>
      {label && <div>{label}</div>}
      {children}
    </div>
  );

  return {
    Button: ({ children, onClick, disabled }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Form,
    InputNumber: () => <input type="number" />,
    Switch: () => <input type="checkbox" />,
    Tooltip: ({ children }) => <>{children}</>,
    Card: ({ children }) => <div>{children}</div>,
    Typography: {
      Title: ({ children }) => <h3>{children}</h3>,
      Text: ({ children, strong }) => strong ? <strong>{children}</strong> : <span>{children}</span>
    }
  };
});

const BotTestApp = require('./BotTestApp').default;

test('returns from bot-test results to setup', async () => {
  const user = userEvent.setup();

  render(
    <BotTestApp
      initialGameResult={{
        won: false,
        numPlayers: 2,
        seed: 123,
        deckLength: 5,
        players: {
          '0': { hand: [2] }
        }
      }}
    />
  );

  expect(screen.getByText(/total cards left: 6/i)).toBeInTheDocument();

  await act(async () => {
    await user.click(screen.getByRole('button', { name: /back to setup/i }));
  });

  expect(screen.getByRole('heading', { name: /bot test mode/i })).toBeInTheDocument();
  expect(screen.queryByText(/total cards left/i)).not.toBeInTheDocument();
});
