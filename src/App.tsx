import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './pages/Home';
import { Store } from './pages/Store';
import { loadDataset } from './dataLoader';
import { useSelection } from './hooks/useSelection';
import './index.css';

type Page = 'finder' | 'loja';

function App() {
  const dataset = loadDataset();
  const selection = useSelection(dataset);
  const [page, setPage] = useState<Page>('finder');

  return (
    <div className="app">
      <header className="app-header">
        <h1>OTPokémon TM/MT Finder</h1>
        <p>Descubra quais Pokémon aprendem cada TM/MT do OT Pokémon.</p>
        <nav className="app-nav" aria-label="Navegação">
          <button
            type="button"
            className={page === 'finder' ? 'nav-tab nav-tab-active' : 'nav-tab'}
            onClick={() => setPage('finder')}
          >
            Finder TM/MT
          </button>
          <button
            type="button"
            className={page === 'loja' ? 'nav-tab nav-tab-active' : 'nav-tab'}
            onClick={() => setPage('loja')}
          >
            Loja Pokémon
          </button>
        </nav>
      </header>

      <main className="app-main">
        {selection.notice && (
          <p className="notice" role="alert">{selection.notice}</p>
        )}
        {page === 'finder' ? (
          <Home dataset={dataset} selection={selection} />
        ) : (
          <Store dataset={dataset} selection={selection} />
        )}
      </main>

      <footer className="app-footer">
        Dados coletados da wiki oficial do OT Pokémon (1ª a 6ª geração) via{' '}
        <code>npm run scrape</code>.
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);