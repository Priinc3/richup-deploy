import { createGame, rollDice, endTurn } from './game';
import { GameState } from './types';

// 1. Setup
console.log("🎮 Initializing RichUp Clone (Lite) Engine...");
const gameState = createGame(["Prince", "Lisa", "Bot1"]);

// 2. Simulate 5 Rounds
console.log("\n🎲 Starting Simulation: 5 Rounds\n");

for (let round = 1; round <= 5; round++) {
    console.log(`\n=== Round ${round} ===`);
    
    // Each player takes a turn
    gameState.turnOrder.forEach((pid) => {
        const player = gameState.players[pid];
        console.log(`> ${player.name}'s turn (Cash: $${player.cash}, Pos: ${player.position})`);
        
        // 1. Roll & Move
        const diceResult = rollDice(gameState);
        console.log(`  Rolled: ${diceResult.dice[0]} + ${diceResult.dice[1]}`);
        
        // 2. Log recent actions
        const lastAction = diceResult.lastActionLog.slice(-1)[0]; 
        console.log(`  Action: ${lastAction}`);

        // 3. End Turn
        endTurn(gameState);
    });
}

// 3. Final State
console.log("\n🏆 Final Standings:");
Object.values(gameState.players).sort((a, b) => b.cash - a.cash).forEach((p, i) => {
    console.log(`${i+1}. ${p.name} - $${p.cash} (Properties: ${p.properties.length})`);
});
