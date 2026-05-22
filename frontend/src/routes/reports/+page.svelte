<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchReports, fetchViolations } from '$lib/api'
  import { formatDate, statusTone } from '$lib/format'
  import { fetchProjects, resolveProjectName } from '$lib/project-registry'
  import type { Project, Report, Violation } from '@certiflow/shared'

  let reports: Report[] = []
  let projects: Project[] = []
  let violationsByReport: Record<string, Violation[]> = {}
  let loading = true
  let error = ''

  onMount(async () => {
    try {
      projects = await fetchProjects()
      reports = await fetchReports()
      const violationPairs = await Promise.all(
        reports.map(async (report) => [report.id, await fetchViolations(report.id).catch(() => [])] as const)
      )

      violationsByReport = Object.fromEntries(violationPairs)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load reports'
    } finally {
      loading = false
    }
  })
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Reports</h1>
      <p class="page-subtitle">Track every upload moving through the audit pipeline.</p>
    </div>
    <a class="primary-button" href="/upload">Upload Report</a>
  </header>

  <div class="content-stack">
    {#if loading}
      <div class="panel empty-state">Loading reports...</div>
    {:else if error}
      <div class="alert error">{error}</div>
    {:else if reports.length === 0}
      <div class="panel empty-state">No reports have been submitted yet.</div>
    {:else}
      <div class="grid-2">
        {#each reports as report}
          <article class="report-card panel">
            <div class="report-meta">
              <span class={`badge ${statusTone(report.status)}`}>{report.status}</span>
              <span class="muted">{formatDate(report.uploadedAt)}</span>
            </div>
            <h2 style="margin-bottom: 0.35rem;">{resolveProjectName(report.projectId, projects)}</h2>
            <div class="muted">{report.reportType.replaceAll('_', ' ')}</div>
            {#if report.extractionStrategy === 'OCR'}
              <p class="muted" style="margin-top: 0.75rem;">
                OCR processed{report.ocrProvider ? ` via ${report.ocrProvider}` : ''}{report.ocrConfidence ? ` (${Math.round(report.ocrConfidence * 100)}% confidence)` : ''}.
              </p>
            {:else if report.extractionStrategy === 'GEMINI_FILE'}
              <p class="muted" style="margin-top: 0.75rem;">
                Analyzed with Gemini Files{report.ocrProvider ? ` via ${report.ocrProvider}` : ''}.
              </p>
            {/if}
            <p class="muted" style="margin-top: 1rem;">
              {violationsByReport[report.id]?.length || 0} violation(s) linked to this report.
            </p>
            <div class="detail-actions" style="margin-top: 1rem;">
              <a class="ghost-button" href={`/reports/${report.id}`}>Open details</a>
              {#if report.fileUrl}
                <a class="ghost-button" href={report.fileUrl} target="_blank" rel="noreferrer">View source file</a>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
