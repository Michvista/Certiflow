<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { fetchReport, fetchViolations, resolveViolation } from '$lib/api'
  import { formatShortDate, severityTone, statusTone } from '$lib/format'
  import { fetchProjects, resolveProjectName } from '$lib/project-registry'
  import type { Project, Report, Violation } from '@certiflow/shared'

  let report: Report | null = null
  let projects: Project[] = []
  let violations: Violation[] = []
  let loading = true
  let error = ''

  $: criticalCount = violations.filter((violation) => violation.severity === 'CRITICAL' && !violation.isResolved).length
  $: majorCount = violations.filter((violation) => violation.severity === 'MAJOR' && !violation.isResolved).length
  $: actionableCount = violations.filter((violation) => !violation.isResolved).length
  $: actionablePercent = violations.length ? Math.round((actionableCount / violations.length) * 100) : 0

  onMount(async () => {
    const reportId = $page.params.id

    try {
      projects = await fetchProjects()
      report = await fetchReport(reportId)
      violations = await fetchViolations(reportId)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load report details'
    } finally {
      loading = false
    }
  })

  async function markResolved(violationId: string) {
    try {
      const updated = await resolveViolation(violationId)
      violations = violations.map((violation) => violation.id === updated.id ? updated : violation)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to resolve violation'
    }
  }
</script>

<section class="page">
  {#if loading}
    <div class="panel empty-state">Loading report details...</div>
  {:else if error}
    <div class="alert error">{error}</div>
  {:else if report}
    <header class="page-header">
      <div>
        <div class="eyebrow">{formatShortDate(report.uploadedAt)} · {resolveProjectName(report.projectId, projects)}</div>
        <h1 class="page-title">Site_Audit_{report.id.slice(0, 8)}.pdf</h1>
      </div>
      <span class={`badge ${statusTone(report.status)}`}>{report.status}</span>
    </header>

    <div class="content-stack">
      <div class="two-column">
        <aside class="summary-card">
          <h2 style="margin-top: 0;">AI Audit Summary</h2>
          <p class="muted">
            Automated analysis found <strong>{criticalCount}</strong> critical and <strong>{majorCount}</strong> major issues.
          </p>
          <p class="muted">
            Extraction path:
            <strong>{report.extractionStrategy || 'NONE'}</strong>
            {#if report.ocrProvider}
              via <strong>{report.ocrProvider}</strong>
            {/if}
            {#if report.extractionStrategy === 'GEMINI_FILE'}
              using hosted file analysis
            {/if}
            {#if report.ocrConfidence}
              at <strong>{Math.round(report.ocrConfidence * 100)}%</strong> confidence
            {/if}
          </p>
          <p class="muted">
            {actionableCount > 0
              ? 'Immediate attention is still required on open findings before the next site review.'
              : 'All findings are currently marked resolved.'}
          </p>
          <div class="progress-track">
            <div class="progress-fill" style={`width: ${actionablePercent}%`}></div>
          </div>
          <p class="eyebrow" style="margin-top: 0.8rem;">{actionablePercent}% Actionable</p>
        </aside>

        <section class="violations-list">
          {#if violations.length === 0}
            <div class="panel empty-state">No violations recorded for this report.</div>
          {/if}

          {#each violations as violation}
            <article class={`panel violation-card ${severityTone(violation.severity)}`}>
              <div class="violation-meta">
                <span class={`badge ${severityTone(violation.severity)}`}>{violation.severity}</span>
                <span class="badge minor">{violation.ruleReference}</span>
                {#if violation.sector}
                  <span class="muted">{violation.sector}</span>
                {/if}
              </div>

              <p style="font-size: 1.05rem; line-height: 1.6;">{violation.description}</p>

              <div class="suggestion-box">
                <div class="eyebrow">Suggested Fix</div>
                <p class="muted">{violation.suggestion}</p>
              </div>

              <div class="detail-actions" style="margin-top: 1rem;">
                {#if !violation.isResolved}
                  <button class="ghost-button" on:click={() => markResolved(violation.id)}>Mark as resolved</button>
                {:else}
                  <span class="badge complete">Resolved</span>
                {/if}
              </div>
            </article>
          {/each}
        </section>
      </div>
    </div>
  {/if}
</section>
