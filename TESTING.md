# Testing Guide

This guide explains how to test the KIND MCP server.

## Automated Tests

Run the validation test suite:

```bash
./test.sh
```

This will validate:
- Required tools are installed (KIND, kubectl, Docker)
- TypeScript compilation
- Build outputs
- Module loading
- Example files
- Documentation
- Security (no high-severity vulnerabilities)
- Functional cluster operations

## Manual Testing

### Test 1: Server Initialization

The server expects to communicate via stdio (standard input/output). When loaded, it should wait for MCP protocol messages.

```bash
# This will timeout as expected - the server is waiting for stdio input
timeout 2 node dist/index.js
echo "Exit code $? (should be 124 for timeout)"
```

### Test 2: Schema Validation

Test that the Zod schemas work correctly:

```bash
node -e "
import { z } from 'zod';

// Test create cluster schema
const createCluster = z.object({
  name: z.string().optional(),
  config: z.string().optional(),
  image: z.string().optional()
});

console.log('Valid:', createCluster.parse({ name: 'test' }));

try {
  createCluster.parse({ name: 123 }); // Invalid
} catch (e) {
  console.log('Validation correctly failed for invalid input');
}
"
```

### Test 3: Manual KIND Operations

Test the commands that the MCP server would execute:

```bash
# Create a cluster
kind create cluster --name test

# List clusters
kind get clusters

# Get cluster info
kubectl cluster-info --context kind-test

# Delete cluster
kind delete cluster --name test
```

### Test 4: Apply Example Manifests

```bash
# Create a cluster
kind create cluster --name demo

# Apply the sample deployment
kubectl apply -f examples/sample-deployment.yaml --context kind-demo

# Check it's running
kubectl get pods -n demo --context kind-demo
kubectl get services -n demo --context kind-demo

# Clean up
kind delete cluster --name demo
```

### Test 5: Multi-node Cluster

```bash
# Create multi-node cluster
kind create cluster --name multi --config examples/multi-node-cluster.yaml

# Check nodes
kubectl get nodes --context kind-multi

# Should see control-plane and 2 workers
kind delete cluster --name multi
```

### Test 6: Load Local Images

```bash
# Create a cluster
kind create cluster --name image-test

# Pull and load an image
docker pull nginx:alpine
kind load docker-image nginx:alpine --name image-test

# Verify it's available in the cluster
docker exec -it image-test-control-plane crictl images | grep nginx

# Clean up
kind delete cluster --name image-test
```

## Integration Testing with MCP Clients

### Using Claude Desktop

1. Configure Claude Desktop as described in README.md
2. Restart Claude Desktop
3. Start a conversation and try:
   - "Create a KIND cluster named dev"
   - "List all KIND clusters"
   - "Get cluster info for dev"
   - "Delete cluster dev"

### Using Custom MCP Client

You can create a simple test client using the MCP SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client(
  {
    name: "test-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool({
  name: "get_clusters",
  arguments: {},
});
console.log("Result:", result);

await client.close();
```

## CI/CD Testing

### GitHub Actions

See `examples/github-actions-ci.yaml` for a complete workflow. Key steps:

1. Install KIND
2. Create cluster
3. Deploy application
4. Run tests
5. Clean up

### Local CI Simulation

```bash
# Simulate CI workflow locally
bash examples/github-actions-ci.yaml
```

## Troubleshooting Tests

### Docker Socket Issues

If you get Docker-related errors:

```bash
# Check Docker is running
docker ps

# Check Docker socket permissions
ls -la /var/run/docker.sock

# Add user to docker group if needed
sudo usermod -aG docker $USER
newgrp docker
```

### KIND Cluster Won't Start

```bash
# Check Docker resources
docker system df

# Clean up old clusters
kind get clusters | xargs -I {} kind delete cluster --name {}

# Check logs
kind export logs /tmp/kind-logs --name cluster-name
```

### Port Conflicts

If port 80/443 are in use for ingress configs:

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Use different ports in config or stop conflicting services
```

## Performance Testing

### Cluster Creation Time

```bash
time kind create cluster --name perf-test
kind delete cluster --name perf-test
```

### Multi-cluster Load

```bash
# Create multiple clusters (tests resource limits)
for i in {1..3}; do
  kind create cluster --name cluster-$i &
done
wait

# List all
kind get clusters

# Clean up
kind get clusters | xargs -I {} kind delete cluster --name {}
```

## Test Coverage

The test suite covers:

- ✅ Tool installation verification
- ✅ TypeScript compilation
- ✅ Module loading
- ✅ Configuration files
- ✅ Documentation completeness
- ✅ Security vulnerabilities
- ✅ Basic cluster operations (create/delete)
- ✅ Schema validation

Not covered (requires MCP client):
- Full MCP protocol handshake
- All tool invocations via MCP
- Error handling for all edge cases
- Concurrent tool calls
- Resource cleanup on failures

## Continuous Testing

For development, watch mode is helpful:

```bash
# Terminal 1: Watch and rebuild
npm run dev

# Terminal 2: Run tests after changes
watch -n 5 ./test.sh
```

## Reporting Issues

When reporting issues, include:

1. Output of `./test.sh`
2. Versions: `kind version`, `kubectl version`, `node --version`
3. OS and Docker version
4. Full error messages and logs
5. Steps to reproduce
