import { render, screen } from '@testing-library/react';
import App from './App';

test('renders The Game title', () => {
  render(<App />);
  const titleElement = screen.getByText(/The Game/i);
  expect(titleElement).toBeInTheDocument();
});
