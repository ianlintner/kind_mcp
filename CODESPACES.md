# Using KIND MCP in GitHub Codespaces

This guide shows how to use the KIND MCP server in GitHub Codespaces for cloud-based Kubernetes development.

## Setup

### 1. Create a devcontainer.json

Create `.devcontainer/devcontainer.json` in your repository:

```json
{
  "name": "Kubernetes Development with KIND",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "moby": true
    },
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {
      "version": "latest",
      "helm": "latest",
      "minikube": "none"
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    }
  },
  
  "postCreateCommand": "bash .devcontainer/setup-kind.sh",
  
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-kubernetes-tools.vscode-kubernetes-tools",
        "redhat.vscode-yaml"
      ],
      "settings": {
        "mcp.servers": {
          "kind": {
            "command": "node",
            "args": ["${containerWorkspaceFolder}/kind_mcp/dist/index.js"]
          }
        }
      }
    }
  },
  
  "remoteUser": "vscode"
}
```

### 2. Create Setup Script

Create `.devcontainer/setup-kind.sh`:

```bash
#!/bin/bash

# Install KIND
echo "Installing KIND..."
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verify installation
kind version
kubectl version --client

# Clone and setup KIND MCP server
echo "Setting up KIND MCP server..."
cd /workspaces
git clone https://github.com/ianlintner/kind_mcp.git
cd kind_mcp
npm install
npm run build

echo "Setup complete! KIND MCP server is ready."
```

Make it executable:
```bash
chmod +x .devcontainer/setup-kind.sh
```

### 3. Open in Codespaces

1. Go to your repository on GitHub
2. Click the green "Code" button
3. Select "Codespaces" tab
4. Click "Create codespace on main"

The setup will automatically install KIND, kubectl, and the MCP server.

## Using KIND in Codespaces

### With GitHub Copilot

Once your Codespace is ready, you can use natural language with Copilot:

```
Create a KIND cluster named "dev"
```

```
Apply the manifest from k8s/deployment.yaml
```

```
Get all pods in the default namespace
```

### Direct kubectl Access

You also have direct terminal access:

```bash
# Create a cluster
kind create cluster --name dev

# Check cluster
kubectl cluster-info --context kind-dev

# Deploy something
kubectl apply -f k8s/

# Clean up
kind delete cluster --name dev
```

## Example Workflow

### 1. Start Your Development Session

```bash
# In terminal or via Copilot
kind create cluster --name workspace
```

### 2. Load Your Local Images

```bash
# Build your app
docker build -t myapp:dev .

# Load into KIND
kind load docker-image myapp:dev --name workspace
```

Or ask Copilot:
```
Load the Docker image "myapp:dev" into cluster "workspace"
```

### 3. Deploy and Test

```
Apply the manifest from k8s/deployment.yaml to cluster "workspace"
```

```
Get all pods in namespace "default" from cluster "workspace"
```

### 4. Debug Issues

```
Get logs from pod "myapp-xxx" in cluster "workspace"
```

```
Execute "env" in pod "myapp-xxx"
```

### 5. Clean Up

```
Delete cluster "workspace"
```

## Tips for Codespaces

### Resource Management

Codespaces have resource limits. For KIND:
- Use single-node clusters for development
- Delete clusters when not actively using them
- Monitor resource usage with `docker stats`

### Persistent Storage

Codespaces can be stopped and restarted. Your clusters will be lost, but your code persists.

To make it easier to recreate:
1. Keep cluster configs in `.devcontainer/` or `k8s/`
2. Use the `setup_ci_cluster` tool for quick recreation
3. Script your setup in a shell script

### Port Forwarding

Codespaces automatically handles port forwarding:

```bash
kubectl port-forward service/myapp 8080:80
```

Codespaces will detect this and offer to open the port in your browser.

### Sharing Your Environment

You can share your Codespace with team members for pair programming or debugging.

## Example Project Structure

```
my-project/
├── .devcontainer/
│   ├── devcontainer.json
│   └── setup-kind.sh
├── k8s/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── kind-config.yaml
├── Dockerfile
└── README.md
```

## CI/CD Integration

Use the same setup in GitHub Actions:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup KIND
        run: |
          curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
          chmod +x ./kind
          sudo mv ./kind /usr/local/bin/kind
      
      - name: Create cluster
        run: kind create cluster --name ci
      
      - name: Deploy
        run: kubectl apply -f k8s/
      
      - name: Test
        run: |
          kubectl wait --for=condition=Ready pods --all --timeout=5m
          # Your tests here
      
      - name: Cleanup
        if: always()
        run: kind delete cluster --name ci
```

## Troubleshooting

### Docker not available
Wait a few moments after Codespace starts. The Docker feature may still be initializing.

### KIND commands fail
Check if KIND is installed: `kind version`
If not, run the setup script manually: `.devcontainer/setup-kind.sh`

### Out of resources
Codespaces have limited resources. Delete unused clusters and containers:
```bash
kind get clusters | xargs -I {} kind delete cluster --name {}
docker system prune -a
```

## Advanced Configuration

### Custom Node Images

Test specific Kubernetes versions:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    image: kindest/node:v1.27.0
```

```
Create cluster using config kind-config.yaml
```

### Multiple Clusters

Run multiple clusters for different projects:

```bash
kind create cluster --name frontend
kind create cluster --name backend
```

Switch between them:
```bash
kubectl config use-context kind-frontend
kubectl config use-context kind-backend
```

## Resources

- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Dev Containers Documentation](https://containers.dev/)
- [KIND Documentation](https://kind.sigs.k8s.io/)
