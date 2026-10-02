import { screen } from '@testing-library/react';
import { App } from '@/App';
import { renderWithQuery } from '@/test/render';

describe('App', () => {
  it('renders the page heading', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"data":[]}'));
    renderWithQuery(<App />);
    expect(screen.getByRole('heading', { name: 'Zerion demo' })).toBeInTheDocument();
  });
});
