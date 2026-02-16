<script lang="ts">
  import Tile from './Tile.svelte';

  export let tiles: any[] = [];
  export let players: any[] = [];
  export let currentTurnAction: any = null;
  export let lastActionLog: string[] = [];
  export let isConnected: boolean = false;
  export let gameId: string | null = null;
  export let isMyTurn: boolean = false;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function onBuy(confirm: boolean) { dispatch('buy', confirm); }
  function onDismiss() { dispatch('dismiss'); }

  // City detail popup state
  let selectedTile: any = null;

  function handleTileClick(e: CustomEvent) {
    selectedTile = e.detail;
  }

  function closeTileDetail() {
    selectedTile = null;
  }

  function getOwnerName(ownerId: string): string {
    const owner = players.find(p => p.id === ownerId);
    return owner ? owner.name : 'Unknown';
  }

  function getOwnerColor(ownerId: string): string {
    const owner = players.find(p => p.id === ownerId);
    return owner ? owner.color : '#888';
  }

  function getGridStyle(id: number) {
     return `
        grid-column: ${
          id >= 0 && id <= 10 ? 11 - id : 
          id >= 11 && id <= 19 ? 1 : 
          id >= 20 && id <= 30 ? id - 19 : 
          11
        }; 
        grid-row: ${
          id >= 0 && id <= 10 ? 11 : 
          id >= 11 && id <= 19 ? 21 - id : 
          id >= 20 && id <= 30 ? 1 : 
          id - 29
        };
     `;
  }
</script>

<div class="board">
  <div class="center-area">
    <div class="brand">
        <h1>RICHUP</h1>
        <div class="subtitle">GLOBAL EDITION</div>
        <div class="status-indicator" class:online={isConnected && gameId}>
            {isConnected ? (gameId ? '● LIVE' : '○ LOBBY') : '○ OFFLINE'}
        </div>
    </div>

    <!-- Buy / Rent Modals -->
    {#if isMyTurn && currentTurnAction?.type === 'BUY_PROMPT'}
      <div class="modal">
        <div class="modal-icon">{currentTurnAction.payload.flag || '🏠'}</div>
        <h3>Property Available</h3>
        <p class="prop-name">{currentTurnAction.payload.tileName}</p>
        {#if currentTurnAction.payload.country}
          <p class="prop-country">{currentTurnAction.payload.country}</p>
        {/if}
        <span class="price-tag">${currentTurnAction.payload.price}</span>
        <div class="modal-actions">
          <button class="btn-buy" on:click={() => onBuy(true)}>Purchase</button>
          <button class="btn-pass" on:click={() => onBuy(false)}>Pass</button>
        </div>
      </div>
    {:else if isMyTurn && currentTurnAction?.type === 'RENT_PAID'}
      <div class="modal rent-modal">
        <div class="modal-icon">💸</div>
        <h3>Rent Paid</h3>
        <p>You paid <span class="amount">${currentTurnAction.payload.amount}</span> to <strong>{currentTurnAction.payload.to}</strong></p>
        <button class="btn-dismiss" on:click={onDismiss}>OK</button>
      </div>
    {/if}

    <div class="controls-area">
        <slot name="controls"></slot>
    </div>

    <div class="logs">
      {#each lastActionLog as log, i}
        <div class="log-entry" style="animation-delay: {i * 0.05}s">{log}</div>
      {/each}
    </div>
  </div>

  {#each tiles as tile}
    <div class="board-tile" style="{getGridStyle(tile.id)}">
        <Tile {tile} players={players.filter(p => p.pos === tile.id)} on:tileClick={handleTileClick} />
    </div>
  {/each}
</div>

<!-- City Detail Overlay -->
{#if selectedTile}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="detail-overlay" on:click={closeTileDetail}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="detail-card" on:click|stopPropagation>
      <!-- Header -->
      <div class="detail-header" style="--h-color: {selectedTile.color || '#888'}">
        <span class="detail-flag">{selectedTile.flag || '🏢'}</span>
        <div class="detail-title">
          <h2>{selectedTile.name}</h2>
          {#if selectedTile.country}
            <span class="detail-country">{selectedTile.country}</span>
          {/if}
        </div>
        <button class="close-btn" on:click={closeTileDetail}>×</button>
      </div>

      <!-- Ownership -->
      <div class="detail-section">
        {#if selectedTile.owner}
          <div class="owner-row">
            <div class="owner-dot" style="background: {getOwnerColor(selectedTile.owner)};"></div>
            <span>Owned by <strong>{getOwnerName(selectedTile.owner)}</strong></span>
            {#if selectedTile.mortgaged}
              <span class="status-tag red">MORTGAGED</span>
            {/if}
          </div>
          {#if selectedTile.houseCount > 0}
            <div class="level-indicator">
              Level {selectedTile.houseCount}/{selectedTile.maxHouses || 5}
            </div>
          {/if}
        {:else}
          <span class="status-tag green">Available — ${selectedTile.price}</span>
        {/if}
      </div>

      <!-- Rent Table -->
      {#if selectedTile.rent && selectedTile.type === 'street'}
        <div class="detail-section">
          <div class="section-title">Rent by Level</div>
          <div class="data-rows">
            {#each selectedTile.rent as rentVal, lvl}
              <div class="data-row" class:active={lvl === (selectedTile.houseCount || 0) && selectedTile.owner}>
                <span class="row-label">
                  {#if lvl === 0}Base rent
                  {:else if lvl === 5}🏨 Hotel
                  {:else}Lv.{lvl} {'🏠'.repeat(Math.min(lvl, 4))}
                  {/if}
                </span>
                <span class="row-value">${rentVal}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Upgrade Costs -->
      {#if selectedTile.upgradeCosts && selectedTile.type === 'street'}
        <div class="detail-section">
          <div class="section-title">Upgrade Costs</div>
          <div class="data-rows">
            {#each selectedTile.upgradeCosts as cost, lvl}
              <div class="data-row" class:next={lvl === (selectedTile.houseCount || 0)}>
                <span class="row-label">→ Level {lvl + 1}</span>
                <span class="row-value">${cost}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Mortgage -->
      {#if selectedTile.mortgageValue}
        <div class="detail-section detail-footer">
          <span class="footer-label">Mortgage Value</span>
          <span class="footer-value">${selectedTile.mortgageValue}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .board {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    grid-template-rows: repeat(11, 1fr);
    width: min(88vmin, calc(100vh - 100px));
    height: min(88vmin, calc(100vh - 100px));
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    position: relative;
    padding: 2px;
    gap: 1px;
    flex-shrink: 0;
  }

  .board-tile {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: visible; /* Allow token overflow */
  }

  .center-area {
    grid-column: 2 / 11;
    grid-row: 2 / 11;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: 8px;
    z-index: 10;
    border: 1px solid #f0f0f0;
  }

  .brand {
    position: absolute;
    top: 15%;
    text-align: center;
    pointer-events: none;

    h1 {
      font-size: 3.5rem; font-weight: 900;
      letter-spacing: 8px; color: rgba(0, 0, 0, 0.04);
      user-select: none;
    }
    .subtitle {
      font-size: 0.6rem; letter-spacing: 5px;
      color: rgba(0, 0, 0, 0.03); font-weight: 600;
      margin-top: -4px;
    }
    .status-indicator {
      font-size: 0.7rem; color: #d1d5db; margin-top: 8px; letter-spacing: 2px;
      &.online { color: #059669; }
    }
  }

  .modal {
    background: #ffffff;
    padding: 28px 32px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04);
    border: 1px solid #e5e7eb;
    z-index: 50;
    text-align: center;
    min-width: 260px;
    animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

    .modal-icon { font-size: 2.5rem; margin-bottom: 8px; }
    h3 { color: #111; margin-bottom: 4px; font-size: 1.1rem; font-weight: 700; }
    .prop-name { font-size: 1rem; font-weight: 600; color: #374151; }
    .prop-country {
      font-size: 0.7rem; color: #9ca3af; margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .price-tag { display: block; font-size: 2rem; color: #059669; font-weight: 800; margin: 12px 0; }
    .amount { color: #dc2626; font-weight: 800; font-size: 1.3rem; }
  }

  .modal-actions {
    display: flex; gap: 10px; justify-content: center; margin-top: 16px;
    button {
      padding: 10px 24px; border-radius: 10px; border: none;
      font-weight: 700; font-size: 0.85rem; cursor: pointer;
      transition: all 0.2s ease;
      &.btn-buy {
        background: #111; color: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        &:hover { background: #333; transform: translateY(-1px); }
      }
      &.btn-pass {
        background: transparent; border: 1px solid #e5e7eb; color: #6b7280;
        &:hover { border-color: #dc2626; color: #dc2626; }
      }
    }
  }

  .btn-dismiss {
    margin-top: 16px; padding: 8px 28px; border-radius: 10px;
    border: 1px solid #e5e7eb; background: #fafafa;
    color: #111; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
    &:hover { background: #f0f0f0; }
  }

  .logs {
    position: absolute; bottom: 10px; width: 60%; text-align: center; pointer-events: none;
    .log-entry {
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: #d1d5db; font-size: 0.68rem;
      padding: 2px 0; animation: fadeInLog 0.3s ease-out both;
    }
  }

  /* ═══ Tile Detail Overlay ═══ */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.15s ease;
    padding: 20px;
  }

  .detail-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    width: 100%;
    max-width: 360px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
    animation: cardSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 3px solid var(--h-color);
    position: relative;

    .detail-flag { font-size: 1.8rem; }
    .detail-title {
      flex: 1;
      h2 { color: #111; font-size: 1.15rem; font-weight: 800; }
      .detail-country {
        font-size: 0.65rem; color: #9ca3af;
        text-transform: uppercase; letter-spacing: 1.5px;
      }
    }
    .close-btn {
      background: #f5f5f5; border: none; color: #6b7280;
      width: 28px; height: 28px; border-radius: 50%; font-size: 1.1rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      &:hover { background: #e5e7eb; color: #111; }
    }
  }

  .detail-section {
    padding: 12px 18px;
    border-bottom: 1px solid #f0f0f0;
  }

  .owner-row {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.85rem; color: #374151;
    .owner-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  }

  .level-indicator {
    margin-top: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #111;
    background: #f5f5f5;
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
  }

  .status-tag {
    font-size: 0.65rem; font-weight: 700; padding: 3px 8px;
    border-radius: 4px; letter-spacing: 0.5px;
    &.red { background: #fef2f2; color: #dc2626; }
    &.green { background: #f0fdf4; color: #059669; }
  }

  .section-title {
    font-size: 0.65rem; text-transform: uppercase;
    letter-spacing: 1px; color: #9ca3af;
    font-weight: 600; margin-bottom: 6px;
  }

  .data-rows { display: flex; flex-direction: column; gap: 1px; }

  .data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    transition: background 0.15s;

    &.active {
      background: #f0fdf4;
      .row-label, .row-value { color: #059669; font-weight: 700; }
    }
    &.next {
      background: #eff6ff;
      .row-label, .row-value { color: #2563eb; font-weight: 700; }
    }
  }

  .row-label { color: #6b7280; font-size: 0.78rem; }
  .row-value { color: #111; font-weight: 600; font-variant-numeric: tabular-nums; }

  .detail-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: none;
    .footer-label { color: #9ca3af; font-size: 0.8rem; }
    .footer-value { color: #111; font-weight: 700; font-size: 0.95rem; }
  }

  .controls-area {
    z-index: 20;
    position: relative;
  }

  @keyframes modalIn {
    from { transform: scale(0.92) translateY(16px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes fadeInLog {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cardSlideIn {
    from { transform: scale(0.9) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  @media (max-width: 768px) {
    .board {
      width: min(98vw, calc(100vh - 280px));
      height: min(98vw, calc(100vh - 280px));
      border-radius: 8px;
      padding: 1px;
    }
    .brand h1 { font-size: 1.8rem; }
  }
</style>
