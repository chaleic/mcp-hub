<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Resources</h2>
        <p class="text-gray-600">Browse and access resources from your MCP servers</p>
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
            @change="filterResources"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Resources</label>
          <InputText 
            v-model="searchQuery" 
            placeholder="Search resources..."
            class="w-full"
            @input="filterResources"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Dropdown 
            v-model="statusFilter" 
            :options="statusOptions"
            placeholder="All statuses"
            class="w-full"
            @change="filterResources"
          />
        </div>
      </div>
    </div>

    <!-- Resources Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="resource in filteredResources" 
        :key="`${resource.server}-${resource.uri}`"
        class="card p-6 space-y-4"
      >
        <!-- Resource Header -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-1 break-all">{{ resource.uri }}</h3>
            <p class="text-sm text-blue-600 font-medium">{{ resource.server }}</p>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(resource.serverStatus)"
            >
              {{ resource.serverStatus }}
            </span>
          </div>
        </div>

        <!-- Resource Description -->
        <p class="text-sm text-gray-600 line-clamp-3">{{ resource.description || 'No description available' }}</p>

        <!-- Resource Meta -->
        <div class="space-y-2 text-sm">
          <div v-if="resource.mimeType" class="flex justify-between">
            <span class="text-gray-600">MIME Type:</span>
            <span class="font-medium">{{ resource.mimeType }}</span>
          </div>
          <div v-if="resource.size" class="flex justify-between">
            <span class="text-gray-600">Size:</span>
            <span class="font-medium">{{ formatBytes(resource.size) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-2">
          <Button
            icon="pi pi-eye"
            @click="viewResource(resource)"
            :loading="resource.loading"
            :disabled="resource.serverStatus !== 'connected'"
            class="p-button-sm p-button-success flex-1"
          >
            View
          </Button>
          <Button
            icon="pi pi-info-circle"
            @click="viewResourceDetails(resource)"
            class="p-button-sm p-button-text"
          >
            Details
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredResources.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-folder text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
      <p class="text-gray-600">Try adjusting your filters or ensure servers are connected</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading resources...</p>
    </div>

    <!-- Resource View Dialog -->
    <Dialog 
      v-model:visible="showViewDialog" 
      :header="`Resource: ${selectedResource?.uri}`"
      :style="{ width: '70rem' }"
      :modal="true"
    >
      <div v-if="selectedResource" class="space-y-6">
        <!-- Resource Info -->
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-medium text-gray-900 mb-2">Resource Information</h4>
          <div class="space-y-1 text-sm">
            <div><strong>Server:</strong> {{ selectedResource.server }}</div>
            <div><strong>URI:</strong> {{ selectedResource.uri }}</div>
            <div v-if="selectedResource.mimeType"><strong>MIME Type:</strong> {{ selectedResource.mimeType }}</div>
            <div v-if="selectedResource.size"><strong>Size:</strong> {{ formatBytes(selectedResource.size) }}</div>
          </div>
        </div>

        <!-- Resource Content -->
        <div class="space-y-2">
          <h4 class="font-medium text-gray-900">Content</h4>
          <div class="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
            <pre v-if="resourceContent" class="text-sm text-gray-600 whitespace-pre-wrap">{{ resourceContent }}</pre>
            <div v-else class="text-sm text-gray-500">No content available</div>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Resource Details Dialog -->
    <Dialog 
      v-model:visible="showDetailsDialog" 
      :header="`Resource Details: ${selectedResource?.uri}`"
      :style="{ width: '60rem' }"
      :modal="true"
    >
      <div v-if="selectedResource" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Server</label>
            <span class="text-sm">{{ selectedResource.server }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :class="getServerStatusClass(selectedResource.serverStatus)"
            >
              {{ selectedResource.serverStatus }}
            </span>
          </div>
        </div>

        <!-- URI -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URI</label>
          <p class="text-sm text-gray-600 break-all">{{ selectedResource.uri }}</p>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <p class="text-sm text-gray-600">{{ selectedResource.description || 'No description available' }}</p>
        </div>

        <!-- Meta Information -->
        <div v-if="selectedResource.mimeType || selectedResource.size" class="grid grid-cols-2 gap-4">
          <div v-if="selectedResource.mimeType">
            <label class="block text-sm font-medium text-gray-700 mb-1">MIME Type</label>
            <span class="text-sm">{{ selectedResource.mimeType }}</span>
          </div>
          <div v-if="selectedResource.size">
            <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <span class="text-sm">{{ formatBytes(selectedResource.size) }}</span>
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
const resources = ref([])
const loading = ref(false)
const selectedServer = ref(null)
const searchQuery = ref('')
const statusFilter = ref(null)
const showViewDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedResource = ref(null)
const resourceContent = ref(null)

const serverOptions = computed(() => [
  { label: 'All Servers', value: null },
  ...(Array.isArray(servers.value) ? servers.value.map(server => ({
    label: server.name,
    value: server.name
  })) : [])
])

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Connected', value: 'connected' },
  { label: 'Disconnected', value: 'disconnected' },
  { label: 'Error', value: 'error' }
]

const filteredResources = computed(() => {
  if (!Array.isArray(resources.value)) return []
  return resources.value.filter(resource => {
    // Server filter
    if (selectedServer.value && resource.server !== selectedServer.value) {
      return false
    }
    
    // Search filter
    if (searchQuery.value && !resource.uri.toLowerCase().includes(searchQuery.value.toLowerCase()) && 
        !resource.description?.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      return false
    }
    
    // Status filter
    if (statusFilter.value && resource.serverStatus !== statusFilter.value) {
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

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const loadServers = async () => {
  try {
    loading.value = true
    const response = await api.getServers()
    const serverList = Object.values(response.servers || {})
    servers.value = serverList
    
    // Collect all resources from all servers
    const allResources = []
    serverList.forEach(server => {
      if (server.capabilities?.resources && Array.isArray(server.capabilities.resources)) {
        server.capabilities.resources.forEach(resource => {
          allResources.push({
            ...resource,
            server: server.name,
            serverStatus: server.status,
            loading: false
          })
        })
      }
    })
    resources.value = allResources
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

const filterResources = () => {
  // This is handled by the computed property
}

const viewResource = async (resource) => {
  selectedResource.value = resource
  resourceContent.value = null
  showViewDialog.value = true
  
  try {
    resource.loading = true
    const result = await api.readResource(resource.server, resource.uri)
    resourceContent.value = typeof result.result === 'string' 
      ? result.result 
      : JSON.stringify(result.result, null, 2)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000
    })
  } finally {
    resource.loading = false
  }
}

const viewResourceDetails = (resource) => {
  selectedResource.value = resource
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