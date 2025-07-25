<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">System</h2>
        <p class="text-gray-600">Monitor system health and performance</p>
      </div>
      <div class="flex space-x-3">
        <Button 
          icon="pi pi-refresh" 
          @click="loadHealth"
          :loading="loading"
          class="p-button-sm"
        >
          Refresh
        </Button>
      </div>
    </div>

    <!-- Health Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Hub Status -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Hub Status</h3>
          <div class="w-3 h-3 rounded-full" :class="getStatusClass(health.state)"></div>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">State:</span>
            <span class="font-medium capitalize">{{ health.state }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Server ID:</span>
            <span class="font-medium">{{ health.server_id }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Active Clients:</span>
            <span class="font-medium">{{ health.activeClients }}</span>
          </div>
        </div>
      </div>

      <!-- Server Stats -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Server Stats</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Total Servers:</span>
            <span class="font-medium">{{ getServersArray().length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Connected:</span>
            <span class="font-medium text-green-600">
              {{ getConnectedServers() }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Disconnected:</span>
            <span class="font-medium text-red-600">
              {{ getDisconnectedServers() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Connection Stats -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Connections</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Total:</span>
            <span class="font-medium">{{ health.connections?.totalConnections || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Active:</span>
            <span class="font-medium">{{ health.activeClients || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- MCP Endpoint -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">MCP Endpoint</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-medium text-green-600">Active</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">URL:</span>
            <span class="font-medium">/mcp</span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Actions -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">System Actions</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          icon="pi pi-refresh"
          @click="refreshAllServers"
          :loading="refreshing"
          class="p-button-success"
        >
          Refresh All Servers
        </Button>
        <Button
          icon="pi pi-power-off"
          @click="restartHub"
          :loading="restarting"
          class="p-button-warning"
        >
          Restart Hub
        </Button>
        <Button
          icon="pi pi-download"
          @click="exportConfig"
          class="p-button-secondary"
        >
          Export Config
        </Button>
      </div>
    </div>

    <!-- Server Details -->
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Server Details</h3>
      <DataTable 
        :value="getServersArray()" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[5, 10, 20]"
        stripedRows
        class="p-datatable-sm"
      >
        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="font-medium">{{ data.name }}</div>
          </template>
        </Column>
        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getStatusClass(data.status)"
            >
              {{ data.status }}
            </span>
          </template>
        </Column>
        <Column field="uptime" header="Uptime" sortable>
          <template #body="{ data }">
            {{ formatUptime(data.uptime) }}
          </template>
        </Column>
        <Column field="capabilities.tools.length" header="Tools" sortable>
          <template #body="{ data }">
            {{ data.capabilities?.tools?.length || 0 }}
          </template>
        </Column>
        <Column field="capabilities.resources.length" header="Resources" sortable>
          <template #body="{ data }">
            {{ data.capabilities?.resources?.length || 0 }}
          </template>
        </Column>
        <Column field="capabilities.prompts.length" header="Prompts" sortable>
          <template #body="{ data }">
            {{ data.capabilities?.prompts?.length || 0 }}
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Workspace Info -->
    <div v-if="health.workspace" class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Workspace Information</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Current Workspace</label>
          <p class="text-sm text-gray-600 break-all">{{ health.workspace.current || 'None' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Active Workspaces</label>
          <div class="space-y-1">
            <div 
              v-for="(workspace, path) in health.workspace.allActive" 
              :key="path"
              class="text-sm text-gray-600"
            >
              <span class="font-medium">{{ path.split('/').pop() }}</span>
              <span class="text-gray-500"> ({{ workspace.port }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Environment Variables -->
    <div class="card p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Environment Variables</h3>
          <p class="text-sm text-gray-600">Edit and manage .env file variables</p>
        </div>
        <div class="flex space-x-3">
          <Button 
            icon="pi pi-refresh" 
            @click="loadEnvVars"
            :loading="envLoading"
            class="p-button-sm p-button-secondary"
          >
            Reload
          </Button>
          <Button 
            icon="pi pi-save" 
            @click="saveEnvVars"
            :loading="envSaving"
            :disabled="!envModified"
            class="p-button-sm p-button-success"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div v-if="envData.filePath" class="mb-4">
        <div class="flex items-center space-x-2 text-sm text-gray-600">
          <i class="pi pi-file"></i>
          <span>{{ envData.filePath }}</span>
          <span v-if="envData.exists === false" class="text-orange-600">(file will be created)</span>
        </div>
      </div>

      <!-- Environment Variables Table -->
      <div class="space-y-4">
        <div v-if="Object.keys(envVariables).length === 0 && !envLoading" class="text-center py-8">
          <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">No environment variables found</p>
          <Button 
            icon="pi pi-plus" 
            @click="addEnvVar"
            class="p-button-sm mt-4"
          >
            Add First Variable
          </Button>
        </div>

        <div v-else>
          <div class="grid grid-cols-1 gap-3">
            <div 
              v-for="(value, key) in envVariables" 
              :key="key"
              class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Variable Name</label>
                  <InputText 
                    v-model="envVariables[key]._key"
                    @input="markEnvModified"
                    placeholder="VARIABLE_NAME"
                    class="w-full"
                    size="small"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  <InputText 
                    v-model="envVariables[key]._value"
                    @input="markEnvModified"
                    placeholder="variable value"
                    class="w-full"
                    size="small"
                  />
                </div>
              </div>
              <Button 
                icon="pi pi-trash" 
                @click="removeEnvVar(key)"
                class="p-button-sm p-button-danger p-button-outlined"
                size="small"
              />
            </div>
          </div>

          <div class="flex justify-between items-center mt-4">
            <Button 
              icon="pi pi-plus" 
              @click="addEnvVar"
              class="p-button-sm p-button-outlined"
            >
              Add Variable
            </Button>
            <div v-if="envModified" class="text-sm text-orange-600 flex items-center">
              <i class="pi pi-exclamation-triangle mr-1"></i>
              Unsaved changes
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading system information...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import InputText from 'primevue/inputtext'

import api from '../services/api.js'

const toast = useToast()
const confirm = useConfirm()

const health = ref({})
const loading = ref(false)
const refreshing = ref(false)
const restarting = ref(false)

// Environment variables state
const envData = ref({})
const envVariables = ref({})
const envLoading = ref(false)
const envSaving = ref(false)
const envModified = ref(false)
let envCounter = 0

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'ready':
      return 'bg-green-500'
    case 'connected':
      return 'bg-green-500'
    case 'starting':
    case 'restarting':
      return 'bg-yellow-500'
    case 'disconnected':
    case 'error':
    case 'stopped':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
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

const getConnectedServers = () => {
  if (!health.value.servers) return 0
  const serversArray = Array.isArray(health.value.servers) 
    ? health.value.servers 
    : Object.values(health.value.servers)
  return serversArray.filter(s => s.status === 'connected').length || 0
}

const getDisconnectedServers = () => {
  if (!health.value.servers) return 0
  const serversArray = Array.isArray(health.value.servers) 
    ? health.value.servers 
    : Object.values(health.value.servers)
  return serversArray.filter(s => s.status === 'disconnected').length || 0
}

const getServersArray = () => {
  if (!health.value.servers) return []
  return Array.isArray(health.value.servers) 
    ? health.value.servers 
    : Object.values(health.value.servers)
}

const loadHealth = async () => {
  try {
    loading.value = true
    const response = await api.getHealth()
    health.value = response
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

const refreshAllServers = async () => {
  try {
    refreshing.value = true
    await api.refreshAllServers()
    await loadHealth() // Refresh health data
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
        await loadHealth() // Refresh health data
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

const exportConfig = () => {
  // This would typically export the current configuration
  toast.add({
    severity: 'info',
    summary: 'Info',
    detail: 'Configuration export feature will be implemented in a future update',
    life: 3000
  })
}

// Environment variables methods
const loadEnvVars = async () => {
  try {
    envLoading.value = true
    const response = await api.getEnvVars()
    envData.value = response
    
    // Convert to editable format
    const vars = {}
    Object.entries(response.envVars || {}).forEach(([key, value]) => {
      const id = `env_${envCounter++}`
      vars[id] = {
        _key: key,
        _value: value
      }
    })
    
    envVariables.value = vars
    envModified.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to load environment variables: ${error.message}`,
      life: 5000
    })
  } finally {
    envLoading.value = false
  }
}

const saveEnvVars = async () => {
  try {
    envSaving.value = true
    
    // Convert back to simple key-value format
    const envVars = {}
    Object.values(envVariables.value).forEach(item => {
      if (item._key && item._key.trim()) {
        envVars[item._key.trim()] = item._value || ''
      }
    })
    
    await api.saveEnvVars(envVars)
    envModified.value = false
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Environment variables saved successfully',
      life: 3000
    })
    
    // Reload to get updated file info
    await loadEnvVars()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to save environment variables: ${error.message}`,
      life: 5000
    })
  } finally {
    envSaving.value = false
  }
}

const addEnvVar = () => {
  const id = `env_${envCounter++}`
  envVariables.value[id] = {
    _key: '',
    _value: ''
  }
  markEnvModified()
}

const removeEnvVar = (id) => {
  delete envVariables.value[id]
  markEnvModified()
}

const markEnvModified = () => {
  envModified.value = true
}

onMounted(() => {
  loadHealth()
  loadEnvVars()
})
</script> 