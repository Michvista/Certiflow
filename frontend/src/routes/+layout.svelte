<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import AppShell from '$lib/components/AppShell.svelte'
  import { authSession, getStoredSession } from '$lib/auth'
  import '$lib/styles.css'

  $: isAuthPage = $page.url.pathname.startsWith('/auth')

  onMount(() => {
    if (!browser) return

    authSession.set(getStoredSession())

    if (!$page.url.pathname.startsWith('/auth') && !getStoredSession()) {
      goto('/auth')
    }
  })
</script>

{#if isAuthPage}
  <slot />
{:else}
  <AppShell>
    <slot />
  </AppShell>
{/if}
