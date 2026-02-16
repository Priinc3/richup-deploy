<script lang="ts">
  export let players: { id: string; name: string; cash: number; color: string }[] = [];
  export let currentPlayerId: string | null = null;
</script>

<div class="player-list">
  <div class="list-header">Players</div>
  {#each players as p}
    <div class="player-card" class:active={currentPlayerId === p.id} style="--p-color: {p.color}">
      <div class="avatar">
        <span class="initial">{p.name.charAt(0).toUpperCase()}</span>
      </div>
      <div class="info">
        <div class="name">{p.name} {#if currentPlayerId === p.id}<span class="turn-dot">●</span>{/if}</div>
        <div class="cash">${p.cash.toLocaleString()}</div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .player-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .list-header {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    font-weight: 600;
    padding: 0 4px 6px;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    transition: all 0.2s ease;

    &:hover {
        transform: translateX(2px);
        box-shadow: var(--shadow-sm);
    }

    &.active {
        background: #ffffff;
        border-color: var(--border-strong);
        box-shadow: var(--shadow-md);
    }
  }

  .avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: var(--p-color);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .initial {
    color: white;
    font-weight: 800;
    font-size: 0.85rem;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  .info {
    flex: 1;
    min-width: 0;
    .name {
      font-weight: 600; font-size: 0.85rem;
      color: var(--text-main);
      display: flex; align-items: center; gap: 6px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cash {
      font-weight: 700; color: var(--accent-green);
      font-size: 0.85rem; font-variant-numeric: tabular-nums;
    }
  }

  .turn-dot {
    color: var(--accent-green);
    font-size: 0.6rem;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
