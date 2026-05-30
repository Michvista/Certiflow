<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import AppShell from '$lib/components/AppShell.svelte'
  import { authSession, getStoredSession } from '$lib/auth'
  import { startReportStatusMonitor } from '$lib/report-status-monitor'
  import { userSettings } from '$lib/settings'
  import '$lib/styles.css'

  $: isPublicPage =
    $page.url.pathname.startsWith('/auth') ||
    $page.url.pathname === '/401' ||
    $page.url.pathname === '/404'

  onMount(() => {
    if (!browser) return

    const storedSession = getStoredSession()
    authSession.set(storedSession)
    userSettings.load()
    const stopStatusMonitor = storedSession ? startReportStatusMonitor() : () => {}

    if (!isPublicPage && !storedSession) {
      goto('/401')
    }

    return () => {
      stopStatusMonitor()
    }
  })
</script>

{#if isPublicPage}
  <slot />
{:else}
  <AppShell>
    <slot />
  </AppShell>
{/if}
