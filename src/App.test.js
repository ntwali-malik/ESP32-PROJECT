import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the sensor dashboard', () => {
  render(<App />);
  expect(screen.getByText(/sensor overview/i)).toBeInTheDocument();
});
