<script lang="ts">
  import { onMount } from 'svelte'
  import { submitReport } from '$lib/api'
  import { fetchProjects } from '$lib/project-registry'
  import type { Project, ReportType } from '@certiflow/shared'

  let selectedProject = ''
  let projectName = ''
  let reportType: ReportType = 'DAILY_SAFETY_LOG'
  let notes = ''
  let file: File | null = null
  let loading = false
  let successMessage = ''
  let errorMessage = ''
  let projects: Project[] = []

  onMount(async () => {
    try {
      projects = await fetchProjects()
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load projects'
    }
  })

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    file = input.files?.[0] ?? null
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    file = event.dataTransfer?.files?.[0] ?? null
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
  }

  async function handleSubmit() {
    if (!selectedProject || !projectName || !file) {
      errorMessage = 'Please choose a project and attach a file.'
      return
    }

    loading = true
    errorMessage = ''
    successMessage = ''

    try {
      await submitReport({
        projectId: selectedProject,
        projectName,
        reportType,
        notes,
        file,
      })

      successMessage = 'Report submitted. The audit job is now queued.'
      notes = ''
      file = null
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Submission failed'
    } finally {
      loading = false
    }
  }

  function applyProjectSelection(projectId: string) {
    selectedProject = projectId
    projectName = projects.find((project) => project.id === projectId)?.name || ''
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Submit Site Report</h1>
      <p class="page-subtitle">Upload documentation for automated compliance analysis.</p>
    </div>
  </header>

  <div class="content-stack">
    <div class="upload-card" style="max-width: 42rem; margin: 0 auto;">
      {#if successMessage}
        <div class="alert success">{successMessage}</div>
      {/if}

      {#if errorMessage}
        <div class="alert error">{errorMessage}</div>
      {/if}

      <div class="stack">
        <div class="field-grid">
          <div class="field">
            <label for="project">Project</label>
            <select id="project" bind:value={selectedProject} on:change={(event) => applyProjectSelection((event.target as HTMLSelectElement).value)}>
              <option value="">Select project...</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label for="reportType">Report Type</label>
            <select id="reportType" bind:value={reportType}>
              <option value="DAILY_SAFETY_LOG">Daily Safety Log</option>
              <option value="SITE_PHOTO">Site Photo</option>
              <option value="INCIDENT_REPORT">Incident Report</option>
            </select>
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="projectId">Project ID</label>
            <input id="projectId" bind:value={selectedProject} placeholder="Select an existing project" disabled />
          </div>

          <div class="field">
            <label for="projectName">Project Name</label>
            <input id="projectName" bind:value={projectName} placeholder="Choose a project first" disabled />
          </div>
        </div>

        <div
          class="drop-zone"
          on:drop={handleDrop}
          on:dragover={handleDragOver}
          role="button"
          tabindex="0"
        >
          {#if file}
            <p><strong>{file.name}</strong></p>
            <p class="muted">Ready to upload.</p>
          {:else}
            <p>Drop files here or click to upload.</p>
            <p class="muted">Supports PDF, JPG, PNG, TIFF, CSV. Files are sent to Gemini Files for audit analysis. Max 50 MB.</p>
          {/if}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.csv" on:change={handleFileChange} style="margin-top: 1rem;" />
        </div>

        <div class="field">
          <label for="notes">Additional Notes</label>
          <textarea
            id="notes"
            bind:value={notes}
            placeholder="Add any context that would help the auditor."
            rows="4"
          ></textarea>
        </div>

        <button class="primary-button" on:click={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit for AI Audit'}
        </button>

        <a class="ghost-button" href="/projects">Need a new project first? Create one here.</a>
      </div>
    </div>
  </div>
</section>
