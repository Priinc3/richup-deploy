<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  let playerName = '';
  let serverIp = 'localhost'; 
  let serverPort = '8080';
  let activeTab: 'host' | 'join' = 'join';
  let gameCode = '';
  let initialCash = 1500;
  let mapId = 'default';

  onMount(() => {
      const savedName = localStorage.getItem('richup_player_name');
      const savedIp = localStorage.getItem('richup_server_ip');
      if (savedName) playerName = savedName;
      if (savedIp) serverIp = savedIp;
      else serverIp = window.location.hostname;
  });

  function handleAction() {
      if (!playerName.trim()) return alert('Please enter your name');
      
      localStorage.setItem('richup_player_name', playerName);
      localStorage.setItem('richup_server_ip', serverIp);

      if (activeTab === 'host') {
          dispatch('join', { 
              type: 'CREATE', serverIp, serverPort, playerName,
              settings: { initialCash, mapId }
          });
      } else {
          if (!gameCode.trim()) return alert('Please enter a Game Code');
          dispatch('join', { 
              type: 'JOIN', serverIp, serverPort, playerName,
              gameId: gameCode
          });
      }
  }
</script>

<div class="lobby-container">
  <div class="card">
      <div class="logo">
        <h1>RICHUP</h1>
        <span class="tagline">Global Edition</span>
      </div>
      
      <div class="tabs">
          <button class:active={activeTab === 'join'} on:click={() => activeTab = 'join'}>Join Game</button>
          <button class:active={activeTab === 'host'} on:click={() => activeTab = 'host'}>Host Game</button>
      </div>

      <div class="form-body">
          <div class="input-group">
            <label>Your Name</label>
            <input type="text" bind:value={playerName} placeholder="e.g. MonopolyMan">
          </div>

          <details>
              <summary>Server Settings</summary>
              <div class="input-group">
                  <label>Server IP</label>
                  <input type="text" bind:value={serverIp} placeholder="localhost or 192.168.x.x">
              </div>
          </details>

          {#if activeTab === 'join'}
              <div class="input-group">
                  <label>Game Code</label>
                  <input type="text" bind:value={gameCode} placeholder="ABCD12" class="code-input">
              </div>
          {:else}
              <div class="input-group">
                  <label>Starting Cash</label>
                  <div class="range-wrap">
                      <input type="range" min="500" max="5000" step="100" bind:value={initialCash}>
                      <span class="range-val">${initialCash}</span>
                  </div>
              </div>
          {/if}

          <button class="btn-primary" on:click={handleAction}>
              {activeTab === 'host' ? 'Create & Host Game' : 'Join Game'}
          </button>
      </div>
  </div>
</div>

<style lang="scss">
  .lobby-container {
      width: 100vw; height: 100vh;
      display: flex; justify-content: center; align-items: center;
      background: #f5f5f7;
      padding: 20px;
  }

  .card {
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 20px;
      width: 100%; max-width: 420px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
  }

  .logo {
      text-align: center;
      margin-bottom: 2rem;
      h1 {
        font-size: 2.5rem;
        font-weight: 900;
        letter-spacing: 6px;
        color: #111;
        margin-bottom: 4px;
      }
      .tagline {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 4px;
        color: #9ca3af;
        font-weight: 500;
      }
  }

  .tabs {
      display: flex; margin-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      
      button {
          flex: 1;
          background: none; border: none;
          color: #9ca3af; padding: 12px;
          cursor: pointer; font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          
          &.active {
              color: #111;
              border-bottom-color: #111;
          }
          &:hover:not(.active) { color: #6b7280; }
      }
  }

  .input-group {
      margin-bottom: 16px;
      display: flex; flex-direction: column; gap: 6px;
      
      label {
        font-size: 0.75rem; color: #6b7280; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      input[type="text"], select {
          padding: 12px 14px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          color: #111;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          &:focus {
            outline: none;
            border-color: #111;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
          }
      }
  }

  .code-input {
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 700;
    text-align: center;
    font-size: 1.2rem !important;
  }

  .range-wrap {
      display: flex; gap: 12px; align-items: center;
      input[type="range"] {
        flex: 1;
        accent-color: #111;
        height: 4px;
      }
      .range-val {
        font-weight: 700; min-width: 60px; text-align: right;
        font-size: 1rem; color: #111;
      }
  }

  details {
      margin-bottom: 16px;
      summary {
        cursor: pointer; color: #9ca3af; font-size: 0.8rem;
        margin-bottom: 8px; font-weight: 500;
        &:hover { color: #6b7280; }
      }
  }

  .btn-primary {
      width: 100%;
      padding: 14px;
      margin-top: 8px;
      background: #111;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem; font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

      &:hover {
        background: #333;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      &:active { transform: translateY(0); }
  }

  @media (max-width: 480px) {
    .card { padding: 1.5rem; border-radius: 16px; }
    .logo h1 { font-size: 2rem; }
  }
</style>
