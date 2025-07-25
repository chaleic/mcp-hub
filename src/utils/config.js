import fs from "fs/promises";
import chokidar from "chokidar";
import { EventEmitter } from "events";
import path from "path";
import logger from "./logger.js";
import { ConfigError, wrapError } from "./errors.js";
import deepEqual from "fast-deep-equal";
export class ConfigManager extends EventEmitter {
  // Key fields to compare for server config changes
  #KEY_FIELDS = ['command', 'args', 'env', 'disabled', 'url', 'headers', 'dev', 'name', 'cwd', 'config_source', 'homepage'];
  #previousConfig = null;
  #watcher = null;

  constructor(configPathOrObject) {
    super();
    this.configPaths = null;
    this.config = null;
    this.watcher = null;

    if (typeof configPathOrObject === "string") {
      this.configPaths = [configPathOrObject];
    } else if (Array.isArray(configPathOrObject)) {
      this.configPaths = configPathOrObject;
    } else if (configPathOrObject && typeof configPathOrObject === "object") {
      this.config = configPathOrObject;
      this.#previousConfig = JSON.parse(JSON.stringify(configPathOrObject));
    }
  }
  /**
   * Calculate differences between old and new server configs
   */
  #diffConfigs(oldServers = {}, newServers = {}) {
    const changes = {
      added: [],      // New servers
      removed: [],    // Deleted servers
      modified: [],   // Changed server configs
      unchanged: [],  // Same config
      details: {}     // Details of what changed for each modified server
    };

    // Find removed servers
    Object.keys(oldServers || {}).forEach(name => {
      if (!newServers[name]) {
        changes.removed.push(name);
      }
    });

    // Find added/modified servers
    Object.entries(newServers).forEach(([name, newConfig]) => {
      if (!oldServers?.[name]) {
        changes.added.push(name);
      } else {
        // Check each key field for changes
        const modifiedFields = this.#KEY_FIELDS.filter(field => {
          if (!oldServers[name].hasOwnProperty(field) && !newConfig.hasOwnProperty(field)) {
            return false;
          }
          if (!oldServers[name].hasOwnProperty(field) || !newConfig.hasOwnProperty(field)) {
            return true;
          }
          if (field === 'args' || field === 'env' || field === 'headers' || field === 'dev') {
            return !deepEqual(oldServers[name][field], newConfig[field]);
          }
          return oldServers[name][field] !== newConfig[field];
        });

        if (modifiedFields.length > 0) {
          changes.modified.push(name);
          changes.details[name] = {
            modifiedFields,
            oldValues: modifiedFields.reduce((acc, field) => {
              acc[field] = oldServers[name][field];
              return acc;
            }, {}),
            newValues: modifiedFields.reduce((acc, field) => {
              acc[field] = newConfig[field];
              return acc;
            }, {})
          };
        } else {
          changes.unchanged.push(name);
        }
      }
    });

    return changes;
  }

  async updateConfig(newConfigOrPath) {
    if (typeof newConfigOrPath === "string") {
      // Update config path and reload
      this.configPaths = [newConfigOrPath];
      await this.loadConfig();
    } else if (Array.isArray(newConfigOrPath)) {
      // Update config paths and reload
      this.configPaths = newConfigOrPath;
      await this.loadConfig();
    } else if (newConfigOrPath && typeof newConfigOrPath === "object") {
      // Update config directly and save to file if we have file paths
      this.config = newConfigOrPath;
      this.#previousConfig = JSON.parse(JSON.stringify(newConfigOrPath));
      
      // Save to the first config file if we have config paths
      if (this.configPaths && this.configPaths.length > 0) {
        try {
          await fs.writeFile(
            this.configPaths[0], 
            JSON.stringify(newConfigOrPath, null, 2), 
            'utf-8'
          );
          logger.debug(`Config saved to ${this.configPaths[0]}`);
        } catch (error) {
          logger.error("CONFIG_SAVE_ERROR", `Failed to save config to ${this.configPaths[0]}: ${error.message}`, {
            configPath: this.configPaths[0],
            error: error.message
          });
          throw new ConfigError(`Failed to save config: ${error.message}`);
        }
      }
    }
  }

  async loadConfig() {
    if (!this.configPaths || this.configPaths.length === 0) {
      throw new ConfigError("No config paths specified");
    }

    try {
      // Load and merge all config files
      let mergedConfig = { mcpServers: {} };

      for (const configPath of this.configPaths) {
        try {
          const content = await fs.readFile(configPath, "utf-8");
          const config = JSON.parse(content);

          // Merge the config - mcpServers from later files override earlier ones
          if (config.mcpServers && typeof config.mcpServers === "object") {
            // Add config_source to each server config before merging
            Object.entries(config.mcpServers).forEach(([serverName, serverConfig]) => {
              mergedConfig.mcpServers[serverName] = {
                ...serverConfig,
                config_source: configPath // Track which file this server came from
              };
            });
          }

          // For other top-level properties, later config files override earlier ones
          Object.keys(config).forEach(key => {
            if (key !== 'mcpServers') {
              mergedConfig[key] = config[key];
            }
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            logger.debug(`Config file not found, skipping: ${configPath}`);
            continue; // Skip missing files
          }
          throw new ConfigError(`Failed to load config from ${configPath}: ${error.message}`, {
            configPath,
            error: error.message
          });
        }
      }

      const newConfig = mergedConfig;

      // Validate each server configuration
      for (const [name, server] of Object.entries(newConfig.mcpServers)) {
        const hasStdioFields = server.command !== undefined;
        const hasSseFields = server.url !== undefined;

        // Check for mixed fields (but ignore homepage field as it's for documentation)
        if (hasStdioFields && hasSseFields) {
          throw new ConfigError(
            `Server '${name}' cannot mix stdio and sse fields`,
            {
              server: name,
              config: server,
            }
          );
        }

        // Validate based on detected type
        if (hasStdioFields) {
          // STDIO validation
          if (!server.command) {
            throw new ConfigError(`Server '${name}' missing command value`, {
              server: name,
              config: server,
            });
          }
          if (!Array.isArray(server.args)) {
            server.args = []; // Default to empty array if not provided
          }
          if (server.env && typeof server.env !== "object") {
            throw new ConfigError(
              `Server '${name}' has invalid environment config`,
              {
                server: name,
                env: server.env,
              }
            );
          }
          server.type = "stdio"; // Add type for internal use
        } else if (hasSseFields) {
          // SSE validation
          try {
            new URL(server.url); // Validate URL format
          } catch (error) {
            logger.error("CONFIG_VALIDATION_ERROR", `Server '${name}' has invalid url '${server.url}': ${error.message}`, {
              server: name,
              url: server.url,
              serverConfig: server,
              hasStdioFields,
              hasSseFields,
              allFields: Object.keys(server)
            });
            throw new ConfigError(`Server '${name}' has invalid url`, {
              server: name,
              url: server.url,
              error: error.message,
            });
          }
          if (server.headers && typeof server.headers !== "object") {
            throw new ConfigError(
              `Server '${name}' has invalid headers config`,
              {
                server: name,
                headers: server.headers,
              }
            );
          }
          server.type = "sse"; // Add type for internal use
        } else {
          logger.error("CONFIG_VALIDATION_ERROR", `Server '${name}' configuration is invalid - missing both command and url fields`, {
            server: name,
            serverConfig: server,
            hasStdioFields,
            hasSseFields,
            allFields: Object.keys(server)
          });
          throw new ConfigError(
            `Server '${name}' must include either command (for stdio) or url (for sse)`,
            {
              server: name,
              config: server,
            }
          );
        }

        // Validate homepage field if present (optional documentation field)
        if (server.homepage && typeof server.homepage === 'string') {
          try {
            new URL(server.homepage); // Validate URL format but don't throw on failure
          } catch (error) {
            logger.warn(`Server '${name}' has invalid homepage URL: ${server.homepage}`);
            // Don't throw error for invalid homepage as it's optional
          }
        }

        // Validate dev field (only for stdio servers)
        if (server.dev !== undefined) {
          if (!hasStdioFields) {
            throw new ConfigError(
              `Server '${name}' dev field is only supported for stdio servers`,
              {
                server: name,
                config: server,
              }
            );
          }
          // Validate dev configuration
          this.#validateDevConfig(name, server.dev);
        }
      }
      // Calculate changes from previous config
      const changes = this.#diffConfigs(this.#previousConfig?.mcpServers, newConfig.mcpServers);

      // Store new config as current, with deep clone for previousConfig to ensure separate references
      this.config = newConfig;
      this.#previousConfig = JSON.parse(JSON.stringify(newConfig));

      logger.debug(`Config loaded successfully from ${this.configPaths.join(", ")}`);

      // Include changes in return data
      return { config: newConfig, changes };
      // return this.config;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error; // Re-throw our custom errors
      }
      // Wrap any other errors
      throw wrapError(error, "CONFIG_READ_ERROR", {});
    }
  }

  /**
   * Watch the config file for changes using chokidar
   * This provides reliable file watching across different editors and platforms
   */
  watchConfig() {
    if (this.#watcher) {
      return;
    }

    if (!this.configPaths || this.configPaths.length === 0) {
      logger.warn('No config paths to watch');
      return;
    }

    try {
      // Initialize chokidar watcher to watch all config files
      this.#watcher = chokidar.watch(this.configPaths, {
        // Wait for writes to fully complete before triggering
        awaitWriteFinish: {
          stabilityThreshold: 200, // Wait 200ms after last write
          pollInterval: 100       // Check every 100ms
        },
        persistent: true,         // Keep watching
        usePolling: false,        // Use native events when possible
        ignoreInitial: true      // Don't trigger on initial file load
      });

      // Handle file changes
      this.#watcher.on('change', async (changedPath) => {
        try {
          logger.debug(`Config file change detected at ${changedPath}`);

          // Load and parse updated config
          const { config, changes } = await this.loadConfig();

          // Emit change event with changes
          this.emit('configChanged', { config, changes });

          // Log change summary
          if (changes.added.length === 0 &&
            changes.removed.length === 0 &&
            changes.modified.length === 0) {
            // logger.debug('No significant config changes detected');
          } else {
            logger.info('Config changes processed', {
              changedFile: changedPath,
              added: changes.added.length,
              removed: changes.removed.length,
              modified: changes.modified.length
            });
          }
        } catch (error) {
          logger.error(
            'CONFIG_RELOAD_ERROR',
            `Error reloading config after change: ${error.message}`,
            error instanceof ConfigError
              ? error.data
              : { error: error.message },
            false
          );
        }
      });

      // Handle watcher errors
      this.#watcher.on('error', (error) => {
        logger.error(
          'CONFIG_WATCH_ERROR',
          'Config watcher error',
          { error: error.message },
          false
        );
      });

      logger.debug(`Started watching ${this.configPaths.join(", ")} files`, {
        paths: this.configPaths
      });
    } catch (error) {
      throw new ConfigError('Failed to start config watcher', {
        paths: this.configPaths,
        error: error.message
      });
    }
  }
  /**
   * Stop watching the config file
   * Closes the chokidar watcher instance
   */
  stopWatching() {
    if (this.#watcher) {
      this.#watcher.close();
      this.#watcher = null;
      logger.info(`Stopped watching config file at ${this.configPaths.join(", ")}`);
    }
  }
  getConfig() {
    return this.config;
  }

  getServerConfig(serverName) {
    return this.config?.mcpServers?.[serverName];
  }

  #validateDevConfig(serverName, devConfig = {}) {
    if (devConfig.enabled !== undefined && typeof devConfig.enabled !== "boolean") {
      throw new ConfigError(`Server '${serverName}' dev.enabled must be a boolean`);
    }

    if (devConfig.watch !== undefined && (!Array.isArray(devConfig.watch) || !devConfig.watch.every(p => typeof p === "string"))) {
      throw new ConfigError(`Server '${serverName}' dev.watch must be an array of strings`);
    }

    if (!devConfig.cwd || typeof devConfig.cwd !== "string" || !path.isAbsolute(devConfig.cwd)) {
      throw new ConfigError(`Server '${serverName}' dev.cwd must be an absolute path`);
    }
  }
}
