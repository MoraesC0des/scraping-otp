import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Store } from './pages/Store';
import { loadDataset } from './dataLoader';
import { trackAppOpen } from './analytics';
import './index.css';

function App() {
  const dataset = loadDataset();

  useEffect(() => {
    void trackAppOpen();
  }, []);

  return (
    <>
      <div className="app-announce" role="region" aria-label="Créditos">
        <p className="app-announce-text">
          <span className="app-announce-label">Ideia desenvolvida pelos jogadores</span>
          <strong className="app-announce-name">“Respingosolda”</strong>
          <span className="app-announce-sep">e</span>
          <strong className="app-announce-name">“Baforatiner”</strong>
          <span className="app-announce-world">· Mundo Green</span>
        </p>
      </div>

      <div className="app">
        <header className="app-header">
          <h1>OTPokémon · Encontre seu time</h1>
          <p>Filtre por TM/MT, habilidades e prioridade de status e Consulte os Pokémon expecíficos.</p>
        </header>

      <main className="app-main">
        <Store dataset={dataset} />
      </main>

      <footer className="app-footer">
        <p className="footer-by">Desenvolvido por Gabriel Moraes</p>
        <nav className="footer-links" aria-label="Criador">
          <a
            href="https://www.linkedin.com/in/gabriel-moraes-61399b261/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <span className="footer-sep" aria-hidden="true">·</span>
          <a href="https://github.com/MoraesC0des" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </footer>
      </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);