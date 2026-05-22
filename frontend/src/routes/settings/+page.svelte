<script lang="ts">
  import { API_BASE_URL, authSession, logout } from '$lib/auth'
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Runtime values the frontend is currently using.</p>
    </div>
  </header>

  <div class="content-stack">
    <div class="grid-2">
      <article class="panel">
        <div class="eyebrow">API Base URL</div>
        <p>{API_BASE_URL}</p>
      </article>
      <article class="panel">
        <div class="eyebrow">Current User</div>
        <p>{$authSession ? `${$authSession.user.name} · ${$authSession.user.email}` : 'Not signed in'}</p>
      </article>
    </div>

    <article class="panel">
      <h2>Session</h2>
      <p class="muted">
        The frontend now authenticates against the backend auth endpoints and stores the JWT locally for gateway requests.
      </p>
      {#if $authSession}
        <button class="ghost-button" on:click={logout}>Log out</button>
      {/if}
    </article>
  </div>
</section>
