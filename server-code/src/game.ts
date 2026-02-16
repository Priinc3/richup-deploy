import { GameState, Player, Tile, TradeOffer, PlayerId } from './types';
import { SERVER_CITIES } from './data/boardData';
import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════
// GAME CREATION
// ═══════════════════════════════════════════════

export function createGame(playerNames: string[], initialCash: number = 1500): GameState {
  const players: Record<PlayerId, Player> = {};
  const turnOrder: PlayerId[] = [];

  playerNames.forEach((name, index) => {
    const id = `p${index + 1}`;
    players[id] = {
      id, name,
      color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFA500', '#800080'][index],
      cash: initialCash,
      position: 0,
      jailTurns: 0,
      isBankrupt: false,
      properties: [],
    };
    turnOrder.push(id);
  });

  const board: Tile[] = SERVER_CITIES.map(tile => ({
    ...tile,
    type: tile.type as any,
    houseCount: 0,
    mortgaged: false,
    owner: undefined
  }));

  return {
    players, turnOrder,
    currentPlayerIndex: 0,
    dice: [0, 0],
    doublesCount: 0,
    board,
    state: 'waiting',
    lastActionLog: ['Game Created'],
    tradeOffers: [],
  };
}

// ═══════════════════════════════════════════════
// RENT CALCULATION
// ═══════════════════════════════════════════════

export function calculateRent(tile: Tile, board: Tile[], ownerStationCount?: number): number {
  if (tile.mortgaged) return 0;
  if (!tile.owner) return 0;

  if (tile.type === 'street') {
    const rentArr = tile.rent;
    if (rentArr && rentArr.length > tile.houseCount) {
      return rentArr[tile.houseCount];
    }
    // Fallback formula
    const baseRent = tile.baseRent || 0;
    return Math.floor(baseRent * (1 + 0.75 * tile.houseCount));
  }

  if (tile.type === 'station') {
    // Rent scales with number of stations owned
    const count = ownerStationCount || board.filter(t => t.type === 'station' && t.owner === tile.owner).length;
    return 25 * count; // 25, 50, 75, 100
  }

  if (tile.type === 'utility') {
    const count = board.filter(t => t.type === 'utility' && t.owner === tile.owner).length;
    return count === 1 ? 4 : 10; // Multiplied by dice roll in handleTileLanding
  }

  return 0;
}

// ═══════════════════════════════════════════════
// ROLL DICE
// ═══════════════════════════════════════════════

export function rollDice(game: GameState): GameState {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  game.dice = [die1, die2];
  const total = die1 + die2;
  const isDouble = die1 === die2;

  if (isDouble) {
    game.doublesCount++;
  } else {
    game.doublesCount = 0;
  }

  // Speeding — 3 doubles = jail
  if (game.doublesCount >= 3) {
    const pid = game.turnOrder[game.currentPlayerIndex];
    game.players[pid].jailTurns = 1;
    game.players[pid].position = 10;
    game.lastActionLog.push(`${game.players[pid].name} rolled 3 doubles → GO TO JAIL!`);
    endTurn(game);
    return game;
  }

  // Move
  const newState = movePlayer(game, total);

  // If not acting (buy prompt), check doubles
  if (newState.state !== 'acting') {
    if (isDouble) {
      newState.state = 'waiting';
      newState.lastActionLog.push("Doubles! Roll again.");
    } else {
      newState.state = 'turn_ended';
    }
  }

  return newState;
}

// ═══════════════════════════════════════════════
// MOVE PLAYER
// ═══════════════════════════════════════════════

function movePlayer(game: GameState, steps: number): GameState {
  const pid = game.turnOrder[game.currentPlayerIndex];
  const player = game.players[pid];
  const oldPos = player.position;
  let newPos = oldPos + steps;

  // Pass GO
  if (newPos >= 40) {
    newPos -= 40;
    player.cash += 200;
    game.lastActionLog.push(`${player.name} passed GO! (+$200)`);
  }

  player.position = newPos;
  game.lastActionLog.push(`${player.name} moved to tile ${newPos}`);

  return handleTileLanding(game, newPos);
}

// ═══════════════════════════════════════════════
// TILE LANDING
// ═══════════════════════════════════════════════

function handleTileLanding(game: GameState, pos: number): GameState {
  const tile = game.board[pos];
  const pid = game.turnOrder[game.currentPlayerIndex];
  const player = game.players[pid];

  game.currentTurnAction = undefined;

  // --- Go To Jail ---
  if (tile.type === 'police') {
    player.position = 10;
    player.jailTurns = 1;
    game.lastActionLog.push(`${player.name} → Go To Jail!`);
    return game;
  }

  // --- Tax ---
  if (tile.type === 'tax') {
    const tax = tile.price || 0;
    player.cash -= tax;
    game.lastActionLog.push(`${player.name} paid $${tax} tax`);
    game.currentTurnAction = { type: 'RENT_PAID', payload: { amount: tax, to: 'Tax' } };
    checkAutoBankruptcy(game, pid);
    return game;
  }

  // --- Purchasable Properties ---
  if (['street', 'station', 'utility'].includes(tile.type)) {
    if (!tile.owner) {
      // Offer to buy
      if (player.cash >= (tile.price || 0)) {
        game.currentTurnAction = {
          type: 'BUY_PROMPT',
          payload: { tileId: tile.id, tileName: tile.name, price: tile.price, country: tile.country, flag: tile.flag }
        };
        game.state = 'acting';
      }
    } else if (tile.owner !== pid) {
      // Pay Rent
      let rent = calculateRent(tile, game.board);

      // Utility special: rent = multiplier × dice total
      if (tile.type === 'utility') {
        const diceTotal = game.dice[0] + game.dice[1];
        rent = rent * diceTotal;
      }

      if (rent > 0) {
        player.cash -= rent;
        game.players[tile.owner].cash += rent;
        game.currentTurnAction = {
          type: 'RENT_PAID',
          payload: { amount: rent, to: game.players[tile.owner].name }
        };
        game.lastActionLog.push(`${player.name} paid $${rent} rent to ${game.players[tile.owner].name}`);
        checkAutoBankruptcy(game, pid);
      }
    }
  }

  return game;
}

// ═══════════════════════════════════════════════
// BUY PROPERTY
// ═══════════════════════════════════════════════

export function buyProperty(game: GameState, pid: PlayerId, tid: string): GameState {
  const tile = game.board.find(t => t.id === tid);
  if (!tile || tile.owner || tile.price === undefined) return game;

  if (game.players[pid].cash >= tile.price) {
    game.players[pid].cash -= tile.price;
    game.players[pid].properties.push(tid);
    tile.owner = pid;
    game.lastActionLog.push(`${game.players[pid].name} bought ${tile.name} for $${tile.price}`);
  }

  game.currentTurnAction = undefined;

  // Doubles → roll again, else end turn
  if (game.dice[0] === game.dice[1] && game.dice[0] !== 0) {
    game.state = 'waiting';
    game.lastActionLog.push("Doubles! Roll again.");
  } else {
    game.state = 'turn_ended';
  }

  return game;
}

// ═══════════════════════════════════════════════
// UPGRADE HOUSE
// ═══════════════════════════════════════════════

export function upgradeHouse(game: GameState, pid: PlayerId, tileId: string): { success: boolean; message: string } {
  const tile = game.board.find(t => t.id === tileId);
  if (!tile) return { success: false, message: 'Tile not found' };
  if (tile.type !== 'street') return { success: false, message: 'Can only upgrade streets' };
  if (tile.owner !== pid) return { success: false, message: 'You don\'t own this property' };
  if (tile.mortgaged) return { success: false, message: 'Property is mortgaged' };
  if (tile.houseCount >= (tile.maxHouses || 5)) return { success: false, message: 'Max level reached' };

  // Check full country ownership
  if (!ownsFullCountry(game, pid, tile.country!)) {
    return { success: false, message: `You must own all cities in ${tile.country} to build` };
  }

  // Escalating cost per level
  const upgradeCosts = tile.upgradeCosts;
  const cost = upgradeCosts ? upgradeCosts[tile.houseCount] : (tile.houseCost || 0);
  if (game.players[pid].cash < cost) return { success: false, message: `Not enough cash ($${cost} needed)` };

  game.players[pid].cash -= cost;
  tile.houseCount++;
  game.lastActionLog.push(`${game.players[pid].name} upgraded ${tile.name} to Lv.${tile.houseCount} ($${cost})`);

  return { success: true, message: `${tile.name} upgraded to Level ${tile.houseCount}/${tile.maxHouses}` };
}

// ═══════════════════════════════════════════════
// MORTGAGE / UNMORTGAGE
// ═══════════════════════════════════════════════

export function mortgageProperty(game: GameState, pid: PlayerId, tileId: string): { success: boolean; message: string } {
  const tile = game.board.find(t => t.id === tileId);
  if (!tile) return { success: false, message: 'Tile not found' };
  if (tile.owner !== pid) return { success: false, message: 'You don\'t own this property' };
  if (tile.mortgaged) return { success: false, message: 'Already mortgaged' };

  // Remove all houses first
  if (tile.houseCount > 0) {
    const refund = Math.floor((tile.houseCost || 0) * tile.houseCount * 0.5);
    game.players[pid].cash += refund;
    game.lastActionLog.push(`Removed ${tile.houseCount} houses from ${tile.name} (refund $${refund})`);
    tile.houseCount = 0;
  }

  tile.mortgaged = true;
  const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
  game.players[pid].cash += mortgageValue;
  game.lastActionLog.push(`${game.players[pid].name} mortgaged ${tile.name} for $${mortgageValue}`);

  return { success: true, message: `Mortgaged ${tile.name} for $${mortgageValue}` };
}

export function unmortgageProperty(game: GameState, pid: PlayerId, tileId: string): { success: boolean; message: string } {
  const tile = game.board.find(t => t.id === tileId);
  if (!tile) return { success: false, message: 'Tile not found' };
  if (tile.owner !== pid) return { success: false, message: 'You don\'t own this property' };
  if (!tile.mortgaged) return { success: false, message: 'Not mortgaged' };

  const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
  const costToUnmortgage = Math.floor(mortgageValue * 1.10); // +10% interest
  if (game.players[pid].cash < costToUnmortgage) {
    return { success: false, message: `Need $${costToUnmortgage} to unmortgage` };
  }

  game.players[pid].cash -= costToUnmortgage;
  tile.mortgaged = false;
  game.lastActionLog.push(`${game.players[pid].name} unmortgaged ${tile.name} ($${costToUnmortgage})`);

  return { success: true, message: `Unmortgaged ${tile.name}` };
}

// ═══════════════════════════════════════════════
// BANKRUPTCY
// ═══════════════════════════════════════════════

export function declareBankruptcy(game: GameState, pid: PlayerId): GameState {
  const player = game.players[pid];
  player.isBankrupt = true;
  player.cash = 0;

  // Free all properties
  game.board.forEach(tile => {
    if (tile.owner === pid) {
      tile.owner = undefined;
      tile.houseCount = 0;
      tile.mortgaged = false;
    }
  });
  player.properties = [];

  // Remove from turn order
  const orderIdx = game.turnOrder.indexOf(pid);
  if (orderIdx !== -1) {
    // Adjust current index if needed
    if (orderIdx < game.currentPlayerIndex) {
      game.currentPlayerIndex--;
    } else if (orderIdx === game.currentPlayerIndex) {
      // It's their turn, skip
      if (game.currentPlayerIndex >= game.turnOrder.length - 1) {
        game.currentPlayerIndex = 0;
      }
    }
    game.turnOrder.splice(orderIdx, 1);
  }

  game.lastActionLog.push(`💀 ${player.name} declared bankruptcy!`);

  // Check if game is over (1 player left)
  const activePlayers = game.turnOrder.filter(id => !game.players[id].isBankrupt);
  if (activePlayers.length <= 1) {
    game.state = 'ended';
    if (activePlayers.length === 1) {
      game.lastActionLog.push(`🏆 ${game.players[activePlayers[0]].name} WINS!`);
    }
  } else {
    game.state = 'waiting';
    game.currentTurnAction = undefined;
  }

  return game;
}

function checkAutoBankruptcy(game: GameState, pid: PlayerId) {
  if (game.players[pid].cash < 0) {
    // Check if they can mortgage anything
    const mortgageable = game.board.filter(t => t.owner === pid && !t.mortgaged);
    if (mortgageable.length === 0) {
      declareBankruptcy(game, pid);
    }
    // Otherwise, they need to mortgage or declare bankruptcy manually
  }
}

// ═══════════════════════════════════════════════
// TRADING
// ═══════════════════════════════════════════════

export function createTradeOffer(game: GameState, from: PlayerId, to: PlayerId,
  offerProps: string[], offerCash: number, requestProps: string[], requestCash: number
): { success: boolean; message: string } {
  // Validate ownership
  for (const tid of offerProps) {
    const tile = game.board.find(t => t.id === tid);
    if (!tile || tile.owner !== from) return { success: false, message: `You don't own ${tid}` };
  }
  for (const tid of requestProps) {
    const tile = game.board.find(t => t.id === tid);
    if (!tile || tile.owner !== to) return { success: false, message: `They don't own ${tid}` };
  }

  if (offerCash > game.players[from].cash) return { success: false, message: 'Not enough cash' };

  const trade: TradeOffer = {
    id: uuidv4(),
    from, to,
    offerProperties: offerProps,
    offerCash,
    requestProperties: requestProps,
    requestCash,
    status: 'pending'
  };

  game.tradeOffers.push(trade);
  game.lastActionLog.push(`${game.players[from].name} sent a trade offer to ${game.players[to].name}`);

  return { success: true, message: `Trade offer sent (ID: ${trade.id})` };
}

export function respondToTrade(game: GameState, pid: PlayerId, tradeId: string, accept: boolean): { success: boolean; message: string } {
  const trade = game.tradeOffers.find(t => t.id === tradeId);
  if (!trade) return { success: false, message: 'Trade not found' };
  if (trade.to !== pid) return { success: false, message: 'Not your trade to respond to' };
  if (trade.status !== 'pending') return { success: false, message: 'Trade already resolved' };

  if (!accept) {
    trade.status = 'rejected';
    game.lastActionLog.push(`${game.players[pid].name} rejected the trade`);
    return { success: true, message: 'Trade rejected' };
  }

  // Validate cash
  if (trade.requestCash > game.players[pid].cash) {
    return { success: false, message: 'Not enough cash to accept' };
  }

  // Execute trade
  const fromPlayer = game.players[trade.from];
  const toPlayer = game.players[trade.to];

  // Transfer properties from → to
  for (const tid of trade.offerProperties) {
    const tile = game.board.find(t => t.id === tid);
    if (tile) {
      tile.owner = trade.to;
      tile.houseCount = 0; // Reset houses on trade
      fromPlayer.properties = fromPlayer.properties.filter(p => p !== tid);
      toPlayer.properties.push(tid);
    }
  }

  // Transfer properties to → from
  for (const tid of trade.requestProperties) {
    const tile = game.board.find(t => t.id === tid);
    if (tile) {
      tile.owner = trade.from;
      tile.houseCount = 0;
      toPlayer.properties = toPlayer.properties.filter(p => p !== tid);
      fromPlayer.properties.push(tid);
    }
  }

  // Transfer cash
  fromPlayer.cash -= trade.offerCash;
  fromPlayer.cash += trade.requestCash;
  toPlayer.cash += trade.offerCash;
  toPlayer.cash -= trade.requestCash;

  trade.status = 'accepted';
  game.lastActionLog.push(`Trade accepted! ${fromPlayer.name} ↔ ${toPlayer.name}`);

  return { success: true, message: 'Trade completed!' };
}

// ═══════════════════════════════════════════════
// END TURN
// ═══════════════════════════════════════════════

export function endTurn(game: GameState): GameState {
  // Skip bankrupt players
  let next = (game.currentPlayerIndex + 1) % game.turnOrder.length;
  let safety = 0;
  while (game.players[game.turnOrder[next]]?.isBankrupt && safety < game.turnOrder.length) {
    next = (next + 1) % game.turnOrder.length;
    safety++;
  }
  game.currentPlayerIndex = next;
  game.lastActionLog.push(`--- Next Turn: ${game.players[game.turnOrder[next]].name} ---`);
  game.currentTurnAction = undefined;
  game.state = 'waiting';
  game.doublesCount = 0;
  return game;
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

export function ownsFullCountry(game: GameState, pid: PlayerId, country: string): boolean {
  const countryTiles = game.board.filter(t => t.country === country);
  return countryTiles.length > 0 && countryTiles.every(t => t.owner === pid);
}

export function getPlayerCountryStatus(game: GameState, pid: PlayerId): Record<string, { owned: number; total: number; complete: boolean }> {
  const countries: Record<string, { owned: number; total: number; complete: boolean }> = {};
  game.board.forEach(tile => {
    if (tile.country) {
      if (!countries[tile.country]) countries[tile.country] = { owned: 0, total: 0, complete: false };
      countries[tile.country].total++;
      if (tile.owner === pid) countries[tile.country].owned++;
    }
  });
  Object.keys(countries).forEach(c => {
    countries[c].complete = countries[c].owned === countries[c].total;
  });
  return countries;
}
