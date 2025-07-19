<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Workspaces</h2>
        <p class="text-gray-600">Monitor active development workspaces</p>
      </div>
      <div class="flex space-x-3">
        <Button 
          icon="pi pi-refresh" 
          @click="loadWorkspaces"
          :loading="loading"
          class="p-button-sm"
        >
          Refresh
        </Button>
      </div>
    </div>

    <!-- Workspaces Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="(workspace, path) in workspaces" 
        :key="path"
        class="card p-6 space-y-4"
      >
        <!-- Workspace Header -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-1 break-all">{{ getWorkspaceName(path) }}</h3>
            <p class="text-sm text-gray-500 break-all">{{ path }}</p>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <span class="px-2 py-1 rounded-full text-xs font-medium status-connected">
              Active
            </span>
          </div>
        </div>

        <!-- Workspace Info -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Process ID:</span>
            <span class="font-medium">{{ workspace.pid }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Port:</span>
            <span class="font-medium">{{ workspace.port }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Started:</span>
            <span class="font-medium">{{ formatDate(workspace.startTime) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-medium">{{ formatUptime(workspace.startTime) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-2">
          <Button
            icon="pi pi-external-link"
            @click="openWorkspace(path)"
            class="p-button-sm p-button-success flex-1"
          >
            Open
          </Button>
          <Button
            icon="pi pi-eye"
            @click="viewWorkspaceDetails(path, workspace)"
            class="p-button-sm p-button-text"
          >
            Details
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && Object.keys(workspaces).length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-folder-open text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No active workspaces</h3>
      <p class="text-gray-600">Start a development server to see active workspaces here</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading workspaces...</p>
    </div>

    <!-- Workspace Details Dialog -->
    <Dialog 
      v-model:visible="showDetailsDialog" 
      :header="`Workspace Details: ${selectedWorkspacePath}`"
      :style="{ width: '50rem' }"
      :modal="true"
    >
      <div v-if="selectedWorkspace" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Path</label>
            <span class="text-sm break-all">{{ selectedWorkspacePath }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span class="px-2 py-1 rounded-full text-xs font-medium status-connected">
              Active
            </span>
          </div>
        </div>

        <!-- Process Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Process ID</label>
            <span class="text-sm">{{ selectedWorkspace.pid }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <span class="text-sm">{{ selectedWorkspace.port }}</span>
          </div>
        </div>

        <!-- Timing Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <span class="text-sm">{{ formatDate(selectedWorkspace.startTime) }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Uptime</label>
            <span class="text-sm">{{ formatUptime(selectedWorkspace.startTime) }}</span>
          </div>
        </div>

        <!-- Connection Info -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Local URL</label>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-blue-600">http://localhost:{{ selectedWorkspace.port }}</span>
            <Button
              icon="pi pi-copy"
              @click="copyToClipboard(`http://localhost:${selectedWorkspace.port}`)"
              class="p-button-text p-button-sm"
            />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'

import api from '../services/api.js'

const toast = useToast()

const workspaces = ref({})
const loading = ref(false)
const showDetailsDialog = ref(false)
const selectedWorkspace = ref(null)
const selectedWorkspacePath = ref('')

const getWorkspaceName = (path) => {
  return path.split('/').pop() || path
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleString()
}

const formatUptime = (startTime) => {
  if (!startTime) return 'Unknown'
  
  const start = new Date(startTime)
  const now = new Date()
  const diff = now - start
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const loadWorkspaces = async () => {
  try {
    loading.value = true
    const response = await api.getWorkspaces()
    workspaces.value = response.workspaces || {}
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const openWorkspace = (path) => {
  // This would typically open the workspace in a file explorer or IDE
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: `Opening workspace: ${path}`,
    life: 3000
  })
}

const viewWorkspaceDetails = (path, workspace) => {
  selectedWorkspacePath.value = path
  selectedWorkspace.value = workspace
  showDetailsDialog.value = true
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'URL copied to clipboard',
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to copy to clipboard',
      life: 3000
    })
  }
}

onMounted(() => {
  loadWorkspaces()
})
</script> 