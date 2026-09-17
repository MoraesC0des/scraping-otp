# OTPokémon · Loja Pokémon

Aplicação web para consultar os Pokémon do OT Pokémon (Mundo Green) e descobrir
quais **TMs**, **MTs** e **habilidades de campo** cada um possui, com filtros e
ordenação por status. Os dados são coletados da wiki do jogo por um **scraper
próprio**, validados e servidos como JSON estático — tudo processado e filtrado
no cliente, sem backend.

[🚀 Demo](https://scraping-otp.vercel.app/) · [GitHub](https://github.com/MoraesC0des/scraping-otp)

---

## Sobre o projeto

No OT Pokémon, cada Pokémon aprende TMs, MTs (Move Tutor) e habilidades de campo
(como *Flash*, *Cut* ou *Surf*) de formas diferentes. Descobrir quais Pokémon
satisfazem uma combinação específica de golpes exigia consultar a wiki página a
página — um processo lento e manual.

Esta aplicação resolve isso em duas etapas:

1. Um **scraper automatizado** coleta as páginas das 6 gerações e de cada
   Pokémon na wiki, extrai TMs/MTs, habilidades e status, e gera um dataset
   normalizado em JSON.
2. Uma **SPA em React** carrega esses JSONs e permite filtrar por TM/MT e
   habilidade, ordenar por prioridade de status e cruzar combinações com
   resposta instantânea — com dezenas de milhares de combinações calculadas no
   navegador.

O site está publicado e funcional: [scraping-otp.vercel.app](https://scraping-otp.vercel.app/).

## Funcionalidades

- **Filtro por TMs/MTs** com seleção múltipla — os golpes são adicionados por
  uma **busca por nome ou identificador** (ex.: `fire blast`, `TM38`) e a lista
  mostra apenas os Pokémon que aprendem todos os golpes selecionados.
- **Filtro por habilidades de campo** (Flash, Cut, Rock Smash, Surf, Ride, …),
  também com múltipla seleção, em chips alternáveis.
- **Ordenação por prioridade de status** — critérios encadeados (e removíveis)
  de HP, Attack, Defense, Sp. Attack, Sp. Defense, Speed e Total, em ordem
  crescente ou decrescente.
- **Cards de Pokémon** com sprite (com fallback para a inicial do nome), número
  e geração, status individuais em barras e total calculado.
- **Seleção de Pokémon ("Adicionar")** — cada card pode ser adicionado a uma
  lista, com o estado persistido na URL (ver a seguir).
- **URL compartilhável** — os Pokémon adicionados são serializados na URL
  (`/pokemon?selected=charizard,blaziken`), permitindo compartilhar um "time"
  pronto; os filtros de TM/MT e habilidade são estado interno da página e
  voltam ao padrão a cada recarregamento.
- **Analytics opcional** via Firebase (eventos de abertura, uso de filtro e
  seleção de Pokémon), com fallback silencioso.
- **Pipeline de dados automatizado** com validação cruzada e relatório de
  problemas — sem backend rodando em produção.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, CSS |
| Coleta/processamento | Node.js, `tsx`, Cheerio, puppeteer-core, `fetch` nativo |
| Infraestrutura | Vercel (hosting estático), Firebase Analytics |
| Dados | JSONs versionados em `data/` |

## Arquitetura

```
Wiki do OT Pokémon
        ↓  scraping com tratamento do Cloudflare
   Scraper (Node + tsx)
        ↓  parsing com Cheerio + validação cruzada
   Parser / Validação
        ↓  dataset normalizado
   data/pokemon.json · data/moves.json · data/validation-report.json
        ↓  importados na aplicação
   React + TypeScript (Vite SPA)
        ↓  deploy estático
   Vercel
```

O frontend **não consulta a wiki nem possui backend**: os JSONs gerados pelo
scraper são importados diretamente no bundle (`src/dataLoader.ts`) e todos os
filtros, ordenações e cálculos de interseção acontecem no cliente. Isso torna a
aplicação rápida, barata de hospedar e resiliente — se a wiki ficar fora do ar,
o site continua funcionando com a última coleta de dados.

## Recursos técnicos

- **Scraper resiliente**: suporte real a desafios do Cloudflare (Turnstile);
  Puppeteer conduz um navegador instalado para obter o cookie `cf_clearance` e
  as requisições seguintes reutilizam a sessão.
- **Cache local de HTML e sessão**: páginas baixadas são cacheadas em
  `.scrape-cache/` (nomeadas por hash SHA-1 da URL) e a sessão do Cloudflare
  tem TTL de 20 minutos — re-execuções são rápidas e não processam a wiki à toa.
- **Tratamento de falhas**: retries com backoff, concorrência limitada e delay
  mínimo entre requisições (configuráveis por variáveis de ambiente).
- **Validação dos dados**: cruzamento Pokémon ↔ TMs/MTs nos dois sentidos e
  comparação com a lista canônica da página *TM_System*, com relatório de
  problemas categorizados (`error`/`warning`/`info`) — nunca corrigidos em
  silêncio.
- **Frontend tipado de ponta a ponta**: tipos TypeScript compartilhados entre
  scraper e aplicação, com índices em memória para buscas O(1).
- **URL compartilhável**: seleção serializada em query params e atualizada via
  `history.replaceState`.
- **Deploy na Vercel** com `vercel.json` para fallback de SPA (rotas como
  `/pokemon` funcionam em recarregamentos diretos).
- **Firebase Analytics** com inicialização assíncrona, detecção de suporte no
  navegador e degradação silenciosa — a ausência das variáveis não quebra o app.

## Como executar localmente

Requisitos: Node.js 18+ e npm.

```bash
npm install    # instala as dependências
npm run dev    # abre o frontend em http://localhost:5173
```

Build de produção:

```bash
npm run build       # typecheck (tsc) + build (vite) → dist/
npm run preview     # serve o build em http://localhost:4173
npm run typecheck   # apenas validação de tipos
```

O Firebase Analytics é opcional; sem as variáveis de ambiente o app roda
normalmente, apenas sem telemetria (ver [Variáveis de ambiente](#variáveis-de-ambiente)).

## Como atualizar os dados

O dataset é gerado por um scraper próprio que roda fora do frontend:

```bash
npm run scrape
```

O fluxo completo:

1. Baixa as páginas das **6 gerações** → lista os Pokémon de cada uma e atribui
   os ids da Pokédex.
2. Baixa a **página individual de cada Pokémon** → extrai TMs, MTs, habilidades
   de campo e os multiplicadores de status.
3. Gera `data/pokemon.json` e `data/moves.json` (dataset normalizado).
4. Valida o dataset contra a página canônica *TM_System* e pelos dois sentidos
   (Pokémon ↔ golpes), gravando `data/validation-report.json` com um resumo
   final.

Na primeira execução, o scraper abre um navegador (Chrome/Edge instalados na
máquina) para resolver o desafio do Cloudflare e salvar a sessão. Depois disso,
as próximas execuções usam o cache de HTML e o cookie `cf_clearance` enquanto
válido. Para rodar em modo headless:

```bash
SCRAPE_HEADLESS=1 npm run scrape
```

Detalhes de comportamento já documentados nos dados gerados:

- `id` de um TM é o identificador da wiki (ex.: `TM06`).
- **A wiki não numera MTs** — o `id` de um MT é o **nome** do golpe (ex.:
  `Synthesis`), e a interface reflete isso.
- `Nidoran♀` (#029) e `Nidoran♂` (#032) compartilham a mesma página da wiki e
  são mantidos como Pokémon distintos com os mesmos golpes.
- Nem todos os Pokémon possuem seção de Status na wiki (44 registros, incluindo
  formas especiais); nesses casos o card exibe `—` e o Pokémon fica por último
  na ordenação por status.

## Variáveis de ambiente

Usadas apenas pelo **Firebase Analytics** (opcional). Copie `.env.example` para
`.env.local` e preencha com as credenciais do seu app web no Firebase Console:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

Nenhum valor real de credencial deve ser versionado (`.env*` está no
`.gitignore`).

## Estrutura do projeto

```
scraper/            pipeline de coleta e processamento de dados
  index.ts          orquestração; grava os JSONs em data/
  generations.ts    páginas das 6 gerações + página de apoio (TM_System)
  pokemon.ts        coleta das gerações + atribuição de ids
  moves.ts          extração de TMs/MTs por Pokémon
  parser.ts         parsing de HTML com Cheerio
  validate.ts       validação cruzada + lista canônica
  http.ts           fetch com replay do Cloudflare + retry
  cache.ts          cache de HTML e sessão (cf_clearance)
  config.ts         constantes (URLs, delays, concorrência, Chrome)
  utils.ts          helpers (logger, sleep, URLs)
  types.ts          tipos compartilhados do scraper
data/               JSONs gerados (consumidos pelo frontend)
  pokemon.json      721 Pokémon (1ª a 6ª geração)
  moves.json        113 TMs + 49 MTs
  validation-report.json
src/                frontend React + TypeScript + Vite
  dataLoader.ts     importa os JSONs e monta o Dataset
  App.tsx           entry point da SPA
  analytics.ts      inicialização do Firebase Analytics (isolada)
  components/       StoreToolbar, PokemonStoreCard, Sprite
  hooks/            useSelection (regras de compatibilidade + URL)
  pages/            Store (página da loja)
  utils/            compatibility, stats, sprites, abilities, urlState
  types.ts          tipos compartilhados do frontend
vercel.json         fallback de SPA no Vercel
vite.config.ts      configuração do Vite
```

## Decisões técnicas

- **Por que pré-processar em JSON em vez de consultar uma API?** Os dados da
  wiki são estáticos e mudam raramente. Coletá-los uma única vez, validá-los e
  versioná-los como JSON elimina qualquer backend em produção: a hospedagem é
  estática (rápida e praticamente grátis), o site funciona offline e não há
  dependência da disponibilidade da wiki no carregamento.
- **Por que filtrar no cliente?** Os JSONs cabem inteiros no bundle; os índices
  em memória (`compatibility.ts`) tornam qualquer combinação de filtros
  instantânea, sem latência de rede nem custo de servidor por usuário.
- **Por que separar scraper e frontend?** São duas responsabilidades com ciclos
  de vida diferentes: o scraper roda sob demanda (geralmente em máquina local,
  por envolver navegador real e cookies) e publica artefatos; o frontend é
  entregue como uma SPA comum. As duas pontas compartilham os mesmos tipos
  (`types.ts`), o que evita divergência de formato.

## Próximos passos

- Testes automatizados (unitários e de integração) para o parser, a validação e
  os filtros do frontend.
- Pipeline de CI que rode `npm run scrape` + `npm run build` automaticamente,
  com verificação do `validation-report.json`.
- Detalhes de aprendizado por Pokémon (ex.: modal com a lista completa de
  TMs/MTs daquele Pokémon).
- Internacionalização (EN/PT) e suporte a tema claro/escuro.