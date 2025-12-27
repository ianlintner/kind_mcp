# KIND MCP Server

A Model Context Protocol (MCP) server for managing KIND (Kubernetes IN Docker) clusters. This server enables AI agents like GitHub Copilot to create, manage, and interact with local Kubernetes development clusters through natural language.

## Features

- **Cluster Management**: Create, delete, and list KIND clusters
- **Image Management**: Load Docker images into clusters without pushing to registries
- **Kubernetes Operations**: Deploy manifests, get resources, view logs, and execute commands
- **CI/CD Support**: Quick setup for GitHub Actions and other CI environments
- **Port Forwarding**: Easy access to cluster services
- **Multi-node Support**: Create clusters with multiple worker nodes

## Prerequisites

- Node.js 18 or higher
- Docker installed and running
- KIND (Kubernetes IN Docker) installed - [Installation Guide](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- kubectl installed - [Installation Guide](https://kubernetes.io/docs/tasks/tools/)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/ianlintner/kind_mcp.git
cd kind_mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Global Installation

```bash
npm install -g .
```

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kind": {
      "command": "node",
      "args": ["/path/to/kind_mcp/dist/index.js"]
    }
  }
}
```

### VS Code with Copilot

Configure in your VS Code settings or workspace:

```json
{
  "mcp.servers": {
    "kind": {
      "command": "node",
      "args": ["/path/to/kind_mcp/dist/index.js"]
    }
  }
}
```

### GitHub Codespaces

Add the MCP configuration to your devcontainer.json:

```json
{
  "customizations": {
    "vscode": {
      "settings": {
        "mcp.servers": {
          "kind": {
            "command": "node",
            "args": ["/workspaces/kind_mcp/dist/index.js"]
          }
        }
      }
    }
  }
}
```

## Available Tools

### Cluster Management

#### `create_cluster`
Create a new KIND cluster with optional configuration.

**Parameters**:
- `name` (optional): Cluster name (default: "kind")
- `config` (optional): Path to KIND configuration file
- `image` (optional): Node image to use (e.g., "kindest/node:v1.27.0")
- `wait` (optional): Wait duration for control plane (e.g., "60s")
- `kubeconfig` (optional): Path to kubeconfig file

**Example**:
```
Create a new KIND cluster named "dev-cluster"
```

#### `delete_cluster`
Delete a KIND cluster by name.

**Parameters**:
- `name` (optional): Cluster name to delete (default: "kind")
- `kubeconfig` (optional): Path to kubeconfig file

**Example**:
```
Delete the cluster named "dev-cluster"
```

#### `get_clusters`
List all KIND clusters currently running.

**Example**:
```
Show me all KIND clusters
```

#### `get_cluster_info`
Get detailed information about a specific cluster.

**Parameters**:
- `name` (optional): Cluster name (default: "kind")

**Example**:
```
Get information about the "dev-cluster"
```

### Image Management

#### `load_image`
Load a Docker image into a KIND cluster.

**Parameters**:
- `name`: Cluster name
- `image`: Docker image name to load
- `archive` (optional): Path to image archive file

**Example**:
```
Load the image "myapp:latest" into cluster "dev-cluster"
```

#### `export_logs`
Export logs from all nodes in a cluster.

**Parameters**:
- `name` (optional): Cluster name (default: "kind")
- `output`: Output directory for logs

**Example**:
```
Export logs from cluster "dev-cluster" to "./logs"
```

### Kubernetes Operations

#### `apply_manifest`
Apply a Kubernetes manifest to the cluster.

**Parameters**:
- `manifest`: Kubernetes manifest YAML content or file path
- `namespace` (optional): Namespace to apply to
- `cluster` (optional): Cluster name (default: "kind")

**Example**:
```
Apply the manifest from examples/sample-deployment.yaml
```

#### `get_resources`
Get Kubernetes resources from the cluster.

**Parameters**:
- `resource`: Resource type (e.g., "pods", "services", "deployments")
- `namespace` (optional): Namespace (default: all namespaces)
- `name` (optional): Specific resource name
- `cluster` (optional): Cluster name (default: "kind")
- `output` (optional): Output format ("json", "yaml", "wide", "name")

**Example**:
```
Get all pods in the "demo" namespace
```

#### `delete_resource`
Delete a Kubernetes resource.

**Parameters**:
- `resource`: Resource type (e.g., "pod", "service")
- `name`: Resource name
- `namespace` (optional): Namespace
- `cluster` (optional): Cluster name (default: "kind")
- `force` (optional): Force delete

**Example**:
```
Delete the pod named "nginx-demo-123" in namespace "demo"
```

#### `get_logs`
Get logs from a pod.

**Parameters**:
- `pod`: Pod name
- `namespace` (optional): Namespace
- `container` (optional): Container name
- `follow` (optional): Follow log output
- `tail` (optional): Number of lines from the end
- `cluster` (optional): Cluster name (default: "kind")

**Example**:
```
Get the last 100 lines of logs from pod "nginx-demo-123"
```

#### `exec_command`
Execute a command inside a pod container.

**Parameters**:
- `pod`: Pod name
- `command`: Command to execute
- `namespace` (optional): Namespace
- `container` (optional): Container name
- `cluster` (optional): Cluster name (default: "kind")

**Example**:
```
Execute "ls -la" in pod "nginx-demo-123"
```

#### `port_forward`
Set up port forwarding to a pod or service.

**Parameters**:
- `resource`: Resource type/name (e.g., "pod/mypod", "service/mysvc")
- `ports`: Port mapping (e.g., "8080:80")
- `namespace` (optional): Namespace
- `cluster` (optional): Cluster name (default: "kind")

**Example**:
```
Forward port 8080 to service "nginx-service" port 80
```

### CI/CD Helpers

#### `setup_ci_cluster`
Quick setup for CI environments with multi-node support.

**Parameters**:
- `name` (optional): Cluster name (default: "kind")
- `nodes` (optional): Number of worker nodes (default: 1)
- `version` (optional): Kubernetes version (e.g., "v1.27.0")

**Example**:
```
Setup a CI cluster with 2 worker nodes
```

#### `wait_for_ready`
Wait for a cluster to be ready.

**Parameters**:
- `name` (optional): Cluster name (default: "kind")
- `timeout` (optional): Timeout duration (default: "5m")

**Example**:
```
Wait for cluster "dev-cluster" to be ready
```

## Usage Examples

### Basic Development Workflow

1. **Create a cluster**:
   ```
   Create a KIND cluster named "dev"
   ```

2. **Deploy an application**:
   ```
   Apply the manifest from examples/sample-deployment.yaml to cluster "dev"
   ```

3. **Check deployment status**:
   ```
   Get all pods in namespace "demo" from cluster "dev"
   ```

4. **View logs**:
   ```
   Get logs from pod "nginx-demo-xxx" in namespace "demo"
   ```

5. **Clean up**:
   ```
   Delete cluster "dev"
   ```

### Multi-node Cluster

```
Create a cluster named "multi-node" using config file examples/multi-node-cluster.yaml
```

### CI/CD Pipeline

```
Setup a CI cluster with 2 worker nodes named "ci-test"
```

### Loading Local Images

```
Load Docker image "myapp:latest" into cluster "dev"
```

## Example Configuration Files

The `examples/` directory contains several configuration files:

- `multi-node-cluster.yaml`: Multi-node cluster with ingress support
- `ci-cluster.yaml`: Optimized configuration for CI environments
- `ingress-cluster.yaml`: Cluster with ingress controller setup
- `sample-deployment.yaml`: Sample Kubernetes deployment
- `github-actions-ci.yaml`: GitHub Actions workflow example

## Troubleshooting

### Cluster Creation Fails

- Ensure Docker is running
- Check if ports 80/443 are available if using ingress
- Verify KIND is properly installed: `kind version`

### kubectl Commands Fail

- Ensure kubectl is installed: `kubectl version --client`
- Check cluster context: `kubectl config current-context`
- Verify cluster is running: `kind get clusters`

### Image Load Fails

- Ensure the Docker image exists locally: `docker images`
- Check cluster name is correct: `kind get clusters`

## Development

### Building from Source

```bash
npm install
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [KIND Documentation](https://kind.sigs.k8s.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
