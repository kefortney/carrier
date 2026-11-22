<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  const { needRefresh, updateServiceWorker } = useRegisterSW();
</script>

{#if $needRefresh}
  <div class="update" role="alert">
    <span>A new version is available.</span>
    <button type="button" class="primary" onclick={() => updateServiceWorker(true)}>Update</button>
    <button type="button" class="link" onclick={() => needRefresh.set(false)}>Later</button>
  </div>
{/if}

<style>
  .update {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom));
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
  }
  span {
    flex: 1;
  }
</style>
