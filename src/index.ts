#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

// Tool schemas
const CreateClusterSchema = z.object({
  name: z.string().optional().describe("Cluster name (default: 'kind')"),
  config: z.string().optional().describe("Path to KIND configuration file"),
  image: z.string().optional().describe("Node image to use (e.g., 'kindest/node:v1.27.0')"),
  wait: z.string().optional().describe("Wait duration for control plane (e.g., '60s')"),
  kubeconfig: z.string().optional().describe("Path to kubeconfig file to use"),
});

const DeleteClusterSchema = z.object({
  name: z.string().optional().describe("Cluster name to delete (default: 'kind')"),
  kubeconfig: z.string().optional().describe("Path to kubeconfig file"),
});

const GetClustersSchema = z.object({});

const GetClusterInfoSchema = z.object({
  name: z.string().optional().describe("Cluster name (default: 'kind')"),
});

const LoadImageSchema = z.object({
  name: z.string().describe("Cluster name"),
  image: z.string().describe("Docker image name to load (e.g., 'myapp:latest')"),
  archive: z.string().optional().describe("Path to image archive file"),
});

const ExportLogsSchema = z.object({
  name: z.string().optional().describe("Cluster name (default: 'kind')"),
  output: z.string().describe("Output directory for logs"),
});

const ApplyManifestSchema = z.object({
  manifest: z.string().describe("Kubernetes manifest YAML content or file path"),
  namespace: z.string().optional().describe("Namespace to apply to"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
});

const GetResourcesSchema = z.object({
  resource: z.string().describe("Resource type (e.g., 'pods', 'services', 'deployments')"),
  namespace: z.string().optional().describe("Namespace (default: all namespaces)"),
  name: z.string().optional().describe("Specific resource name"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
  output: z.enum(["json", "yaml", "wide", "name"]).optional().describe("Output format"),
});

const DeleteResourceSchema = z.object({
  resource: z.string().describe("Resource type (e.g., 'pod', 'service', 'deployment')"),
  name: z.string().describe("Resource name"),
  namespace: z.string().optional().describe("Namespace"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
  force: z.boolean().optional().describe("Force delete"),
});

const GetLogsSchema = z.object({
  pod: z.string().describe("Pod name"),
  namespace: z.string().optional().describe("Namespace"),
  container: z.string().optional().describe("Container name (if pod has multiple containers)"),
  follow: z.boolean().optional().describe("Follow log output"),
  tail: z.number().optional().describe("Number of lines to show from the end"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
});

const PortForwardSchema = z.object({
  resource: z.string().describe("Resource type/name (e.g., 'pod/mypod' or 'service/mysvc')"),
  ports: z.string().describe("Port mapping (e.g., '8080:80' or '8080')"),
  namespace: z.string().optional().describe("Namespace"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
});

const ExecCommandSchema = z.object({
  pod: z.string().describe("Pod name"),
  command: z.string().describe("Command to execute"),
  namespace: z.string().optional().describe("Namespace"),
  container: z.string().optional().describe("Container name (if pod has multiple containers)"),
  cluster: z.string().optional().describe("Cluster name (default: 'kind')"),
});

const SetupCIClusterSchema = z.object({
  name: z.string().optional().describe("Cluster name (default: 'kind')"),
  nodes: z.number().optional().describe("Number of worker nodes (default: 1)"),
  version: z.string().optional().describe("Kubernetes version (e.g., 'v1.27.0')"),
});

const WaitForReadySchema = z.object({
  name: z.string().optional().describe("Cluster name (default: 'kind')"),
  timeout: z.string().optional().describe("Timeout duration (default: '5m')"),
});

// Helper function to execute shell commands
async function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command);
    return result;
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}\nStderr: ${error.stderr || ''}\nStdout: ${error.stdout || ''}`);
  }
}

// Get kubeconfig path for cluster
function getKubeconfigPath(clusterName?: string): string {
  const name = clusterName || 'kind';
  return `--context kind-${name}`;
}

// Main server
const server = new Server(
  {
    name: "kind-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_cluster",
        description: "Create a new KIND cluster with optional configuration. Supports multi-node clusters, custom images, and configuration files.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name (default: 'kind')" },
            config: { type: "string", description: "Path to KIND configuration file" },
            image: { type: "string", description: "Node image to use (e.g., 'kindest/node:v1.27.0')" },
            wait: { type: "string", description: "Wait duration for control plane (e.g., '60s')" },
            kubeconfig: { type: "string", description: "Path to kubeconfig file to use" },
          },
        },
      },
      {
        name: "delete_cluster",
        description: "Delete a KIND cluster by name. Removes all containers and resources associated with the cluster.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name to delete (default: 'kind')" },
            kubeconfig: { type: "string", description: "Path to kubeconfig file" },
          },
        },
      },
      {
        name: "get_clusters",
        description: "List all KIND clusters currently running on the system.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_cluster_info",
        description: "Get detailed information about a specific KIND cluster including nodes and their status.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name (default: 'kind')" },
          },
        },
      },
      {
        name: "load_image",
        description: "Load a Docker image into a KIND cluster. Useful for testing local images without pushing to a registry.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name" },
            image: { type: "string", description: "Docker image name to load (e.g., 'myapp:latest')" },
            archive: { type: "string", description: "Path to image archive file" },
          },
          required: ["name", "image"],
        },
      },
      {
        name: "export_logs",
        description: "Export logs from all nodes in a KIND cluster to a directory for debugging.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name (default: 'kind')" },
            output: { type: "string", description: "Output directory for logs" },
          },
          required: ["output"],
        },
      },
      {
        name: "apply_manifest",
        description: "Apply a Kubernetes manifest (YAML) to the cluster. Can be file path or inline YAML content.",
        inputSchema: {
          type: "object",
          properties: {
            manifest: { type: "string", description: "Kubernetes manifest YAML content or file path" },
            namespace: { type: "string", description: "Namespace to apply to" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
          },
          required: ["manifest"],
        },
      },
      {
        name: "get_resources",
        description: "Get Kubernetes resources from the cluster (pods, services, deployments, etc.).",
        inputSchema: {
          type: "object",
          properties: {
            resource: { type: "string", description: "Resource type (e.g., 'pods', 'services', 'deployments')" },
            namespace: { type: "string", description: "Namespace (default: all namespaces)" },
            name: { type: "string", description: "Specific resource name" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
            output: { type: "string", enum: ["json", "yaml", "wide", "name"], description: "Output format" },
          },
          required: ["resource"],
        },
      },
      {
        name: "delete_resource",
        description: "Delete a Kubernetes resource from the cluster.",
        inputSchema: {
          type: "object",
          properties: {
            resource: { type: "string", description: "Resource type (e.g., 'pod', 'service', 'deployment')" },
            name: { type: "string", description: "Resource name" },
            namespace: { type: "string", description: "Namespace" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
            force: { type: "boolean", description: "Force delete" },
          },
          required: ["resource", "name"],
        },
      },
      {
        name: "get_logs",
        description: "Get logs from a pod in the cluster. Supports following logs and tailing.",
        inputSchema: {
          type: "object",
          properties: {
            pod: { type: "string", description: "Pod name" },
            namespace: { type: "string", description: "Namespace" },
            container: { type: "string", description: "Container name (if pod has multiple containers)" },
            follow: { type: "boolean", description: "Follow log output" },
            tail: { type: "number", description: "Number of lines to show from the end" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
          },
          required: ["pod"],
        },
      },
      {
        name: "port_forward",
        description: "Set up port forwarding to a pod or service. Returns the command to run (needs to be run separately as it's a blocking operation).",
        inputSchema: {
          type: "object",
          properties: {
            resource: { type: "string", description: "Resource type/name (e.g., 'pod/mypod' or 'service/mysvc')" },
            ports: { type: "string", description: "Port mapping (e.g., '8080:80' or '8080')" },
            namespace: { type: "string", description: "Namespace" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
          },
          required: ["resource", "ports"],
        },
      },
      {
        name: "exec_command",
        description: "Execute a command inside a pod container.",
        inputSchema: {
          type: "object",
          properties: {
            pod: { type: "string", description: "Pod name" },
            command: { type: "string", description: "Command to execute" },
            namespace: { type: "string", description: "Namespace" },
            container: { type: "string", description: "Container name (if pod has multiple containers)" },
            cluster: { type: "string", description: "Cluster name (default: 'kind')" },
          },
          required: ["pod", "command"],
        },
      },
      {
        name: "setup_ci_cluster",
        description: "Quick setup for CI environments. Creates a multi-node cluster optimized for CI/CD pipelines.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name (default: 'kind')" },
            nodes: { type: "number", description: "Number of worker nodes (default: 1)" },
            version: { type: "string", description: "Kubernetes version (e.g., 'v1.27.0')" },
          },
        },
      },
      {
        name: "wait_for_ready",
        description: "Wait for a cluster to be ready. Useful in CI/CD pipelines after cluster creation.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Cluster name (default: 'kind')" },
            timeout: { type: "string", description: "Timeout duration (default: '5m')" },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_cluster": {
        const params = CreateClusterSchema.parse(args);
        let command = "kind create cluster";
        
        if (params.name) command += ` --name ${params.name}`;
        if (params.config) command += ` --config ${params.config}`;
        if (params.image) command += ` --image ${params.image}`;
        if (params.wait) command += ` --wait ${params.wait}`;
        if (params.kubeconfig) command += ` --kubeconfig ${params.kubeconfig}`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Cluster created successfully!\n\nOutput:\n${result.stdout}\n\nYou can now use kubectl with: kubectl cluster-info --context kind-${params.name || 'kind'}`,
            },
          ],
        };
      }

      case "delete_cluster": {
        const params = DeleteClusterSchema.parse(args);
        let command = "kind delete cluster";
        
        if (params.name) command += ` --name ${params.name}`;
        if (params.kubeconfig) command += ` --kubeconfig ${params.kubeconfig}`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Cluster deleted successfully!\n\nOutput:\n${result.stdout}`,
            },
          ],
        };
      }

      case "get_clusters": {
        GetClustersSchema.parse(args);
        const result = await executeCommand("kind get clusters");
        const clusters = result.stdout.trim().split('\n').filter(c => c);
        return {
          content: [
            {
              type: "text",
              text: clusters.length > 0 
                ? `Found ${clusters.length} KIND cluster(s):\n${clusters.map(c => `  - ${c}`).join('\n')}`
                : "No KIND clusters found.",
            },
          ],
        };
      }

      case "get_cluster_info": {
        const params = GetClusterInfoSchema.parse(args);
        const clusterName = params.name || 'kind';
        const context = getKubeconfigPath(params.name);
        
        const nodesResult = await executeCommand(`kubectl get nodes ${context} -o wide`);
        const infoResult = await executeCommand(`kubectl cluster-info ${context}`);
        
        return {
          content: [
            {
              type: "text",
              text: `Cluster Information for '${clusterName}':\n\n${infoResult.stdout}\n\nNodes:\n${nodesResult.stdout}`,
            },
          ],
        };
      }

      case "load_image": {
        const params = LoadImageSchema.parse(args);
        let command = `kind load docker-image ${params.image} --name ${params.name}`;
        
        if (params.archive) {
          command = `kind load image-archive ${params.archive} --name ${params.name}`;
        }
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Image loaded successfully!\n\nOutput:\n${result.stdout || 'Image loaded into cluster ' + params.name}`,
            },
          ],
        };
      }

      case "export_logs": {
        const params = ExportLogsSchema.parse(args);
        let command = `kind export logs ${params.output}`;
        
        if (params.name) command += ` --name ${params.name}`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Logs exported successfully to ${params.output}!\n\nOutput:\n${result.stdout}`,
            },
          ],
        };
      }

      case "apply_manifest": {
        const params = ApplyManifestSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl apply ${context}`;
        if (params.namespace) command += ` -n ${params.namespace}`;
        
        // Check if manifest is a file path or inline content
        if (params.manifest.includes('\n') || params.manifest.startsWith('apiVersion:')) {
          // Inline YAML - write to temp file
          const tempFile = `/tmp/manifest-${Date.now()}.yaml`;
          await executeCommand(`cat > ${tempFile} << 'EOF'\n${params.manifest}\nEOF`);
          command += ` -f ${tempFile}`;
          const result = await executeCommand(command);
          await executeCommand(`rm ${tempFile}`);
          return {
            content: [{ type: "text", text: `Manifest applied successfully!\n\n${result.stdout}` }],
          };
        } else {
          // File path
          command += ` -f ${params.manifest}`;
          const result = await executeCommand(command);
          return {
            content: [{ type: "text", text: `Manifest applied successfully!\n\n${result.stdout}` }],
          };
        }
      }

      case "get_resources": {
        const params = GetResourcesSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl get ${params.resource} ${context}`;
        if (params.namespace) {
          command += ` -n ${params.namespace}`;
        } else {
          command += ` --all-namespaces`;
        }
        if (params.name) command += ` ${params.name}`;
        if (params.output) command += ` -o ${params.output}`;
        else command += ` -o wide`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Resources (${params.resource}):\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "delete_resource": {
        const params = DeleteResourceSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl delete ${params.resource} ${params.name} ${context}`;
        if (params.namespace) command += ` -n ${params.namespace}`;
        if (params.force) command += ` --force --grace-period=0`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Resource deleted successfully!\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "get_logs": {
        const params = GetLogsSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl logs ${params.pod} ${context}`;
        if (params.namespace) command += ` -n ${params.namespace}`;
        if (params.container) command += ` -c ${params.container}`;
        if (params.follow) command += ` -f`;
        if (params.tail) command += ` --tail=${params.tail}`;
        
        if (params.follow) {
          return {
            content: [
              {
                type: "text",
                text: `To follow logs, run this command in your terminal:\n\n${command}\n\nNote: This is a blocking operation that needs to run in a terminal.`,
              },
            ],
          };
        }
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Logs from pod '${params.pod}':\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "port_forward": {
        const params = PortForwardSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl port-forward ${params.resource} ${params.ports} ${context}`;
        if (params.namespace) command += ` -n ${params.namespace}`;
        
        return {
          content: [
            {
              type: "text",
              text: `Port forwarding command (run this in a terminal):\n\n${command}\n\nNote: This is a blocking operation. It will forward traffic from localhost:${params.ports.split(':')[0]} to the resource.`,
            },
          ],
        };
      }

      case "exec_command": {
        const params = ExecCommandSchema.parse(args);
        const context = getKubeconfigPath(params.cluster);
        
        let command = `kubectl exec ${params.pod} ${context}`;
        if (params.namespace) command += ` -n ${params.namespace}`;
        if (params.container) command += ` -c ${params.container}`;
        command += ` -- ${params.command}`;
        
        const result = await executeCommand(command);
        return {
          content: [
            {
              type: "text",
              text: `Command executed successfully in pod '${params.pod}':\n\n${result.stdout}`,
            },
          ],
        };
      }

      case "setup_ci_cluster": {
        const params = SetupCIClusterSchema.parse(args);
        const clusterName = params.name || 'kind';
        const workerNodes = params.nodes || 1;
        
        // Create config for multi-node cluster
        const config = `kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
${Array(workerNodes).fill(0).map(() => '  - role: worker').join('\n')}`;
        
        const tempConfig = `/tmp/kind-ci-config-${Date.now()}.yaml`;
        await executeCommand(`cat > ${tempConfig} << 'EOF'\n${config}\nEOF`);
        
        let command = `kind create cluster --name ${clusterName} --config ${tempConfig} --wait 5m`;
        if (params.version) command += ` --image kindest/node:${params.version}`;
        
        const result = await executeCommand(command);
        await executeCommand(`rm ${tempConfig}`);
        
        return {
          content: [
            {
              type: "text",
              text: `CI cluster '${clusterName}' created successfully with ${workerNodes} worker node(s)!\n\n${result.stdout}\n\nCluster is ready for CI/CD workflows.`,
            },
          ],
        };
      }

      case "wait_for_ready": {
        const params = WaitForReadySchema.parse(args);
        const context = getKubeconfigPath(params.name);
        const timeout = params.timeout || '5m';
        
        // Wait for nodes to be ready
        const command = `kubectl wait --for=condition=Ready nodes --all ${context} --timeout=${timeout}`;
        const result = await executeCommand(command);
        
        return {
          content: [
            {
              type: "text",
              text: `Cluster is ready!\n\n${result.stdout}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KIND MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
