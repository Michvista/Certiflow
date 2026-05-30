<script lang="ts">
  import StatusPage from '$lib/components/StatusPage.svelte'
</script>

<StatusPage
  code="404"
  title="Page not found"
  description="The page you requested could not be found. Check the address or return to the dashboard."
  primaryLabel="Go home"
  primaryHref="/"
  secondaryLabel="Sign in"
  secondaryHref="/auth"
/>
