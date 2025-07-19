<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Server Management</h2>
        <p class="text-gray-600">Manage your MCP servers and monitor their status</p>
      </div>
      <div class="flex space-x-3">
        <Button 
          icon="pi pi-refresh" 
          @click="loadServers"
          :loading="loading"
          class="p-button-sm"
        >
          Refresh
        </Button>
        <Button 
          icon="pi pi-plus" 
          @click="showAddServerDialog = true"
          class="p-button-sm p-button-success"
        >
          Add Server
        </Button>
      </div>
    </div>

    <!-- Server Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="server in servers" 
        :key="server.name"
        class="card p-6 space-y-4"
      >
        <!-- Server Header -->
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ server.name }}</h3>
            <p class="text-sm text-gray-500">{{ server.description || 'No description' }}</p>
          </div>
          <div class="flex items-center space-x-2">
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getStatusClass(server.status)"
            >
              {{ server.status }}
            </span>
            <Button
              icon="pi pi-ellipsis-v"
              class="p-button-text p-button-sm"
              @click="toggleServerMenu(server)"
              aria-haspopup="true"
              aria-controls="server_menu"
            />
          </div>
        </div>

        <!-- Server Info -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-medium">{{ formatUptime(server.uptime) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Tools:</span>
            <span class="font-medium">{{ server.capabilities?.tools?.length || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Resources:</span>
            <span class="font-medium">{{ server.capabilities?.resources?.length || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Prompts:</span>
            <span class="font-medium">{{ server.capabilities?.prompts?.length || 0 }}</span>
          </div>
        </div>

        <!-- Server Actions -->
        <div class="flex space-x-2 pt-2">
          <Button
            v-if="server.status === 'disconnected'"
            icon="pi pi-play"
            @click="startServer(server.name)"
            :loading="server.loading"
            class="p-button-sm p-button-success flex-1"
          >
            Start
          </Button>
          <Button
            v-else
            icon="pi pi-stop"
            @click="stopServer(server.name)"
            :loading="server.loading"
            class="p-button-sm p-button-danger flex-1"
          >
            Stop
          </Button>
          <Button
            icon="pi pi-refresh"
            @click="refreshServer(server.name)"
            :loading="server.refreshing"
            class="p-button-sm p-button-secondary"
          />
          <Button
            icon="pi pi-eye"
            @click="viewServerDetails(server)"
            class="p-button-sm p-button-text"
          />
        </div>

        <!-- Error Message -->
        <div v-if="server.error" class="text-red-600 text-sm bg-red-50 p-2 rounded">
          {{ server.error }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && servers.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-server text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No servers configured</h3>
      <p class="text-gray-600 mb-4">Get started by adding your first MCP server</p>
      <Button 
        icon="pi pi-plus" 
        @click="showAddServerDialog = true"
        class="p-button-success"
      >
        Add Server
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading servers...</p>
    </div>

    <!-- Server Details Dialog -->
    <Dialog 
      v-model:visible="showServerDetails" 
      :header="selectedServer?.name + ' Details'"
      :style="{ width: '50rem' }"
      :modal="true"
    >
      <div v-if="selectedServer" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getStatusClass(selectedServer.status)"
            >
              {{ selectedServer.status }}
            </span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Uptime</label>
            <span class="text-sm">{{ formatUptime(selectedServer.uptime) }}</span>
          </div>
        </div>

        <!-- Capabilities -->
        <div class="space-y-4">
          <h4 class="font-medium text-gray-900">Capabilities</h4>
          
          <!-- Tools -->
          <div v-if="selectedServer.capabilities?.tools?.length">
            <h5 class="text-sm font-medium text-gray-700 mb-2">Tools ({{ selectedServer.capabilities.tools.length }})</h5>
            <div class="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
              <div 
                v-for="tool in selectedServer.capabilities.tools" 
                :key="tool.name"
                class="text-sm text-gray-600 mb-1"
              >
                <span class="font-medium">{{ tool.name }}</span>
                <span class="text-gray-500"> - {{ tool.description }}</span>
              </div>
            </div>
          </div>

          <!-- Resources -->
          <div v-if="selectedServer.capabilities?.resources?.length">
            <h5 class="text-sm font-medium text-gray-700 mb-2">Resources ({{ selectedServer.capabilities.resources.length }})</h5>
            <div class="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
              <div 
                v-for="resource in selectedServer.capabilities.resources" 
                :key="resource.uri"
                class="text-sm text-gray-600 mb-1"
              >
                <span class="font-medium">{{ resource.uri }}</span>
                <span class="text-gray-500"> - {{ resource.description }}</span>
              </div>
            </div>
          </div>

          <!-- Prompts -->
          <div v-if="selectedServer.capabilities?.prompts?.length">
            <h5 class="text-sm font-medium text-gray-700 mb-2">Prompts ({{ selectedServer.capabilities.prompts.length }})</h5>
            <div class="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
              <div 
                v-for="prompt in selectedServer.capabilities.prompts" 
                :key="prompt.name"
                class="text-sm text-gray-600 mb-1"
              >
                <span class="font-medium">{{ prompt.name }}</span>
                <span class="text-gray-500"> - {{ prompt.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Add Server Dialog -->
    <Dialog 
      v-model:visible="showAddServerDialog" 
      header="Add New Server"
      :style="{ width: '40rem' }"
      :modal="true"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
          <InputText v-model="newServer.name" class="w-full" placeholder="Enter server name" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <InputText v-model="newServer.description" class="w-full" placeholder="Enter server description" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Command</label>
          <InputText v-model="newServer.command" class="w-full" placeholder="Enter command to start server" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Working Directory</label>
          <InputText v-model="newServer.cwd" class="w-full" placeholder="Enter working directory (optional)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Environment Variables</label>
          <Textarea v-model="newServer.env" class="w-full" rows="3" placeholder="Enter environment variables (JSON format)" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" @click="showAddServerDialog = false" class="p-button-text" />
        <Button label="Add Server" @click="addServer" class="p-button-success" />
      </template>
    </Dialog>

    <!-- Context Menu -->
    <Menu ref="serverMenu" :model="serverMenuItems" :popup="true" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ProgressSpinner from 'primevue/progressspinner'

import api from '../services/api.js'

const toast = useToast()
const confirm = useConfirm()

const servers = ref([])
const loading = ref(false)
const showServerDetails = ref(false)
const showAddServerDialog = ref(false)
const selectedServer = ref(null)
const serverMenu = ref()
const serverMenuItems = ref([])

const newServer = ref({
  name: '',
  description: '',
  command: '',
  cwd: '',
  env: ''
})

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'connected':
      return 'status-connected'
    case 'disconnected':
      return 'status-disconnected'
    case 'error':
      return 'status-error'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatUptime = (uptime) => {
  if (!uptime) return '0s'
  
  const seconds = Math.floor(uptime / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const loadServers = async () => {
  try {
    loading.value = true
    const response = await api.getServers()
    servers.value = response.servers.map(server => ({
      ...server,
      loading: false,
      refreshing: false
    }))
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

const startServer = async (serverName) => {
  const server = servers.value.find(s => s.name === serverName)
  if (!server) return
  
  try {
    server.loading = true
    await api.startServer(serverName)
    await loadServers() // Refresh to get updated status
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Server ${serverName} started successfully`,
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
    server.loading = false
  }
}

const stopServer = async (serverName) => {
  const server = servers.value.find(s => s.name === serverName)
  if (!server) return
  
  confirm.require({
    message: `Are you sure you want to stop server "${serverName}"?`,
    header: 'Confirm Stop',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        server.loading = true
        await api.stopServer(serverName)
        await loadServers() // Refresh to get updated status
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: `Server ${serverName} stopped successfully`,
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
        server.loading = false
      }
    }
  })
}

const refreshServer = async (serverName) => {
  const server = servers.value.find(s => s.name === serverName)
  if (!server) return
  
  try {
    server.refreshing = true
    await api.refreshServer(serverName)
    await loadServers() // Refresh to get updated capabilities
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Server ${serverName} refreshed successfully`,
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
    server.refreshing = false
  }
}

const viewServerDetails = (server) => {
  selectedServer.value = server
  showServerDetails.value = true
}

const toggleServerMenu = (server) => {
  serverMenuItems.value = [
    {
      label: 'View Details',
      icon: 'pi pi-eye',
      command: () => viewServerDetails(server)
    },
    {
      label: 'Refresh',
      icon: 'pi pi-refresh',
      command: () => refreshServer(server.name)
    },
    {
      separator: true
    },
    {
      label: server.status === 'connected' ? 'Stop' : 'Start',
      icon: server.status === 'connected' ? 'pi pi-stop' : 'pi pi-play',
      command: () => server.status === 'connected' ? stopServer(server.name) : startServer(server.name)
    }
  ]
  serverMenu.value.toggle(event)
}

const addServer = () => {
  // This would typically involve updating the configuration file
  // For now, we'll just close the dialog
  showAddServerDialog.value = false
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Server configuration management will be implemented in a future update',
    life: 3000
  })
}

const handleServersUpdated = () => {
  loadServers()
}

onMounted(() => {
  loadServers()
  window.addEventListener('servers-updated', handleServersUpdated)
})

onUnmounted(() => {
  window.removeEventListener('servers-updated', handleServersUpdated)
})
</script> 