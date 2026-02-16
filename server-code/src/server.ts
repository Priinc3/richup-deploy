import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  createGame, rollDice, endTurn, buyProperty,
  upgradeHouse, mortgageProperty, unmortgageProperty,
  declareBankruptcy, createTradeOffer, respondToTrade
} from './game';
import { GameState, PlayerId } from './types';

const PORT = process.env.PORT || 8080;

// ── State ──
const games: Record<string, GameState> = {};
const playerGameMap: Record<string, string> = {};   // connectionId → gameId
const playerIdMap: Record<string, string> = {};      // connectionId → playerId
const wsMap: Record<string, WebSocket> = {};         // connectionId → WebSocket
const disconnectTimers: Record<string, NodeJS.Timeout> = {}; // "gameId:playerId" → timer

const DISCONNECT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

const wss = new WebSocketServer({ port: Number(PORT) });
console.log(`🚀 RichUp Global Edition running on port ${PORT}`);

interface Message { type: string; payload: any; }

wss.on('connection', (ws: WebSocket) => {
  const connectionId = uuidv4();
  wsMap[connectionId] = ws;
  console.log(`[+] New connection: ${connectionId}`);

  send(ws, { type: 'WELCOME', payload: { id: connectionId } });

  ws.on('message', (data: string) => {
    try {
      const msg: Message = JSON.parse(data.toString());
      handleMessage(ws, connectionId, msg);
    } catch (e) {
      console.error('Invalid JSON:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[-] Disconnected: ${connectionId}`);
    const gid = playerGameMap[connectionId];
    const pid = playerIdMap[connectionId];

    if (gid && pid) {
      const key = `${gid}:${pid}`;
      console.log(`[!] Player ${pid} disconnected from ${gid}. Starting 2-min timer.`);

      // Start disconnect timer — auto-bankrupt after 2 minutes
      disconnectTimers[key] = setTimeout(() => {
        const game = games[gid];
        if (game && game.players[pid] && !game.players[pid].isBankrupt) {
          console.log(`[💀] Auto-bankrupting ${pid} (offline too long)`);
          game.lastActionLog.push(`⏰ ${game.players[pid].name} timed out (offline 2 min) — bankrupt!`);
          declareBankruptcy(game, pid);
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        }
        delete disconnectTimers[key];
      }, DISCONNECT_TIMEOUT_MS);
    }

    delete wsMap[connectionId];
  });
});

function handleMessage(ws: WebSocket, connectionId: string, msg: Message) {
  const gid = playerGameMap[connectionId];
  const game = gid ? games[gid] : null;
  const myPid = playerIdMap[connectionId];

  switch (msg.type) {
    // ── CREATE GAME ──
    case 'CREATE_GAME': {
      const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const initialCash = msg.payload.initialCash || 1500;
      const newGame = createGame([msg.payload.playerName || 'Host'], initialCash);
      games[gameId] = newGame;
      playerGameMap[connectionId] = gameId;
      playerIdMap[connectionId] = 'p1';
      console.log(`[+] Game Created: ${gameId} by ${msg.payload.playerName}`);
      joinGame(ws, gameId, newGame, 'p1');
      break;
    }

    // ── JOIN GAME ──
    case 'JOIN_GAME': {
      const targetGameId = (msg.payload.gameId || '').toUpperCase();
      const targetGame = games[targetGameId];
      if (targetGame) {
        const playerCount = Object.keys(targetGame.players).length;
        if (playerCount >= 8) {
          send(ws, { type: 'ERROR', payload: 'Game is full (max 8 players)' });
          break;
        }
        const newPid = `p${playerCount + 1}`;
        const newPlayer = {
          id: newPid,
          name: msg.payload.playerName || `Player ${playerCount + 1}`,
          color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFA500', '#800080'][playerCount % 8],
          cash: targetGame.players[targetGame.turnOrder[0]].cash,
          position: 0,
          jailTurns: 0,
          isBankrupt: false,
          properties: []
        };
        targetGame.players[newPid] = newPlayer;
        targetGame.turnOrder.push(newPid);
        playerGameMap[connectionId] = targetGameId;
        playerIdMap[connectionId] = newPid;
        console.log(`[+] Player ${newPlayer.name} joined ${targetGameId}`);
        joinGame(ws, targetGameId, targetGame, newPid);
        broadcast(targetGameId, { type: 'GAME_UPDATE', payload: targetGame });
      } else {
        send(ws, { type: 'ERROR', payload: 'Game Code not found!' });
      }
      break;
    }

    // ── RECONNECT ──
    case 'RECONNECT': {
      const rGameId = (msg.payload.gameId || '').toUpperCase();
      const rPlayerId = msg.payload.playerId;
      const rGame = games[rGameId];

      if (rGame && rGame.players[rPlayerId] && !rGame.players[rPlayerId].isBankrupt) {
        // Cancel disconnect timer
        const key = `${rGameId}:${rPlayerId}`;
        if (disconnectTimers[key]) {
          clearTimeout(disconnectTimers[key]);
          delete disconnectTimers[key];
          console.log(`[✓] Cancelled disconnect timer for ${rPlayerId}`);
        }

        // Re-map this new connection to the existing player
        playerGameMap[connectionId] = rGameId;
        playerIdMap[connectionId] = rPlayerId;
        wsMap[connectionId] = ws;

        console.log(`[↻] Player ${rPlayerId} reconnected to ${rGameId}`);
        rGame.lastActionLog.push(`🔄 ${rGame.players[rPlayerId].name} reconnected!`);

        joinGame(ws, rGameId, rGame, rPlayerId);
        broadcast(rGameId, { type: 'GAME_UPDATE', payload: rGame });
      } else {
        send(ws, { type: 'RECONNECT_FAILED', payload: 'Game not found or player bankrupt' });
      }
      break;
    }

    // ── ROLL DICE ──
    case 'ROLL_DICE': {
      if (game) {
        rollDice(game);
        broadcast(gid, { type: 'GAME_UPDATE', payload: game });
      }
      break;
    }

    // ── BUY / PASS PROPERTY ──
    case 'BUY_PROPERTY': {
      if (game && msg.payload.confirm) {
        const pid = game.turnOrder[game.currentPlayerIndex];
        const tid = game.board[game.players[pid].position].id;
        buyProperty(game, pid, tid);
        broadcast(gid, { type: 'GAME_UPDATE', payload: game });
      } else if (game && !msg.payload.confirm) {
        game.currentTurnAction = undefined;
        game.lastActionLog.push("Player declined to buy property.");
        if (game.dice[0] === game.dice[1] && game.dice[0] !== 0) {
          game.state = 'waiting';
        } else {
          game.state = 'turn_ended';
        }
        broadcast(gid, { type: 'GAME_UPDATE', payload: game });
      }
      break;
    }

    // ── UPGRADE HOUSE ──
    case 'UPGRADE_HOUSE': {
      if (game && myPid) {
        const result = upgradeHouse(game, myPid, msg.payload.tileId);
        if (result.success) {
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        } else {
          send(ws, { type: 'ERROR', payload: result.message });
        }
      }
      break;
    }

    // ── MORTGAGE ──
    case 'MORTGAGE_PROPERTY': {
      if (game && myPid) {
        const result = mortgageProperty(game, myPid, msg.payload.tileId);
        if (result.success) {
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        } else {
          send(ws, { type: 'ERROR', payload: result.message });
        }
      }
      break;
    }

    // ── UNMORTGAGE ──
    case 'UNMORTGAGE_PROPERTY': {
      if (game && myPid) {
        const result = unmortgageProperty(game, myPid, msg.payload.tileId);
        if (result.success) {
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        } else {
          send(ws, { type: 'ERROR', payload: result.message });
        }
      }
      break;
    }

    // ── BANKRUPTCY ──
    case 'DECLARE_BANKRUPTCY': {
      if (game && myPid) {
        declareBankruptcy(game, myPid);
        broadcast(gid, { type: 'GAME_UPDATE', payload: game });
      }
      break;
    }

    // ── TRADE OFFER ──
    case 'TRADE_OFFER': {
      if (game && myPid) {
        const { to, offerProperties, offerCash, requestProperties, requestCash } = msg.payload;
        const result = createTradeOffer(game, myPid, to, offerProperties || [], offerCash || 0, requestProperties || [], requestCash || 0);
        if (result.success) {
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        } else {
          send(ws, { type: 'ERROR', payload: result.message });
        }
      }
      break;
    }

    // ── TRADE RESPONSE ──
    case 'TRADE_RESPOND': {
      if (game && myPid) {
        const result = respondToTrade(game, myPid, msg.payload.tradeId, msg.payload.accept);
        if (result.success) {
          broadcast(gid, { type: 'GAME_UPDATE', payload: game });
        } else {
          send(ws, { type: 'ERROR', payload: result.message });
        }
      }
      break;
    }

    // ── END TURN ──
    case 'END_TURN': {
      if (game) {
        endTurn(game);
        broadcast(gid, { type: 'GAME_UPDATE', payload: game });
      }
      break;
    }
  }
}

function joinGame(ws: WebSocket, gameId: string, game: GameState, playerId: string) {
  send(ws, { type: 'GAME_JOINED', payload: { gameId, playerId, state: game } });
  console.log(`Player ${playerId} joined game ${gameId}`);
}

function send(ws: WebSocket, msg: Message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(gameId: string, msg: Message) {
  // Only send to connections that belong to this game
  for (const [connId, gid] of Object.entries(playerGameMap)) {
    if (gid === gameId && wsMap[connId]) {
      send(wsMap[connId], msg);
    }
  }
}
