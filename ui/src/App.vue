<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">MCP Hub</h1>
            <div class="ml-4 flex items-center space-x-2">
              <div class="w-2 h-2 rounded-full" :class="healthStatusClass"></div>
              <span class="text-sm text-gray-600">{{ healthStatus }}</span>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <Button 
              icon="pi pi-refresh" 
              @click="refreshAllServers"
              :loading="refreshing"
              class="p-button-sm"
            >
              Refresh All
            </Button>
            <Button 
              icon="pi pi-power-off" 
              @click="restartHub"
              :loading="restarting"
              class="p-button-sm p-button-warning"
            >
              Restart Hub
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.name }}
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Servers Tab -->
      <ServersTab v-if="activeTab === 'servers'" />
      
      <!-- Marketplace Tab -->
      <MarketplaceTab v-if="activeTab === 'marketplace'" />
      
      <!-- Tools Tab -->
      <ToolsTab v-if="activeTab === 'tools'" />
      
      <!-- Resources Tab -->
      <ResourcesTab v-if="activeTab === 'resources'" />
      
      <!-- Prompts Tab -->
      <PromptsTab v-if="activeTab === 'prompts'" />
      
      <!-- Workspaces Tab -->
      <WorkspacesTab v-if="activeTab === 'workspaces'" />
      
      <!-- System Tab -->
      <SystemTab v-if="activeTab === 'system'" />
    </main>

    <!-- Toast -->
    <Toast />
    
    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import api from './services/api.js'
import ServersTab from './components/ServersTab.vue'
import MarketplaceTab from './components/MarketplaceTab.vue'
import ToolsTab from './components/ToolsTab.vue'
import ResourcesTab from './components/ResourcesTab.vue'
import PromptsTab from './components/PromptsTab.vue'
import WorkspacesTab from './components/WorkspacesTab.vue'
import SystemTab from './components/SystemTab.vue'

const toast = useToast()
const confirm = useConfirm()

const activeTab = ref('servers')
const healthStatus = ref('Unknown')
const healthStatusClass = ref('bg-gray-400')
const refreshing = ref(false)
const restarting = ref(false)
let eventSource = null

const tabs = [
  { id: 'servers', name: 'Servers' },
  { id: 'marketplace', name: 'Marketplace' },
  { id: 'tools', name: 'Tools' },
  { id: 'resources', name: 'Resources' },
  { id: 'prompts', name: 'Prompts' },
  { id: 'workspaces', name: 'Workspaces' },
  { id: 'system', name: 'System' }
]

const updateHealthStatus = (status) => {
  healthStatus.value = status
  switch (status.toLowerCase()) {
    case 'ready':
      healthStatusClass.value = 'bg-green-500'
      break
    case 'starting':
    case 'restarting':
      healthStatusClass.value = 'bg-yellow-500'
      break
    case 'error':
    case 'stopped':
      healthStatusClass.value = 'bg-red-500'
      break
    default:
      healthStatusClass.value = 'bg-gray-400'
  }
}

const refreshAllServers = async () => {
  try {
    refreshing.value = true
    await api.refreshAllServers()
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All servers refreshed successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000
    })
  } finally {
    refreshing.value = false
  }
}

const restartHub = () => {
  confirm.require({
    message: 'Are you sure you want to restart the MCP Hub? This will disconnect all servers temporarily.',
    header: 'Confirm Restart',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        restarting.value = true
        await api.restartHub()
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'MCP Hub restarted successfully',
          life: 3000
        })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message,
          life: 5000
        })
      } finally {
        restarting.value = false
      }
    }
  })
}

const setupEventSource = () => {
  try {
    eventSource = api.createEventSource()
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      // Handle different event types
      switch (data.type) {
        case 'hub_state':
          updateHealthStatus(data.data.state)
          break
        case 'servers_updated':
          // Emit event for components to refresh
          window.dispatchEvent(new CustomEvent('servers-updated', { detail: data.data }))
          break
        case 'log':
          console.log('Server log:', data.data)
          break
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      updateHealthStatus('Error')
    }
  } catch (error) {
    console.error('Failed to setup SSE:', error)
  }
}

const checkHealth = async () => {
  try {
    const health = await api.getHealth()
    updateHealthStatus(health.state)
  } catch (error) {
    console.error('Health check failed:', error)
    updateHealthStatus('Error')
  }
}

onMounted(async () => {
  await checkHealth()
  setupEventSource()
})

onUnmounted(() => {
  if (eventSource) {
    eventSource.close()
  }
})
</script> 