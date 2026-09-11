# OTPokémon TM/MT Finder

Ferramenta para consultar quais **TMs** e **MTs** cada Pokémon pode aprender no
OT Pokémon (1ª a 6ª geração), com busca por Pokémon, seleção múltipla e
cálculo de **interseção** entre vários Pokémon.

Os dados são coletados da [wiki oficial do OT Pokémon](https://wiki.otponline.com)
por um scraper próprio e salvos em JSONs locais. **Não há backend**: a interface
filtra os dados inteiramente no cliente, carregando os JSONs estáticos.

## Como rodar

Requisitos: Node.js 18+ e npm.

```bash
npm install          # instala dependências
npm run dev          # abre o frontend em http://localhost:5173
```

Para o build de produção:

```bash
npm run build        # typecheck (tsc) + build (vite) -> dist/
npm run preview      # serve o build em http://localhost:4173
```

## Como atualizar os dados (scraper)

```bash
npm run scrape       # baixa e processa as páginas das 6 gerações + Pokémon
```

O scraper grava `data/pokemon.json`, `data/moves.json` e
`data/validation-report.json` e imprime um resumo (total de Pokémon, TMs, MTs,
erros de validação e checagem de exemplos como Bulbasaur/Charizard/Pikachu).
Arquivos HTML já baixados ficam em cache em `.scrape-cache/`, então as próximas
execuções são rápidas.

### Sobre o Cloudflare

A wiki está atrás de um desafio gerenciado (Cloudflare Turnstile). O scraper
resolve o desafio automaticamente abrindo o Chrome instalado na máquina
(`scrape - headless: false`) e reaproveita o cookie `cf_clearance` enquanto
válido (TTL de 20 minutos), salvando a sessão em `.scrape-cache/session.json`.
Depois disso, os downloads usam HTTP simples (rápido).

Se preferir executar em modo cabeça de papel:

```bash
SCRAPE_HEADLESS=1 npm run scrape
```

## Estrutura dos arquivos

```
scraper/
  index.ts        orquestração; grava os JSONs em data/
  generations.ts  páginas das 6 gerações + suportes (TM_System)
  parser.ts       extração do HTML (Cheerio)
  pokemon.ts      coleta de gerações + atribuição de ids
  moves.ts        agregação de TMs/MTs por pokémon
  validate.ts     validação cruzada com a lista canônica da wiki
  http.ts         fetch com bypass do Cloudflare + retry
  cache.ts        cache de HTML e sessão (cf_clearance)
  config.ts       constantes (URLs, delays, concorrência)
  types.ts        tipos compartilhados
data/             JSONs gerados (consumidos pelo frontend)
src/              frontend React + TypeScript + Vite
```

## Formato dos dados

`data/pokemon.json`:

```json
{
  "pokemon": [
    { "id": 1, "name": "Bulbasaur", "generation": 1, "slug": "Bulbasaur" }
  ]
}
```

`data/moves.json`:

```json
{
  "moves": [
    { "id": "TM06", "name": "Toxic", "type": "TM", "pokemonIds": [1, 2, 3] },
    { "id": "Synthesis", "name": "Synthesis", "type": "MT", "pokemonIds": [1, 2, 3] }
  ]
}
```

Observações:

- `id` de uma TM é o identificador da própria wiki (ex.: `TM06`).
- **A wiki não numera MTs** — um MT é identificado apenas pelo nome do golpe.
  Para não inventar números, o `id` de um MT é o **nome** do golpe
  (ex.: `Synthesis`). Texto exibido na interface reflete isso.
- `pokemonIds` referencia o campo `id` de `data/pokemon.json`.
- `Nidoran♀` (#029) e `Nidoran♂` (#032) compartilham a mesma página da wiki
  (`/Nidoran`); ambos são mantidos como Pokémon distintos com os mesmos moves.

`data/validation-report.json` contém problemas encontrados com severidade
`error`/`warning`/`info` (ex.: TMs que não são aprendidos por nenhum Pokémon das
gerações 1–6).

## Adicionar uma nova geração

1. Adicione a página da geração no `scraper/generations.ts` (no mesmo formato
   das existentes).
2. Rode `npm run scrape` — novos Pokémon aparecem em `data/`.
3. Rode `npm run build` e publique.

## URL compartilhável

A seleção atual fica na URL: `/pokemon?selected=charizard,blaziken,lucario`.
Cole o link em qualquer lugar para abrir a busca já preenchida.