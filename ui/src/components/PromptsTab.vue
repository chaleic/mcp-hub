<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Prompts</h2>
        <p class="text-gray-600">Browse and execute prompts from your MCP servers</p>
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
            @change="filterPrompts"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Prompts</label>
          <InputText 
            v-model="searchQuery" 
            placeholder="Search prompts..."
            class="w-full"
            @input="filterPrompts"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Dropdown 
            v-model="statusFilter" 
            :options="statusOptions"
            placeholder="All statuses"
            class="w-full"
            @change="filterPrompts"
          />
        </div>
      </div>
    </div>

    <!-- Prompts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="prompt in filteredPrompts" 
        :key="`${prompt.server}-${prompt.name}`"
        class="card p-6 space-y-4"
      >
        <!-- Prompt Header -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ prompt.name }}</h3>
            <p class="text-sm text-blue-600 font-medium">{{ prompt.server }}</p>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(prompt.serverStatus)"
            >
              {{ prompt.serverStatus }}
            </span>
          </div>
        </div>

        <!-- Prompt Description -->
        <p class="text-sm text-gray-600 line-clamp-3">{{ prompt.description || 'No description available' }}</p>

        <!-- Prompt Arguments -->
        <div v-if="prompt.arguments?.properties" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700">Arguments:</h4>
          <div class="space-y-1">
            <div 
              v-for="(prop, key) in prompt.arguments.properties" 
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
            @click="executePrompt(prompt)"
            :loading="prompt.executing"
            :disabled="prompt.serverStatus !== 'connected'"
            class="p-button-sm p-button-success flex-1"
          >
            Execute
          </Button>
          <Button
            icon="pi pi-eye"
            @click="viewPromptDetails(prompt)"
            class="p-button-sm p-button-text"
          >
            Details
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredPrompts.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-comments text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
      <p class="text-gray-600">Try adjusting your filters or ensure servers are connected</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading prompts...</p>
    </div>

    <!-- Prompt Execution Dialog -->
    <Dialog 
      v-model:visible="showExecutionDialog" 
      :header="`Execute: ${selectedPrompt?.name}`"
      :style="{ width: '60rem' }"
      :modal="true"
    >
      <div v-if="selectedPrompt" class="space-y-6">
        <!-- Prompt Info -->
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-medium text-gray-900 mb-2">Prompt Information</h4>
          <div class="space-y-1 text-sm">
            <div><strong>Server:</strong> {{ selectedPrompt.server }}</div>
            <div><strong>Description:</strong> {{ selectedPrompt.description }}</div>
          </div>
        </div>

        <!-- Arguments Form -->
        <div v-if="selectedPrompt.arguments?.properties" class="space-y-4">
          <h4 class="font-medium text-gray-900">Arguments</h4>
          <div 
            v-for="(prop, key) in selectedPrompt.arguments.properties" 
            :key="key"
            class="space-y-2"
          >
            <label class="block text-sm font-medium text-gray-700">
              {{ key }}
              <span v-if="prop.required" class="text-red-500">*</span>
            </label>
            <InputText 
              v-model="promptArguments[key]" 
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
            <div v-for="(message, index) in executionResult.messages" :key="index" class="mb-4">
              <div class="font-medium text-sm text-gray-700 mb-1">{{ message.role }}</div>
              <div v-if="message.content.type === 'text'" class="text-sm text-gray-600">
                {{ message.content.text }}
              </div>
              <div v-else-if="message.content.type === 'image'" class="text-sm text-gray-600">
                <img :src="`data:${message.content.mimeType};base64,${message.content.data}`" 
                     alt="Generated image" class="max-w-full h-auto" />
              </div>
              <div v-else class="text-sm text-gray-600">
                {{ JSON.stringify(message.content, null, 2) }}
              </div>
            </div>
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

    <!-- Prompt Details Dialog -->
    <Dialog 
      v-model:visible="showDetailsDialog" 
      :header="`Prompt Details: ${selectedPrompt?.name}`"
      :style="{ width: '60rem' }"
      :modal="true"
    >
      <div v-if="selectedPrompt" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Server</label>
            <span class="text-sm">{{ selectedPrompt.server }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(selectedPrompt.serverStatus)"
            >
              {{ selectedPrompt.serverStatus }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <p class="text-sm text-gray-600">{{ selectedPrompt.description || 'No description available' }}</p>
        </div>

        <!-- Arguments Schema -->
        <div v-if="selectedPrompt.arguments">
          <label class="block text-sm font-medium text-gray-700 mb-1">Arguments Schema</label>
          <div class="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
            <pre class="text-sm text-gray-600">{{ JSON.stringify(selectedPrompt.arguments, null, 2) }}</pre>
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
const prompts = ref([])
const loading = ref(false)
const selectedServer = ref(null)
const searchQuery = ref('')
const statusFilter = ref(null)
const showExecutionDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedPrompt = ref(null)
const promptArguments = ref({})
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

const filteredPrompts = computed(() => {
  return prompts.value.filter(prompt => {
    // Server filter
    if (selectedServer.value && prompt.server !== selectedServer.value) {
      return false
    }
    
    // Search filter
    if (searchQuery.value && !prompt.name.toLowerCase().includes(searchQuery.value.toLowerCase()) && 
        !prompt.description?.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (statusFilter.value && prompt.serverStatus !== statusFilter.value) {
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
    
    // Collect all prompts from all servers
    const allPrompts = []
    servers.value.forEach(server => {
      if (server.capabilities?.prompts && Array.isArray(server.capabilities.prompts)) {
        server.capabilities.prompts.forEach(prompt => {
          allPrompts.push({
            ...prompt,
            server: server.name,
            serverStatus: server.status,
            executing: false
          })
        })
      }
    })
    prompts.value = allPrompts
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

const filterPrompts = () => {
  // This is handled by the computed property
}

const executePrompt = (prompt) => {
  selectedPrompt.value = prompt
  promptArguments.value = {}
  executionResult.value = null
  showExecutionDialog.value = true
}

const performExecution = async () => {
  if (!selectedPrompt.value) return
  
  try {
    executing.value = true
    const result = await api.getPrompt(
      selectedPrompt.value.server,
      selectedPrompt.value.name,
      promptArguments.value
    )
    executionResult.value = result.result
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Prompt executed successfully',
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

const viewPromptDetails = (prompt) => {
  selectedPrompt.value = prompt
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