<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let tile: {
    id: number; name: string; type: string;
    color?: string; price?: number;
    owner?: string; ownerColor?: string;
    country?: string; flag?: string;
    houseCount?: number; mortgaged?: boolean;
    baseRent?: number; rent?: number[];
    houseCost?: number; upgradeCosts?: number[];
    mortgageValue?: number; maxHouses?: number;
  };
  export let players: { id: string; name: string; pos: number; color: string; cash: number }[] = [];

  $: hasOwner = !!tile.owner;
  $: houses = tile.houseCount || 0;
  $: isMortgaged = tile.mortgaged || false;
  $: displayColor = tile.color || '#888';
  $: isPurchasable = ['street', 'station', 'utility'].includes(tile.type);

  function handleClick() {
    if (isPurchasable) {
      dispatch('tileClick', tile);
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="tile {tile.type}"
  class:mortgaged={isMortgaged}
  class:owned={hasOwner}
  class:clickable={isPurchasable}
  style="--tile-color: {displayColor}; --owner-color: {tile.ownerColor || 'transparent'}"
  on:click={handleClick}
>
  {#if isPurchasable}
    <div class="bar" class:owner-bar={hasOwner}></div>
  {/if}

  <div class="content">
    {#if tile.flag && tile.type === 'street'}
      <span class="flag">{tile.flag}</span>
    {/if}

    <span class="name">{tile.name}</span>

    {#if tile.price && isPurchasable}
      <span class="price">${tile.price}</span>
    {/if}

    {#if tile.type === 'start'} <span class="icon">🏁</span> {/if}
    {#if tile.type === 'jail'} <span class="icon">🔒</span> {/if}
    {#if tile.type === 'parking'} <span class="icon">🅿️</span> {/if}
    {#if tile.type === 'police'} <span class="icon">👮</span> {/if}
    {#if tile.type === 'chance'} <span class="icon">❓</span> {/if}
    {#if tile.type === 'chest'} <span class="icon">💎</span> {/if}
    {#if tile.type === 'tax'} <span class="icon">💸</span> {/if}
  </div>

  <!-- Level indicator -->
  {#if houses > 0}
    <div class="level-badge">
      {#if houses >= 5}
        🏨
      {:else}
        {houses}
      {/if}
    </div>
  {/if}

  <!-- Mortgage badge -->
  {#if isMortgaged}
    <div class="mortgage-badge">M</div>
  {/if}

  <!-- Player tokens — positioned HALF outside -->
  {#if players.length > 0}
    <div class="tokens">
      {#each players as p, i}
        <div
          class="token"
          style="background: {p.color}; --offset: {i * 4}px;"
          title="{p.name}"
        >
          <span class="token-letter">{p.name.charAt(0).toUpperCase()}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .tile {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: visible; /* CRITICAL: allow tokens to overflow */
    font-size: 0.55rem;
    color: #111;
    height: 100%;
    transition: transform 0.2s ease, box-shadow 0.2s ease, z-index 0.1s;
    border-radius: 3px;

    &:hover {
      z-index: 20;
      transform: scale(1.15);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }

    &.clickable { cursor: pointer; }

    &.owned {
      border-color: var(--owner-color);
      box-shadow: inset 0 0 0 1px var(--owner-color);
    }

    &.mortgaged {
      filter: grayscale(0.7) brightness(0.9);
      opacity: 0.5;
    }
  }

  .bar {
    height: 16%;
    min-height: 4px;
    background: var(--tile-color);
    transition: background 0.3s ease;

    &.owner-bar {
      background: var(--owner-color);
    }
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
    text-align: center;
    gap: 0px;
    position: relative;
    z-index: 1;
  }

  .flag { font-size: 0.65rem; line-height: 1; }
  .name {
    font-weight: 700; line-height: 1.1;
    letter-spacing: 0.1px; font-size: 0.5rem;
    color: #374151;
  }
  .price {
    font-weight: 500; font-size: 0.48rem;
    color: #9ca3af;
  }
  .icon { font-size: 1rem; }

  .level-badge {
    position: absolute;
    top: 1px; right: 1px;
    background: #111;
    color: white;
    font-size: 0.42rem;
    font-weight: 800;
    min-width: 12px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    padding: 0 2px;
    z-index: 5;
    line-height: 1;
  }

  .mortgage-badge {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: #dc2626;
    color: white;
    font-weight: 900;
    font-size: 0.6rem;
    padding: 2px 4px;
    border-radius: 3px;
    z-index: 6;
  }

  /* ═══ TOKENS: half inside, half outside ═══ */
  .tokens {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    z-index: 30;
  }

  .token {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    animation: tokenPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
  }

  .token-letter {
    font-size: 0.5rem;
    font-weight: 900;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    line-height: 1;
  }

  @keyframes tokenPop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
</style>
