<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Tools</h2>
        <p class="text-gray-600">Browse and execute tools from your MCP servers</p>
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
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Server</label>
          <Dropdown 
            v-model="selectedServer" 
            :options="serverOptions"
            placeholder="All servers"
            class="w-full"
            @change="filterTools"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Tools</label>
          <InputText 
            v-model="searchQuery" 
            placeholder="Search tools..."
            class="w-full"
            @input="filterTools"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Dropdown 
            v-model="statusFilter" 
            :options="statusOptions"
            placeholder="All statuses"
            class="w-full"
            @change="filterTools"
          />
        </div>
      </div>
    </div>

    <!-- Tools Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="tool in filteredTools" 
        :key="`${tool.server}-${tool.name}`"
        class="card p-6 space-y-4"
      >
        <!-- Tool Header -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ tool.name }}</h3>
            <p class="text-sm text-blue-600 font-medium">{{ tool.server }}</p>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(tool.serverStatus)"
            >
              {{ tool.serverStatus }}
            </span>
          </div>
        </div>

        <!-- Tool Description -->
        <p class="text-sm text-gray-600 line-clamp-3">{{ tool.description || 'No description available' }}</p>

        <!-- Tool Parameters -->
        <div v-if="tool.inputSchema?.properties" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700">Parameters:</h4>
          <div class="space-y-1">
            <div 
              v-for="(prop, key) in tool.inputSchema.properties" 
              :key="key"
              class="text-xs text-gray-500"
            >
              <span class="font-medium">{{ key }}</span>
              <span v-if="prop.type">: {{ prop.type }}</span>
              <span v-if="prop.description"> - {{ prop.description }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-2">
          <Button
            icon="pi pi-play"
            @click="executeTool(tool)"
            :loading="tool.executing"
            :disabled="tool.serverStatus !== 'connected'"
            class="p-button-sm p-button-success flex-1"
          >
            Execute
          </Button>
          <Button
            icon="pi pi-eye"
            @click="viewToolDetails(tool)"
            class="p-button-sm p-button-text"
          >
            Details
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredTools.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-wrench text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No tools found</h3>
      <p class="text-gray-600">Try adjusting your filters or ensure servers are connected</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading tools...</p>
    </div>

    <!-- Tool Execution Dialog -->
    <Dialog 
      v-model:visible="showExecutionDialog" 
      :header="`Execute: ${selectedTool?.name}`"
      :style="{ width: '50rem' }"
      :modal="true"
    >
      <div v-if="selectedTool" class="space-y-6">
        <!-- Tool Info -->
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-medium text-gray-900 mb-2">Tool Information</h4>
          <div class="space-y-1 text-sm">
            <div><strong>Server:</strong> {{ selectedTool.server }}</div>
            <div><strong>Description:</strong> {{ selectedTool.description }}</div>
          </div>
        </div>

        <!-- Parameters Form -->
        <div v-if="selectedTool.inputSchema?.properties" class="space-y-4">
          <h4 class="font-medium text-gray-900">Parameters</h4>
          <div 
            v-for="(prop, key) in selectedTool.inputSchema.properties" 
            :key="key"
            class="space-y-2"
          >
            <label class="block text-sm font-medium text-gray-700">
              {{ key }}
              <span v-if="prop.required" class="text-red-500">*</span>
            </label>
            <InputText 
              v-model="toolArguments[key]" 
              :placeholder="prop.description || `Enter ${key}`"
              class="w-full"
            />
            <p v-if="prop.description" class="text-xs text-gray-500">{{ prop.description }}</p>
          </div>
        </div>

        <!-- Execution Result -->
        <div v-if="executionResult" class="space-y-2">
          <h4 class="font-medium text-gray-900">Result</h4>
          <div class="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
            <pre class="text-sm text-gray-600 whitespace-pre-wrap">{{ JSON.stringify(executionResult, null, 2) }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" @click="showExecutionDialog = false" class="p-button-text" />
        <Button 
          label="Execute" 
          @click="performExecution"
          :loading="executing"
          class="p-button-success" 
        />
      </template>
    </Dialog>

    <!-- Tool Details Dialog -->
    <Dialog 
      v-model:visible="showDetailsDialog" 
      :header="`Tool Details: ${selectedTool?.name}`"
      :style="{ width: '60rem' }"
      :modal="true"
    >
      <div v-if="selectedTool" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Server</label>
            <span class="text-sm">{{ selectedTool.server }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(selectedTool.serverStatus)"
            >
              {{ selectedTool.serverStatus }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <p class="text-sm text-gray-600">{{ selectedTool.description || 'No description available' }}</p>
        </div>

        <!-- Input Schema -->
        <div v-if="selectedTool.inputSchema">
          <label class="block text-sm font-medium text-gray-700 mb-1">Input Schema</label>
          <div class="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
            <pre class="text-sm text-gray-600">{{ JSON.stringify(selectedTool.inputSchema, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'

import api from '../services/api.js'

const toast = useToast()

const servers = ref([])
const tools = ref([])
const loading = ref(false)
const selectedServer = ref(null)
const searchQuery = ref('')
const statusFilter = ref(null)
const showExecutionDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedTool = ref(null)
const toolArguments = ref({})
const executionResult = ref(null)
const executing = ref(false)

const serverOptions = computed(() => [
  { label: 'All Servers', value: null },
  ...servers.value.map(server => ({
    label: server.name,
    value: server.name
  }))
])

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Connected', value: 'connected' },
  { label: 'Disconnected', value: 'disconnected' },
  { label: 'Error', value: 'error' }
]

const filteredTools = computed(() => {
  return tools.value.filter(tool => {
    // Server filter
    if (selectedServer.value && tool.server !== selectedServer.value) {
      return false
    }
    
    // Search filter
    if (searchQuery.value && !tool.name.toLowerCase().includes(searchQuery.value.toLowerCase()) && 
        !tool.description?.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (statusFilter.value && tool.serverStatus !== statusFilter.value) {
      return false
    }
    
    return true
  })
})

const getServerStatusClass = (status) => {
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

const loadServers = async () => {
  try {
    loading.value = true
    const response = await api.getServers()
    servers.value = response.servers || []
    
    // Collect all tools from all servers
    const allTools = []
    servers.value.forEach(server => {
      if (server.capabilities?.tools && Array.isArray(server.capabilities.tools)) {
        server.capabilities.tools.forEach(tool => {
          allTools.push({
            ...tool,
            server: server.name,
            serverStatus: server.status,
            executing: false
          })
        })
      }
    })
    tools.value = allTools
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

const filterTools = () => {
  // This is handled by the computed property
}

const executeTool = (tool) => {
  selectedTool.value = tool
  toolArguments.value = {}
  executionResult.value = null
  showExecutionDialog.value = true
}

const performExecution = async () => {
  if (!selectedTool.value) return
  
  try {
    executing.value = true
    const result = await api.executeTool(
      selectedTool.value.server,
      selectedTool.value.name,
      toolArguments.value
    )
    executionResult.value = result.result
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Tool executed successfully',
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
    executing.value = false
  }
}

const viewToolDetails = (tool) => {
  selectedTool.value = tool
  showDetailsDialog.value = true
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