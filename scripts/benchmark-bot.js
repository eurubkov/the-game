#!/usr/bin/env node

require('ts-node/register/transpile-only');

const { performance } = require('perf_hooks');
const { Simulate } = require('boardgame.io/ai');
const { InitializeGame } = require('boardgame.io/internal');
const TheGame = require('../src/TheGame').default;
const CooperativeMCTSBot = require('../src/CooperativeMCTSBot').default;

const DEFAULT_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_PLAYER_COUNTS = [1, 2, 3, 5];
const DEFAULT_DEPTH = 400;

const parseNumberList = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const values = value.split(',')
    .map(item => Number(item.trim()))
    .filter(Number.isFinite);

  return values.length > 0 ? values : fallback;
};

const readOption = (name) => {
  const prefix = `--${name}=`;
  const option = process.argv.find(arg => arg.startsWith(prefix));
  return option ? option.slice(prefix.length) : undefined;
};

const getTotalCardsLeft = (G) => (
  G.deck.length + Object.values(G.players).reduce((sum, player) => (
    sum + player.hand.length
  ), 0)
);

const summarize = (results) => {
  const remainingCards = results.map(result => result.remainingCards).sort((a, b) => a - b);
  const total = results.reduce((sum, result) => sum + result.remainingCards, 0);

  return {
    games: results.length,
    average: total / results.length,
    median: remainingCards[Math.floor(remainingCards.length / 2)],
    best: remainingCards[0],
    worst: remainingCards[remainingCards.length - 1],
    wins: results.filter(result => result.won).length
  };
};

const runGame = async ({ numPlayers, seed, depth }) => {
  const game = { ...TheGame, seed: String(seed) };
  const state = InitializeGame({ game, numPlayers });
  const bot = new CooperativeMCTSBot({
    game,
    enumerate: game.ai.enumerate,
    seed: String(seed)
  });
  const startedAt = performance.now();
  const result = await Simulate({ game, bots: bot, state, depth });
  const elapsedMs = performance.now() - startedAt;

  return {
    numPlayers,
    seed,
    remainingCards: getTotalCardsLeft(result.state.G),
    won: Boolean(result.state.ctx.gameover?.won),
    elapsedMs
  };
};

const main = async () => {
  const seeds = parseNumberList(readOption('seeds'), DEFAULT_SEEDS);
  const playerCounts = parseNumberList(readOption('players'), DEFAULT_PLAYER_COUNTS);
  const depth = Number(readOption('depth')) || DEFAULT_DEPTH;
  const json = process.argv.includes('--json');
  const benchmark = [];

  for (const numPlayers of playerCounts) {
    const playerResults = [];
    const startedAt = performance.now();

    for (const seed of seeds) {
      const result = await runGame({ numPlayers, seed, depth });
      playerResults.push(result);

      if (!json) {
        const outcome = result.won ? ' win' : '';
        console.log(
          `${numPlayers}p seed ${seed}: ${result.remainingCards}${outcome} ` +
          `(${Math.round(result.elapsedMs)}ms)`
        );
      }
    }

    const summary = summarize(playerResults);
    const elapsedMs = performance.now() - startedAt;
    benchmark.push({
      numPlayers,
      seeds,
      depth,
      results: playerResults,
      summary: {
        ...summary,
        elapsedMs
      }
    });

    if (!json) {
      console.log(
        `SUMMARY ${numPlayers}p avg=${summary.average.toFixed(2)} ` +
        `median=${summary.median} best=${summary.best} worst=${summary.worst} ` +
        `wins=${summary.wins}/${summary.games} (${Math.round(elapsedMs)}ms)`
      );
    }
  }

  if (json) {
    console.log(JSON.stringify(benchmark, null, 2));
  }
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
