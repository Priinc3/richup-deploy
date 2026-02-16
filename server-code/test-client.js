const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('connected');
  // Create a game
  ws.send(JSON.stringify({ type: 'CREATE_GAME', payload: { playerName: 'Tester' } }));
});

ws.on('message', function incoming(data) {
  const msg = JSON.parse(data);
  console.log('received:', msg.type);

  if (msg.type === 'GAME_JOINED') {
    const gameId = msg.payload.gameId;
    console.log(`Joined game ${gameId}`);
    
    // Roll dice after joining
    setTimeout(() => {
      console.log('Rolling dice...');
      ws.send(JSON.stringify({ type: 'ROLL_DICE', payload: { gameId } }));
    }, 1000);
  }

  if (msg.type === 'GAME_UPDATE') {
    console.log('Game updated:', msg.payload.lastActionLog);
    ws.close();
  }
});
