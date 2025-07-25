<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Marketplace</h2>
        <p class="text-gray-600">Discover and install MCP servers from the marketplace</p>
      </div>
      <div class="flex space-x-3">
        <Button 
          icon="pi pi-refresh" 
          @click="loadMarketplace"
          :loading="loading"
          class="p-button-sm"
        >
          Refresh
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <InputText 
            v-model="filters.search" 
            placeholder="Search servers..."
            class="w-full"
            @input="debouncedSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <Dropdown 
            v-model="filters.category" 
            :options="categories"
            placeholder="All categories"
            class="w-full"
            @change="loadMarketplace"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <MultiSelect 
            v-model="filters.tags" 
            :options="availableTags"
            placeholder="Select tags"
            class="w-full"
            @change="loadMarketplace"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sort</label>
          <Dropdown 
            v-model="filters.sort" 
            :options="sortOptions"
            placeholder="Sort by"
            class="w-full"
            @change="loadMarketplace"
          />
        </div>
      </div>
    </div>

    <!-- Server Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="server in marketplaceServers" 
        :key="server.id"
        class="card p-6 space-y-4 hover:shadow-md transition-shadow cursor-pointer"
        @click="viewServerDetails(server)"
      >
        <!-- Server Header -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ server.name }}</h3>
            <p class="text-sm text-gray-500 line-clamp-2">{{ server.description }}</p>
          </div>
          <div class="flex items-center space-x-1 ml-2">
            <i v-if="server.featured" class="pi pi-star-fill text-yellow-500 text-sm"></i>
            <i v-if="server.verified" class="pi pi-check-circle text-blue-500 text-sm"></i>
          </div>
        </div>

        <!-- Server Meta -->
        <div class="space-y-2 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Author:</span>
            <span class="font-medium">{{ server.author }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Category:</span>
            <span class="font-medium">{{ server.category }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">Stars:</span>
            <span class="font-medium">{{ server.stars }}</span>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="server.tags?.length && Array.isArray(server.tags)" class="flex flex-wrap gap-1">
          <span 
            v-for="tag in (Array.isArray(server.tags) ? server.tags.slice(0, 3) : [])" 
            :key="tag"
            class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {{ tag }}
          </span>
          <span v-if="Array.isArray(server.tags) && server.tags.length > 3" class="px-2 py-1 text-gray-500 text-xs">
            +{{ server.tags.length - 3 }} more
          </span>
        </div>

        <!-- Actions -->
        <div class="flex space-x-2 pt-2">
          <Button
            icon="pi pi-eye"
            @click.stop="viewServerDetails(server)"
            class="p-button-sm p-button-text flex-1"
          >
            View Details
          </Button>
          <Button
            icon="pi pi-download"
            @click.stop="installServer(server)"
            :loading="server.installing"
            class="p-button-sm p-button-success"
          >
            Install
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && marketplaceServers.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <i class="pi pi-shopping-cart text-6xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No servers found</h3>
      <p class="text-gray-600">Try adjusting your search criteria</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <ProgressSpinner />
      <p class="text-gray-600 mt-4">Loading marketplace...</p>
    </div>

    <!-- Server Details Dialog -->
    <Dialog 
      v-model:visible="showServerDetails" 
      :header="selectedServer?.name"
      :style="{ width: '60rem' }"
      :modal="true"
    >
      <div v-if="selectedServer" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <span class="text-sm">{{ selectedServer.author }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <span class="text-sm">{{ selectedServer.category }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stars</label>
            <span class="text-sm">{{ selectedServer.stars }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
            <span class="text-sm">{{ formatDate(selectedServer.updatedAt) }}</span>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <p class="text-sm text-gray-600">{{ selectedServer.description }}</p>
        </div>

        <!-- Tags -->
        <div v-if="selectedServer.tags?.length && Array.isArray(selectedServer.tags)">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="tag in selectedServer.tags" 
              :key="tag"
              class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- README Content -->
        <div v-if="readmeContent">
          <label class="block text-sm font-medium text-gray-700 mb-1">Documentation</label>
          <div class="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
            <pre class="text-sm text-gray-600 whitespace-pre-wrap">{{ readmeContent }}</pre>
          </div>
        </div>

        <!-- Installation Info -->
        <div v-if="selectedServer.installations?.length && Array.isArray(selectedServer.installations)">
          <label class="block text-sm font-medium text-gray-700 mb-1">Installation</label>
          <div class="bg-gray-50 p-4 rounded">
            <div 
              v-for="installation in selectedServer.installations" 
              :key="installation.type"
              class="text-sm text-gray-600 mb-2"
            >
              <strong>{{ installation.type }}:</strong> {{ installation.command }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Close" @click="showServerDetails = false" class="p-button-text" />
        <Button 
          label="Install" 
          @click="installServer(selectedServer)"
          :loading="selectedServer?.installing"
          class="p-button-success" 
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'

import api from '../services/api.js'

const toast = useToast()

const marketplaceServers = ref([])
const loading = ref(false)
const showServerDetails = ref(false)
const selectedServer = ref(null)
const readmeContent = ref('')

const filters = ref({
  search: '',
  category: null,
  tags: [],
  sort: null
})

const categories = [
  { label: 'All Categories', value: null },
  { label: 'Search', value: 'search' },
  { label: 'Filesystem', value: 'filesystem' },
  { label: 'Database', value: 'database' },
  { label: 'Communication', value: 'communication' },
  { label: 'Development', value: 'development' },
  { label: 'AI/ML', value: 'ai-ml' },
  { label: 'Utilities', value: 'utilities' }
]

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Most Stars', value: 'stars' },
  { label: 'Name A-Z', value: 'name' }
]

const availableTags = [
  { label: 'Search', value: 'search' },
  { label: 'Filesystem', value: 'filesystem' },
  { label: 'Database', value: 'database' },
  { label: 'Git', value: 'git' },
  { label: 'AI', value: 'ai' },
  { label: 'ML', value: 'ml' },
  { label: 'Web', value: 'web' },
  { label: 'API', value: 'api' },
  { label: 'CLI', value: 'cli' },
  { label: 'Development', value: 'development' }
]

let searchTimeout = null

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadMarketplace()
  }, 300)
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp * 1000).toLocaleDateString()
}

const loadMarketplace = async () => {
  try {
    loading.value = true
    const response = await api.getMarketplace(filters.value)
    marketplaceServers.value = (response.servers || []).map(server => ({
      ...server,
      installing: false
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

const viewServerDetails = async (server) => {
  selectedServer.value = server
  showServerDetails.value = true
  
  try {
    const details = await api.getMarketplaceDetails(server.id)
    readmeContent.value = details.readmeContent || 'No documentation available'
  } catch (error) {
    console.error('Failed to load server details:', error)
    readmeContent.value = 'Failed to load documentation'
  }
}

const installServer = async (server) => {
  server.installing = true
  
  try {
    // Prompt user for server name
    const serverName = prompt(`Enter a name for this server:`, server.name.replace(/[@\/]/g, '-'))
    
    if (!serverName) {
      toast.add({
        severity: 'info',
        summary: 'Cancelled',
        detail: 'Installation cancelled',
        life: 3000
      })
      return
    }
    
    // Check if server name already exists
    const existingServers = await api.getServers()
    if (existingServers.servers && Object.keys(existingServers.servers).includes(serverName)) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: `Server name "${serverName}" already exists`,
        life: 5000
      })
      return
    }
    
    // Install the server
    await api.installMarketplaceServer(server.id, serverName)
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Server "${serverName}" installed successfully`,
      life: 3000
    })
    
    // Refresh the servers list to show the new server
    setTimeout(() => {
      // Emit event to refresh servers (if parent component listens)
      // or navigate to servers tab
    }, 1000)
    
  } catch (error) {
    console.error('Installation failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Installation Failed',
      detail: error.message || 'Failed to install server',
      life: 5000
    })
  } finally {
    server.installing = false
  }
}

onMounted(() => {
  loadMarketplace()
})
</script> 