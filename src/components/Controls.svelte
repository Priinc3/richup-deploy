<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let canRoll: boolean = false;
  export let canEndTurn: boolean = false;
  export let dice: [number, number] = [1, 1];
  export let isMyTurn: boolean = false;
  export let playerCash: number = 0;
</script>

<div class="controls-container">
  <div class="dice-display">
    <div class="die">{dice[0]}</div>
    <div class="die">{dice[1]}</div>
  </div>

  <div class="cash-display">
    ${playerCash.toLocaleString()}
  </div>

  <div class="action-buttons">
    <button
      class="btn-roll"
      disabled={!canRoll}
      on:click={() => dispatch('roll')}
    >
      🎲 Roll Dice
    </button>

    <button
      class="btn-end"
      disabled={!canEndTurn}
      on:click={() => dispatch('endTurn')}
    >
      End Turn →
    </button>
  </div>

  {#if isMyTurn}
    <div class="extra-actions">
      <button class="btn-trade" on:click={() => dispatch('trade')}>
        🤝 Trade
      </button>
      <button class="btn-bankrupt" on:click={() => dispatch('bankruptcy')}>
        💀 Bankrupt
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  .controls-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px;
  }

  .dice-display {
    display: flex; gap: 10px;

    .die {
      width: 48px; height: 48px;
      background: #ffffff;
      color: #111;
      border-radius: 10px;
      display: flex; justify-content: center; align-items: center;
      font-size: 1.4rem;
      font-weight: 800;
      border: 2px solid #e5e7eb;
      box-shadow: 0 3px 0 #d1d5db, 0 6px 12px rgba(0, 0, 0, 0.06);
    }
  }

  .cash-display {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--accent-green);
    font-variant-numeric: tabular-nums;
    padding: 4px 16px;
    background: rgba(5, 150, 105, 0.08);
    border-radius: 20px;
    border: 1px solid rgba(5, 150, 105, 0.15);
  }

  .action-buttons {
    display: flex; gap: 8px; width: 100%;

    button {
      flex: 1;
      padding: 12px 16px;
      border-radius: 10px;
      border: none;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; justify-content: center; align-items: center; gap: 6px;

      &:disabled { opacity: 0.4; cursor: not-allowed; }
      &:active:not(:disabled) { transform: translateY(1px); }
    }

    .btn-roll {
      background: #111;
      color: white;
      box-shadow: 0 2px 0 #000, 0 4px 12px rgba(0, 0, 0, 0.15);
      &:hover:not(:disabled) {
        background: #333;
        transform: translateY(-1px);
        box-shadow: 0 4px 0 #000, 0 8px 20px rgba(0, 0, 0, 0.2);
      }
    }

    .btn-end {
      background: #fafafa;
      color: var(--text-sec);
      border: 1px solid var(--border);
      &:hover:not(:disabled) {
        border-color: #111;
        color: #111;
        background: #fff;
      }
    }
  }

  .extra-actions {
    display: flex; gap: 6px; width: 100%;

    button {
      flex: 1;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-sec);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: var(--bg-surface); }
    }

    .btn-trade:hover { border-color: var(--accent-green); color: var(--accent-green); }
    .btn-bankrupt:hover { border-color: var(--accent-red); color: var(--accent-red); }
  }
</style>
