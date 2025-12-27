# Quick Start Guide

This guide will help you get started with the KIND MCP server in various development environments.

## Installation Steps

### 1. Install Prerequisites

Make sure you have the following installed:

```bash
# Check Node.js version (should be 18+)
node --version

# Install KIND
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl
```

### 2. Install KIND MCP Server

```bash
# Clone the repository
git clone https://github.com/ianlintner/kind_mcp.git
cd kind_mcp

# Install and build
npm install
npm run build
```

### 3. Configure Your AI Tool

#### For Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kind": {
      "command": "node",
      "args": ["/absolute/path/to/kind_mcp/dist/index.js"]
    }
  }
}
```

#### For VS Code with GitHub Copilot

Add to your `settings.json`:

```json
{
  "mcp.servers": {
    "kind": {
      "command": "node",
      "args": ["/absolute/path/to/kind_mcp/dist/index.js"]
    }
  }
}
```

#### For GitHub Codespaces

Add to `.devcontainer/devcontainer.json`:

```json
{
  "name": "My Dev Container",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {}
  },
  "postCreateCommand": "curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind",
  "customizations": {
    "vscode": {
      "settings": {
        "mcp.servers": {
          "kind": {
            "command": "node",
            "args": ["${containerWorkspaceFolder}/kind_mcp/dist/index.js"]
          }
        }
      }
    }
  }
}
```

## First Steps

### Create Your First Cluster

Just ask your AI assistant:
```
Create a KIND cluster named "my-first-cluster"
```

### Deploy an Application

```
Apply the manifest from examples/sample-deployment.yaml
```

### Check Your Deployment

```
Get all pods in namespace "demo"
```

### View Logs

```
Get logs from the nginx pod in namespace "demo"
```

### Clean Up

```
Delete cluster "my-first-cluster"
```

## Common Use Cases

### Local Development

1. Create a cluster for your project
2. Load your local Docker images
3. Deploy and test your application
4. View logs and debug
5. Clean up when done

### CI/CD Testing

1. Set up a CI cluster with multiple nodes
2. Deploy your application
3. Run integration tests
4. Export logs if tests fail
5. Delete cluster

### Multi-node Testing

1. Create cluster with config file
2. Test distributed systems
3. Verify pod scheduling
4. Test network policies

## Tips

- Use meaningful cluster names for different projects
- Keep configuration files in your project repository
- Use the `setup_ci_cluster` tool for quick CI setups
- Export logs when debugging issues
- Delete clusters when not in use to free resources

## Troubleshooting

### "Docker daemon not available"
Make sure Docker Desktop is running.

### "kind: command not found"
KIND is not installed or not in your PATH. Follow installation steps above.

### "kubectl: command not found"
kubectl is not installed or not in your PATH. Follow installation steps above.

### Cluster creation hangs
Check if you have enough resources (RAM/CPU). KIND needs Docker resources to run.

## Next Steps

- Explore the [examples](./examples/) directory for more configurations
- Read the full [README](./README.md) for detailed tool documentation
- Check out the [GitHub Actions example](./examples/github-actions-ci.yaml) for CI setup
