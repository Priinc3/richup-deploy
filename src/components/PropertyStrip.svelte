<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let properties: any[] = [];

  function upgrade(tileId: string) {
    dispatch('upgrade', tileId);
  }
  function mortgage(tileId: string) {
    dispatch('mortgage', tileId);
  }
  function unmortgage(tileId: string) {
    dispatch('unmortgage', tileId);
  }
</script>

<div class="property-strip">
  {#if properties.length === 0}
    <div class="empty-state">No Properties Owned</div>
  {:else}
    <div class="strip-label">My Properties</div>
    <div class="cards-scroll">
      {#each properties as prop}
        <div
          class="mini-card"
          class:mortgaged={prop.mortgaged}
          style="--card-color: {prop.ownerColor || prop.color || '#888'}"
        >
          <div class="card-bar"></div>
          <div class="card-body">
            <div class="card-top">
              {#if prop.flag}<span class="card-flag">{prop.flag}</span>{/if}
              <span class="card-name">{prop.name}</span>
            </div>
            <div class="card-info">
              <span class="card-price">${prop.price}</span>
              {#if prop.houseCount > 0}
                <span class="card-level">Lv.{prop.houseCount}</span>
              {/if}
              {#if prop.mortgaged}
                <span class="card-mortgaged">M</span>
              {/if}
            </div>
            <div class="card-actions">
              {#if !prop.mortgaged && prop.type === 'street'}
                {@const nextCost = prop.upgradeCosts ? prop.upgradeCosts[prop.houseCount || 0] : prop.houseCost}
                <button class="btn-sm btn-upgrade" on:click={() => upgrade(prop.serverId || `t${prop.id}`)} title="Upgrade (${nextCost})">⬆</button>
              {/if}
              {#if !prop.mortgaged}
                <button class="btn-sm btn-mortgage" on:click={() => mortgage(prop.serverId || `t${prop.id}`)} title="Mortgage (${prop.mortgageValue})">📉</button>
              {:else}
                <button class="btn-sm btn-unmortgage" on:click={() => unmortgage(prop.serverId || `t${prop.id}`)} title="Unmortgage">📈</button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .property-strip {
    height: 85px;
    min-height: 85px;
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 8px;
    overflow: hidden;
  }

  .strip-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    font-weight: 600;
    writing-mode: vertical-rl;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty-state {
    width: 100%;
    text-align: center;
    font-size: 0.8rem;
    color: #d1d5db;
    font-weight: 500;
  }

  .cards-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    flex: 1;
    padding: 4px 0;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .mini-card {
    min-width: 110px;
    max-width: 130px;
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    flex-shrink: 0;
    overflow: hidden;
    transition: all 0.2s;
    scroll-snap-align: start;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);
    }

    &.mortgaged {
      opacity: 0.5;
      filter: grayscale(0.5);
    }
  }

  .card-bar {
    height: 3px;
    background: var(--card-color);
  }

  .card-body {
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .card-flag { font-size: 0.7rem; }
  .card-name { font-size: 0.65rem; font-weight: 700; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .card-info {
    display: flex;
    align-items: center;
    gap: 4px;

    .card-price { font-size: 0.6rem; color: #9ca3af; font-weight: 500; }
    .card-level {
      font-size: 0.55rem; font-weight: 800;
      background: #111; color: white;
      padding: 1px 4px; border-radius: 3px;
    }
    .card-mortgaged {
      font-size: 0.55rem; font-weight: 800;
      background: #dc2626; color: white;
      padding: 1px 4px; border-radius: 3px;
    }
  }

  .card-actions {
    display: flex;
    gap: 3px;
    margin-top: 2px;
  }

  .btn-sm {
    padding: 3px 6px;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    background: white;
    font-size: 0.55rem;
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1;

    &:hover {
      background: #f5f5f5;
      border-color: #d1d5db;
    }
  }

  .btn-upgrade:hover { border-color: #059669; background: #f0fdf4; }
  .btn-unmortgage:hover { border-color: #2563eb; background: #eff6ff; }

  @media (max-width: 768px) {
    .property-strip {
      height: 80px;
      min-height: 80px;
      padding: 0 8px;
    }
    .mini-card { min-width: 100px; }
  }
</style>
