<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchReports, fetchViolations } from '$lib/api'
  import { createProject, deleteProject, fetchProjects, updateProject } from '$lib/project-registry'
  import type { Project, Report, Violation } from '@certiflow/shared'

  type ProjectCard = {
    projectId: string
    name: string
    location: string
    reportCount: number
    openFindings: number
    latestStatus: Report['status'] | 'NONE'
  }

  let loading = true
  let creating = false
  let savingProjectId = ''
  let deletingProjectId = ''
  let editingProjectId = ''
  let error = ''
  let successMessage = ''
  let projects: ProjectCard[] = []
  let projectName = ''
  let projectLocation = ''
  let editName = ''
  let editLocation = ''

  onMount(loadData)

  async function loadData() {
    loading = true
    try {
      const projectRecords = await fetchProjects()
      const reports = await fetchReports()
      const allViolations = await Promise.all(
        reports.map(async (report) => [report.id, await fetchViolations(report.id).catch(() => [])] as const)
      )
      const violationsByReport = Object.fromEntries(allViolations) as Record<string, Violation[]>

      const grouped = new Map<string, ProjectCard>(
        projectRecords.map((project: Project) => [project.id, {
          projectId: project.id,
          name: project.name,
          location: project.location,
          reportCount: 0,
          openFindings: 0,
          latestStatus: 'NONE' as const,
        }])
      )

      for (const report of reports) {
        const project = grouped.get(report.projectId)
        if (!project) {
          continue
        }

        project.reportCount += 1
        project.openFindings += (violationsByReport[report.id] || []).filter((violation) => !violation.isResolved).length
        project.latestStatus = report.status
      }

      projects = [...grouped.values()]
      error = ''
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load projects'
    } finally {
      loading = false
    }
  }

  async function handleCreateProject() {
    creating = true
    error = ''
    successMessage = ''

    try {
      await createProject({
        name: projectName,
        location: projectLocation,
      })

      projectName = ''
      projectLocation = ''
      successMessage = 'Project created.'
      await loadData()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to create project'
    } finally {
      creating = false
    }
  }

  function startEdit(project: ProjectCard) {
    editingProjectId = project.projectId
    editName = project.name
    editLocation = project.location
    error = ''
    successMessage = ''
  }

  function cancelEdit() {
    editingProjectId = ''
    editName = ''
    editLocation = ''
  }

  async function handleUpdateProject(projectId: string) {
    savingProjectId = projectId
    error = ''
    successMessage = ''

    try {
      await updateProject(projectId, {
        name: editName,
        location: editLocation,
      })

      successMessage = 'Project updated.'
      cancelEdit()
      await loadData()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to update project'
    } finally {
      savingProjectId = ''
    }
  }

  async function handleDeleteProject(project: ProjectCard) {
    if (project.reportCount > 0) {
      error = 'Delete the project reports before removing this project.'
      successMessage = ''
      return
    }

    deletingProjectId = project.projectId
    error = ''
    successMessage = ''

    try {
      await deleteProject(project.projectId)
      successMessage = 'Project deleted.'
      await loadData()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to delete project'
    } finally {
      deletingProjectId = ''
    }
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Projects</h1>
      <p class="page-subtitle">Create, maintain, and retire the projects your reports belong to.</p>
    </div>
  </header>

  <div class="content-stack">
    <article class="panel">
      <h2 style="margin-top: 0;">Create Project</h2>
      <div class="field-grid">
        <div class="field">
          <label for="project-name">Project Name</label>
          <input id="project-name" bind:value={projectName} placeholder="Hudson Yards Tower B" />
        </div>
        <div class="field">
          <label for="project-location">Location</label>
          <input id="project-location" bind:value={projectLocation} placeholder="Manhattan, New York" />
        </div>
      </div>
      <div class="detail-actions" style="margin-top: 1rem;">
        <button class="primary-button" on:click={handleCreateProject} disabled={creating}>
          {creating ? 'Creating...' : 'Create project'}
        </button>
      </div>
    </article>

    {#if successMessage}
      <div class="alert success">{successMessage}</div>
    {/if}

    {#if loading}
      <div class="panel empty-state">Loading projects...</div>
    {:else if error}
      <div class="alert error">{error}</div>
    {:else if projects.length === 0}
      <div class="panel empty-state">No projects yet. Create one above to start using uploads.</div>
    {:else}
      <div class="grid-3">
        {#each projects as project}
          <article class="panel">
            {#if editingProjectId === project.projectId}
              <div class="stack">
                <div class="field">
                  <label for={`edit-name-${project.projectId}`}>Project Name</label>
                  <input id={`edit-name-${project.projectId}`} bind:value={editName} />
                </div>
                <div class="field">
                  <label for={`edit-location-${project.projectId}`}>Location</label>
                  <input id={`edit-location-${project.projectId}`} bind:value={editLocation} />
                </div>
                <div class="detail-actions">
                  <button class="primary-button" on:click={() => handleUpdateProject(project.projectId)} disabled={savingProjectId === project.projectId}>
                    {savingProjectId === project.projectId ? 'Saving...' : 'Save changes'}
                  </button>
                  <button class="ghost-button" on:click={cancelEdit}>Cancel</button>
                </div>
              </div>
            {:else}
              <div class="eyebrow">Project</div>
              <h2>{project.name}</h2>
              <p class="muted">{project.location}</p>
              <div class="grid-2" style="margin-top: 1rem;">
                <div class="metric-card">
                  <div class="eyebrow">Reports</div>
                  <div class="big-number">{project.reportCount}</div>
                </div>
                <div class="metric-card">
                  <div class="eyebrow">Open Findings</div>
                  <div class="big-number">{project.openFindings}</div>
                </div>
              </div>
              <div class="detail-actions" style="margin-top: 1rem;">
                <button class="ghost-button" on:click={() => startEdit(project)}>Edit</button>
                <button class="ghost-button" on:click={() => handleDeleteProject(project)} disabled={deletingProjectId === project.projectId}>
                  {deletingProjectId === project.projectId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
