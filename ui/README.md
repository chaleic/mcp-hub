# MCP Hub UI

A modern Vue.js web interface for managing MCP (Model Context Protocol) servers.

## Features

- **Server Management**: Start, stop, and monitor MCP servers
- **Marketplace**: Browse and install servers from the marketplace
- **Tools**: Execute tools from connected servers
- **Resources**: Access and view server resources
- **Prompts**: Execute prompts from servers
- **Workspaces**: Monitor active development workspaces
- **System**: View system health and perform system operations

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **PrimeVue** - Vue UI component library
- **Vite** - Build tool and development server

## Getting Started

### Prerequisites

- Node.js 18+ 
- MCP Hub server running on port 3000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev:ui
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build:ui
```

The built files will be in `dist/ui/`.

## Development

### Project Structure

```
ui/
├── src/
│   ├── components/          # Vue components
│   │   ├── ServersTab.vue   # Server management
│   │   ├── MarketplaceTab.vue # Marketplace browsing
│   │   ├── ToolsTab.vue     # Tool execution
│   │   ├── ResourcesTab.vue # Resource access
│   │   ├── PromptsTab.vue   # Prompt execution
│   │   ├── WorkspacesTab.vue # Workspace monitoring
│   │   └── SystemTab.vue    # System information
│   ├── services/
│   │   └── api.js          # API service layer
│   ├── App.vue             # Main application component
│   ├── main.js             # Application entry point
│   └── style.css           # Global styles
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── postcss.config.js       # PostCSS configuration
```

### API Integration

The UI communicates with the MCP Hub server through REST APIs:

- **Server Management**: `/api/servers/*`
- **Marketplace**: `/api/marketplace/*`
- **Tools**: `/api/servers/tools`
- **Resources**: `/api/servers/resources`
- **Prompts**: `/api/servers/prompts`
- **Workspaces**: `/api/workspaces`
- **System**: `/api/health`, `/api/restart`

### Real-time Updates

The UI uses Server-Sent Events (SSE) to receive real-time updates from the MCP Hub:

- Server status changes
- Configuration updates
- Log messages
- Health status updates

## Usage

### Server Management

1. Navigate to the **Servers** tab
2. View all configured MCP servers and their status
3. Start/stop servers using the action buttons
4. View detailed server information and capabilities
5. Refresh server capabilities

### Marketplace

1. Navigate to the **Marketplace** tab
2. Browse available MCP servers
3. Filter by category, tags, or search terms
4. View server details and documentation
5. Install servers (when implemented)

### Tools

1. Navigate to the **Tools** tab
2. Browse all available tools from connected servers
3. Filter tools by server or search terms
4. Execute tools with parameters
5. View execution results

### Resources

1. Navigate to the **Resources** tab
2. Browse all available resources from connected servers
3. View resource content and metadata
4. Access resource details

### Prompts

1. Navigate to the **Prompts** tab
2. Browse all available prompts from connected servers
3. Execute prompts with arguments
4. View prompt results including text and images

### Workspaces

1. Navigate to the **Workspaces** tab
2. Monitor active development workspaces
3. View workspace details and connection information
4. Access workspace URLs

### System

1. Navigate to the **System** tab
2. View system health and status
3. Monitor server statistics
4. Perform system operations (restart, refresh)
5. View detailed server information in a table format

## Configuration

The UI is configured to proxy API requests to the MCP Hub server running on `localhost:3000`. You can modify the proxy settings in `vite.config.js` if needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see the main project LICENSE file for details. 