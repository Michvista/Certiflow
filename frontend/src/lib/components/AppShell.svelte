<script lang="ts">
  import { page } from '$app/stores'
  import { authSession, logout } from '$lib/auth'

  const links = [
    { href: '/', label: 'Dashboard', icon: 'grid' },
    { href: '/projects', label: 'Projects', icon: 'tools' },
    { href: '/reports', label: 'Reports', icon: 'file' },
    { href: '/violations', label: 'Violations', icon: 'alert' },
    { href: '/settings', label: 'Settings', icon: 'gear' },
  ]

  function isActive(href: string) {
    return href === '/' ? $page.url.pathname === href : $page.url.pathname.startsWith(href)
  }
</script>

<div class="app-shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">CF</div>
      <div>
        <div class="brand-name">CERTIFLOW</div>
        <div class="brand-tag">Safety Compliance</div>
      </div>
    </div>

    <a class="upload-cta" href="/upload">Upload Report</a>

    <nav class="nav-list">
      {#each links as link}
        <a class:active={isActive(link.href)} href={link.href}>
          <span class="nav-icon {link.icon}"></span>
          <span>{link.label}</span>
        </a>
      {/each}
    </nav>

    {#if $authSession}
      <div class="session-card">
        <div class="eyebrow">Signed in</div>
        <strong>{$authSession.user.name}</strong>
        <div class="muted">{$authSession.user.email}</div>
        <button class="ghost-button" on:click={logout}>Log out</button>
      </div>
    {/if}
  </aside>

  <div class="workspace">
    <slot />
  </div>
</div>
