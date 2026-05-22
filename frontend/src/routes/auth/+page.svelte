<script lang="ts">
  import { goto } from '$app/navigation'
  import { login, register } from '$lib/auth'

  let mode: 'login' | 'register' = 'login'
  let name = ''
  let email = ''
  let password = ''
  let loading = false
  let error = ''

  async function handleSubmit() {
    loading = true
    error = ''

    try {
      if (mode === 'register') {
        await register({ name, email, password })
      } else {
        await login({ email, password })
      }

      goto('/')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Authentication failed'
    } finally {
      loading = false
    }
  }
</script>

<section class="page" style="padding-top: 5rem;">
  <div class="upload-card" style="max-width: 30rem; margin: 0 auto;">
    <div class="stack">
      <div>
        <div class="eyebrow">CertiFlow Access</div>
        <h1 class="page-title" style="font-size: 2rem;">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p class="page-subtitle">
          {mode === 'login'
            ? 'Use your account to access reports, violations, and uploads.'
            : 'Create a real user account for the dashboard instead of the demo header.'}
        </p>
      </div>

      <div class="detail-actions">
        <button class="ghost-button" on:click={() => (mode = 'login')}>Login</button>
        <button class="ghost-button" on:click={() => (mode = 'register')}>Register</button>
      </div>

      {#if error}
        <div class="alert error">{error}</div>
      {/if}

      {#if mode === 'register'}
        <div class="field">
          <label for="name">Name</label>
          <input id="name" bind:value={name} placeholder="Michelle A." />
        </div>
      {/if}

      <div class="field">
        <label for="email">Email</label>
        <input id="email" bind:value={email} placeholder="michelle@example.com" />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input id="password" bind:value={password} type="password" placeholder="At least 8 characters" />
      </div>

      <button class="primary-button" on:click={handleSubmit} disabled={loading}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
    </div>
  </div>
</section>
