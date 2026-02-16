<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './components/Board.svelte';
  import Controls from './components/Controls.svelte';
  import PlayerList from './components/PlayerList.svelte';
  import Lobby from './components/Lobby.svelte';
  import PropertyStrip from './components/PropertyStrip.svelte';
  import { CITIES } from './data/cities';

  // --- Game State ---
  let socket: WebSocket;
  let gameId: string | null = null;
  let isConnected = false;
  let inLobby = true;
  let lastActionLog: string[] = [];
  let currentTurnAction: any = null;
  let gameState: any = null;
  
  let tiles = CITIES;
  let players: { id: string; name: string; pos: number; color: string; cash: number }[] = [];
  let currentPlayerId: string | null = null;
  
  let myPlayerName: string = '';
  let myPlayerId: string | null = null;

  // Error toast
  let errorMessage: string = '';
  let showError = false;
  let errorTimeout: any = null;

  function showErrorToast(msg: string) {
    errorMessage = msg;
    showError = true;
    if (errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => { showError = false; }, 4000);
  }

  // Modals
  let showBankruptConfirm = false;
  let showTradeModal = false;
  let tradeTarget: string = '';
  let tradeOfferProps: string[] = [];
  let tradeRequestProps: string[] = [];
  let tradeOfferCash: number = 0;
  let tradeRequestCash: number = 0;
  let pendingTrade: any = null;

  // Derived
  $: isActionBlocking = currentTurnAction?.type === 'BUY_PROMPT';
  $: isMyTurn = myPlayerId && currentPlayerId && myPlayerId === currentPlayerId;
  $: canRoll = isMyTurn && gameState?.state === 'waiting' && !isActionBlocking;
  $: canEndTurn = isMyTurn && gameState?.state === 'turn_ended' && !isActionBlocking;
  $: myProperties = tiles.filter(t => t.owner === myPlayerId);
  $: myCash = players.find(p => p.id === myPlayerId)?.cash || 0;
  $: otherPlayers = players.filter(p => p.id !== myPlayerId);
  $: allProperties = tiles.filter(t => ['street','station','utility'].includes(t.type) && t.owner);
  $: tradeTargetCash = players.find(p => p.id === tradeTarget)?.cash || 0;

  // Check for incoming trade offers
  $: {
    if (gameState?.tradeOffers) {
      const incoming = gameState.tradeOffers.find((t: any) => t.to === myPlayerId && t.status === 'pending');
      if (incoming && (!pendingTrade || pendingTrade.id !== incoming.id)) {
        pendingTrade = incoming;
      }
    }
  }

  // ── Session Persistence ──
  const SESSION_KEY = 'richup_session';

  function saveSession(gId: string, pId: string, pName: string) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId: gId, playerId: pId, playerName: pName }));
    } catch (e) { /* storage unavailable */ }
  }

  function loadSession(): { gameId: string; playerId: string; playerName: string } | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* */ }
  }

  // ── WebSocket Connection ──
  function connectWs(ip: string, port: string, onOpen: () => void) {
    // Force WS/WSS based on backend configuration, but allow override
    // Ideally, we want wss:// if on https://, but the backend is http://
    // So we must use ws:// and hope the browser allows it (it won't on Vercel)
    // UNLESS we use a tunnel or the user accepts the risk.
    // For now, let's hardcode the backend IP if not local.
    
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // socket = new WebSocket(`${protocol}//${ip}:${port}`);

    // HACK: Force WS for now to match the backend, but Vercel will block this.
    // The user needs to know this.
    // Actually, let's try to detect if we are on Vercel/HTTPS and warn.
    
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    
    // If we are on Vercel (https) and backend is IP (http), we need wss://IP (which needs cert)
    // OR we need to use a proxy.
    // For this specific request, I will hardcode the IP to the backend server.
    
    const backendIp = '13.235.96.171';
    const backendPort = '8080';
    
    // Use the hardcoded IP if we are not on localhost
    const targetIp = window.location.hostname === 'localhost' ? ip : backendIp;
    const targetPort = window.location.hostname === 'localhost' ? port : backendPort;
    
    socket = new WebSocket(`${protocol}//${targetIp}:${targetPort}`);

    socket.onopen = () => {
      isConnected = true;
      onOpen();
    };

    socket.onmessage = (event) => {
      try { handleServerMessage(JSON.parse(event.data)); }
      catch (e) { console.error('Error parsing message:', e); }
    };

    socket.onclose = () => {
      isConnected = false;
      const session = loadSession();
      if (session && !inLobby) {
        setTimeout(() => attemptReconnect(), 2000);
      }
    };
  }

  function connect(ip: string, port: string, options: { type: 'CREATE'|'JOIN', playerName: string, gameId?: string, settings?: any }) {
    myPlayerName = options.playerName;

    connectWs(ip, port, () => {
      inLobby = false;
      if (options.type === 'CREATE') {
        socket.send(JSON.stringify({ 
          type: 'CREATE_GAME', 
          payload: { 
            playerName: options.playerName,
            initialCash: options.settings?.initialCash,
            mapId: options.settings?.mapId
          } 
        }));
      } else {
        socket.send(JSON.stringify({ 
          type: 'JOIN_GAME', 
          payload: { 
            playerName: options.playerName,
            gameId: options.gameId
          } 
        }));
      }
    });
  }

  function attemptReconnect() {
    const session = loadSession();
    if (!session) return;

    const wsUrl = socket?.url;
    if (!wsUrl) return;

    const url = new URL(wsUrl);
    myPlayerName = session.playerName;

    connectWs(url.hostname, url.port, () => {
      inLobby = false;
      socket.send(JSON.stringify({
        type: 'RECONNECT',
        payload: { gameId: session.gameId, playerId: session.playerId }
      }));
    });
  }

  onMount(() => {
    const session = loadSession();
    if (session) {
      const defaultIp = window.location.hostname || 'localhost';
      const defaultPort = '8080';
      myPlayerName = session.playerName;

      connectWs(defaultIp, defaultPort, () => {
        inLobby = false;
        socket.send(JSON.stringify({
          type: 'RECONNECT',
          payload: { gameId: session.gameId, playerId: session.playerId }
        }));
      });
    }
  });

  function handleServerMessage(msg: any) {
    let state: any = null;

    if (msg.type === 'GAME_JOINED') {
        gameId = msg.payload.gameId;
        myPlayerId = msg.payload.playerId;
        state = msg.payload.state;
        saveSession(msg.payload.gameId, msg.payload.playerId, myPlayerName);
    } else if (msg.type === 'GAME_UPDATE') {
        state = msg.payload;
    } else if (msg.type === 'RECONNECT_FAILED') {
        console.warn('Reconnect failed:', msg.payload);
        clearSession();
        inLobby = true;
    } else if (msg.type === 'ERROR') {
        // ★ FIX: Show error in UI instead of just console
        showErrorToast(typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload));
    }

    if (state) {
      gameState = state;

      if (state.players) { 
          players = Object.values(state.players).map((p: any) => ({
            id: p.id,
            name: p.name,
            pos: p.position,
            color: p.color,
            cash: p.cash
          }));
          lastActionLog = state.lastActionLog ? state.lastActionLog.slice(-3) : [];
          currentTurnAction = state.currentTurnAction; 

          if (state.board) {
              // ★ FIX: Sync ALL relevant fields from server tiles, including upgradeCosts, rent, maxHouses
              tiles = tiles.map((staticTile, i) => {
                  const serverTile = state.board[i];
                  const ownerObj = serverTile?.owner ? players.find(p => p.id === serverTile.owner) : null;
                  return {
                      ...staticTile,
                      owner: serverTile?.owner,
                      ownerColor: ownerObj?.color,
                      houseCount: serverTile?.houseCount || 0,
                      mortgaged: serverTile?.mortgaged || false,
                      serverId: serverTile?.id,
                      // ★ Sync these fields so the client has correct data for display & actions
                      upgradeCosts: serverTile?.upgradeCosts || staticTile.upgradeCosts,
                      rent: serverTile?.rent || staticTile.rent,
                      maxHouses: serverTile?.maxHouses ?? staticTile.maxHouses ?? 5,
                      mortgageValue: serverTile?.mortgageValue ?? staticTile.mortgageValue,
                  };
              });
          }

          if (!myPlayerId && players.length > 0) {
              const me = players.find(p => p.name === myPlayerName);
              if (me) myPlayerId = me.id;
          }

          if (state.turnOrder && state.currentPlayerIndex !== undefined) {
              currentPlayerId = state.turnOrder[state.currentPlayerIndex];
          }
      }
    }
  }

  // ── Actions ──
  function rollDice() {
    if (!gameId) return;
    socket.send(JSON.stringify({ type: 'ROLL_DICE', payload: {} }));
  }

  function endTurn() {
    if (!gameId) return;
    socket.send(JSON.stringify({ type: 'END_TURN', payload: {} }));
  }

  function handleBuy(e: CustomEvent) {
    const confirm = e.detail;
    if (!gameId) return;
    socket.send(JSON.stringify({ type: 'BUY_PROPERTY', payload: { confirm } }));
    currentTurnAction = null; 
  }

  function handleDismiss() {
    currentTurnAction = null;
  }

  function onJoin(e: CustomEvent) {
      connect(e.detail.serverIp, e.detail.serverPort, e.detail);
  }

  // ── Upgrade / Mortgage ──
  function handleUpgrade(e: CustomEvent) {
    const tileId = e.detail;
    socket.send(JSON.stringify({ type: 'UPGRADE_HOUSE', payload: { tileId } }));
  }

  function handleMortgage(e: CustomEvent) {
    const tileId = e.detail;
    socket.send(JSON.stringify({ type: 'MORTGAGE_PROPERTY', payload: { tileId } }));
  }

  function handleUnmortgage(e: CustomEvent) {
    const tileId = e.detail;
    socket.send(JSON.stringify({ type: 'UNMORTGAGE_PROPERTY', payload: { tileId } }));
  }

  // ── Bankruptcy ──
  function handleBankruptcy() {
    showBankruptConfirm = true;
  }

  function confirmBankruptcy() {
    socket.send(JSON.stringify({ type: 'DECLARE_BANKRUPTCY', payload: {} }));
    showBankruptConfirm = false;
  }

  // ── Trade ──
  function openTradeModal() {
    if (otherPlayers.length === 0) return;
    tradeTarget = otherPlayers[0]?.id || '';
    tradeOfferProps = [];
    tradeRequestProps = [];
    tradeOfferCash = 0;
    tradeRequestCash = 0;
    showTradeModal = true;
  }

  function sendTrade() {
    socket.send(JSON.stringify({
      type: 'TRADE_OFFER',
      payload: {
        to: tradeTarget,
        offerProperties: tradeOfferProps,
        offerCash: tradeOfferCash,
        requestProperties: tradeRequestProps,
        requestCash: tradeRequestCash
      }
    }));
    showTradeModal = false;
  }

  function respondTrade(accept: boolean) {
    if (!pendingTrade) return;
    socket.send(JSON.stringify({
      type: 'TRADE_RESPOND',
      payload: { tradeId: pendingTrade.id, accept }
    }));
    pendingTrade = null;
  }

  function toggleProp(list: string[], tid: string): string[] {
    return list.includes(tid) ? list.filter(p => p !== tid) : [...list, tid];
  }
</script>

{#if inLobby}
   <Lobby on:join={onJoin} />
{:else}
<div class="app-layout">
  <aside class="sidebar">
      <PlayerList {players} {currentPlayerId} />
      <div class="server-status">
        {isConnected ? '● Connected' : '○ Offline'}
        {#if gameId}
          <div class="game-code-box">
             <div class="game-code-label">Game Code</div>
             <div class="game-code-value">{gameId}</div>
          </div>
        {/if}
        {#if isMyTurn}
          <div class="turn-badge">Your Turn</div>
        {/if}
      </div>
  </aside>

  <div class="center-stage">
      <main class="main-content">
          <Board 
            {tiles} 
            {players} 
            {currentTurnAction} 
            {lastActionLog} 
            {isConnected} 
            {gameId}
            isMyTurn={!!isMyTurn}
            on:buy={handleBuy}
            on:dismiss={handleDismiss}
          >
            <Controls 
                slot="controls"
                canRoll={canRoll} 
                canEndTurn={canEndTurn}
                dice={gameState?.dice || [1,1]}
                isMyTurn={!!isMyTurn}
                playerCash={myCash}
                on:roll={rollDice}
                on:endTurn={endTurn}
                on:trade={openTradeModal}
                on:bankruptcy={handleBankruptcy}
            />
          </Board>
      </main>
      
      <PropertyStrip 
        properties={myProperties} 
        on:upgrade={handleUpgrade}
        on:mortgage={handleMortgage}
        on:unmortgage={handleUnmortgage}
      />
  </div>
</div>

<!-- ══ Error Toast ══ -->
{#if showError}
  <div class="error-toast" on:click={() => showError = false}>
    <span class="error-icon">⚠️</span>
    <span class="error-text">{errorMessage}</span>
  </div>
{/if}

<!-- ══ Bankruptcy Confirmation ══ -->
{#if showBankruptConfirm}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={() => showBankruptConfirm = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-card bankrupt-modal" on:click|stopPropagation>
      <h3>💀 Declare Bankruptcy?</h3>
      <p>All your properties will be returned to the bank and you'll be removed from the game.</p>
      <p class="cash-display-info">Cash: <strong>${myCash.toLocaleString()}</strong> | Properties: <strong>{myProperties.length}</strong></p>
      <div class="modal-actions">
        <button class="btn-cancel" on:click={() => showBankruptConfirm = false}>Cancel</button>
        <button class="btn-danger" on:click={confirmBankruptcy}>Confirm Bankruptcy</button>
      </div>
    </div>
  </div>
{/if}

<!-- ══ Trade Modal ══ -->
{#if showTradeModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={() => showTradeModal = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-card trade-modal" on:click|stopPropagation>
      <h3>🤝 Create Trade</h3>
      
      <div class="trade-section">
        <label>Trade With:</label>
        <select bind:value={tradeTarget}>
          {#each otherPlayers as p}
            <option value={p.id}>{p.name} — ${p.cash.toLocaleString()}</option>
          {/each}
        </select>
      </div>

      <div class="trade-columns">
        <div class="trade-col">
          <div class="trade-col-header">
            <div class="trade-col-label">You Offer</div>
            <div class="trade-col-balance">Balance: ${myCash.toLocaleString()}</div>
          </div>
          <div class="prop-list">
            {#each myProperties as prop}
              <button
                class="prop-chip"
                class:selected={tradeOfferProps.includes(prop.serverId || `t${prop.id}`)}
                on:click={() => tradeOfferProps = toggleProp(tradeOfferProps, prop.serverId || `t${prop.id}`)}
              >
                {prop.flag || ''} {prop.name}
              </button>
            {/each}
          </div>
          <div class="cash-slider">
            <label>Cash: <strong>${tradeOfferCash}</strong></label>
            <input type="range" bind:value={tradeOfferCash} min="0" max={myCash} step="10">
          </div>
        </div>
        <div class="trade-divider">⇄</div>
        <div class="trade-col">
          <div class="trade-col-header">
            <div class="trade-col-label">You Request</div>
            <div class="trade-col-balance">Balance: ${tradeTargetCash.toLocaleString()}</div>
          </div>
          <div class="prop-list">
            {#each tiles.filter(t => t.owner === tradeTarget) as prop}
              <button
                class="prop-chip"
                class:selected={tradeRequestProps.includes(prop.serverId || `t${prop.id}`)}
                on:click={() => tradeRequestProps = toggleProp(tradeRequestProps, prop.serverId || `t${prop.id}`)}
              >
                {prop.flag || ''} {prop.name}
              </button>
            {/each}
          </div>
          <div class="cash-slider">
            <label>Cash: <strong>${tradeRequestCash}</strong></label>
            <input type="range" bind:value={tradeRequestCash} min="0" max={tradeTargetCash} step="10">
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn-cancel" on:click={() => showTradeModal = false}>Cancel</button>
        <button class="btn-primary" on:click={sendTrade}>Send Offer</button>
      </div>
    </div>
  </div>
{/if}

<!-- ══ Incoming Trade Offer ══ -->
{#if pendingTrade}
  <div class="modal-overlay">
    <div class="modal-card trade-modal">
      <h3>📨 Trade Offer</h3>
      <p><strong>{players.find(p => p.id === pendingTrade.from)?.name || 'Unknown'}</strong> wants to trade:</p>
      
      <div class="trade-columns">
        <div class="trade-col">
          <div class="trade-col-label">They Offer</div>
          {#each pendingTrade.offerProperties as tid}
            <div class="prop-chip">{tiles.find(t => (t.serverId || `t${t.id}`) === tid)?.name || tid}</div>
          {/each}
          {#if pendingTrade.offerCash > 0}
            <div class="prop-chip cash">${pendingTrade.offerCash}</div>
          {/if}
        </div>
        <div class="trade-divider">⇄</div>
        <div class="trade-col">
          <div class="trade-col-label">They Request</div>
          {#each pendingTrade.requestProperties as tid}
            <div class="prop-chip">{tiles.find(t => (t.serverId || `t${t.id}`) === tid)?.name || tid}</div>
          {/each}
          {#if pendingTrade.requestCash > 0}
            <div class="prop-chip cash">${pendingTrade.requestCash}</div>
          {/if}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-danger" on:click={() => respondTrade(false)}>Reject</button>
        <button class="btn-primary" on:click={() => respondTrade(true)}>Accept</button>
      </div>
    </div>
  </div>
{/if}
{/if}

<style lang="scss">
  .app-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #f5f5f7;
  }

  .sidebar {
      width: 220px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid #e5e7eb;
      background: #ffffff;
      z-index: 100;
      flex-shrink: 0;
  }

  .center-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      min-width: 0;
  }

  .main-content {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 10px;
      overflow: hidden;
      min-height: 0;
  }

  .server-status {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
  }

  .game-code-box {
      background: #fafafa;
      padding: 8px;
      margin: 8px 0;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
  }
  .game-code-label { font-size: 0.6rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .game-code-value { font-size: 1.2rem; font-weight: 800; letter-spacing: 3px; color: #111; }

  .turn-badge {
      margin-top: 8px;
      padding: 8px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.8rem;
      color: #059669;
      text-align: center;
      animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* ── Error Toast ── */
  .error-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
    max-width: 400px;

    .error-icon { font-size: 1.1rem; }
    .error-text { font-size: 0.85rem; color: #dc2626; font-weight: 500; }
  }

  @keyframes toastIn {
    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }

  /* ── Modal Styles ── */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.15s ease-out;
    padding: 20px;
  }

  .modal-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    max-width: 480px;
    width: 100%;
    color: #111;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease-out;

    h3 { margin: 0 0 12px; font-size: 1.15rem; font-weight: 800; }
    p { color: #6b7280; font-size: 0.85rem; margin: 6px 0; }
  }

  .cash-display-info {
    background: #fafafa;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem !important;
    color: #111 !important;
    border: 1px solid #e5e7eb;
  }

  .modal-actions {
    display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end;

    button {
      padding: 10px 20px;
      border-radius: 10px;
      border: none;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #fafafa; color: #6b7280; border: 1px solid #e5e7eb;
      &:hover { background: #f0f0f0; }
    }
    .btn-primary {
      background: #111; color: white; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      &:hover { background: #333; transform: translateY(-1px); }
    }
    .btn-danger {
      background: #dc2626; color: white;
      &:hover { background: #b91c1c; }
    }
  }

  /* ── Trade Modal ── */
  .trade-modal { max-width: 560px; }

  .trade-section {
    margin-bottom: 14px;
    label { display: block; font-size: 0.7rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #fafafa;
      color: #111;
      font-size: 0.85rem;
      &:focus { outline: none; border-color: #111; }
    }
  }

  .trade-columns {
    display: flex; gap: 8px; margin: 12px 0; align-items: flex-start;
  }

  .trade-col {
    flex: 1;
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 10px;
  }

  .trade-col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .trade-col-label {
    font-size: 0.65rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .trade-col-balance {
    font-size: 0.65rem;
    color: #059669;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .cash-slider {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #e5e7eb;

    label {
      display: block;
      font-size: 0.7rem;
      color: #6b7280;
      margin-bottom: 4px;
      strong { color: #111; }
    }

    input[type="range"] {
      width: 100%;
      accent-color: #111;
      height: 4px;
      cursor: pointer;
    }
  }

  .trade-divider {
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem; color: #d1d5db; padding-top: 20px;
  }

  .prop-list {
    display: flex; flex-wrap: wrap; gap: 4px;
    min-height: 30px;
  }

  .prop-chip {
    padding: 4px 8px;
    font-size: 0.7rem;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-weight: 500;

    &:hover { background: #f0f0f0; border-color: #d1d5db; }
    &.selected { background: #111; color: white; border-color: #111; }
    &.cash { background: #f0fdf4; border-color: #bbf7d0; color: #059669; font-weight: 700; }
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* ── Mobile Responsive ── */
  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      flex-direction: row;
      padding: 8px 12px;
      gap: 8px;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
      align-items: center;
      max-height: 80px;
      overflow-x: auto;

      :global(.player-list) {
        flex-direction: row;
        gap: 6px;
        flex: 1;
        overflow-x: auto;
      }
      :global(.list-header) {
        display: none;
      }
    }

    .server-status {
      border-top: none;
      padding: 0;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.7rem;
    }

    .game-code-box {
      margin: 0;
      padding: 4px 8px;
    }
    .game-code-label { display: none; }
    .game-code-value { font-size: 0.8rem; letter-spacing: 2px; }

    .turn-badge {
      margin: 0;
      padding: 4px 10px;
      font-size: 0.7rem;
    }

    .main-content {
      padding: 4px;
    }

    .trade-columns {
      flex-direction: column;
    }
    .trade-divider {
      padding: 4px 0;
      transform: rotate(90deg);
    }
  }
</style>
