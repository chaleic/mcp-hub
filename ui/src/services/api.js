const API_BASE = '/api'

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Server Management
  async getServers() {
    return this.request('/servers')
  }

  async getServerInfo(serverName) {
    return this.request('/servers/info', {
      method: 'POST',
      body: JSON.stringify({ server_name: serverName })
    })
  }

  async startServer(serverName) {
    return this.request('/servers/start', {
      method: 'POST',
      body: JSON.stringify({ server_name: serverName })
    })
  }

  async stopServer(serverName, disable = false) {
    return this.request(`/servers/stop?disable=${disable}`, {
      method: 'POST',
      body: JSON.stringify({ server_name: serverName })
    })
  }

  async refreshServer(serverName) {
    return this.request('/servers/refresh', {
      method: 'POST',
      body: JSON.stringify({ server_name: serverName })
    })
  }

  async refreshAllServers() {
    return this.request('/refresh')
  }

  // Tool Operations
  async executeTool(serverName, toolName, arguments_ = {}, requestOptions = {}) {
    return this.request('/servers/tools', {
      method: 'POST',
      body: JSON.stringify({
        server_name: serverName,
        tool: toolName,
        arguments: arguments_,
        request_options: requestOptions
      })
    })
  }

  // Resource Operations
  async readResource(serverName, uri, requestOptions = {}) {
    return this.request('/servers/resources', {
      method: 'POST',
      body: JSON.stringify({
        server_name: serverName,
        uri,
        request_options: requestOptions
      })
    })
  }

  // Prompt Operations
  async getPrompt(serverName, promptName, arguments_ = {}, requestOptions = {}) {
    return this.request('/servers/prompts', {
      method: 'POST',
      body: JSON.stringify({
        server_name: serverName,
        prompt: promptName,
        arguments: arguments_,
        request_options: requestOptions
      })
    })
  }

  // Marketplace
  async getMarketplace(filters = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.category) params.append('category', filters.category)
    if (filters.tags) params.append('tags', filters.tags)
    if (filters.sort) params.append('sort', filters.sort)

    return this.request(`/marketplace?${params.toString()}`)
  }

  async getMarketplaceDetails(mcpId) {
    return this.request('/marketplace/details', {
      method: 'POST',
      body: JSON.stringify({ mcpId })
    })
  }

  async installMarketplaceServer(mcpId, serverName) {
    return this.request('/marketplace/install', {
      method: 'POST',
      body: JSON.stringify({ mcpId, serverName })
    })
  }

  // Workspaces
  async getWorkspaces() {
    return this.request('/workspaces')
  }

  // Health and System
  async getHealth() {
    return this.request('/health')
  }

  async restartHub() {
    return this.request('/restart', {
      method: 'POST'
    })
  }

  // Environment Variables
  async getEnvVars() {
    return this.request('/env')
  }

  async saveEnvVars(envVars) {
    return this.request('/env', {
      method: 'POST',
      body: JSON.stringify({ envVars })
    })
  }

  // SSE Events
  createEventSource() {
    return new EventSource(`${API_BASE}/events`)
  }
}

export default new ApiService() 