# Terraform MCP Server

Model Context Protocol (MCP) server for Terraform Infrastructure as Code operations. Provides 25 comprehensive tools for managing Terraform configurations, state, workspaces, and executing infrastructure operations.

## Features

### Core Operations (6 tools)
- `tf_version` - Get Terraform version information
- `tf_init` - Initialize Terraform working directory (with optional provider upgrades)
- `tf_validate` - Validate Terraform configuration syntax
- `tf_plan` - Create execution plan showing proposed changes
- `tf_apply` - Apply Terraform changes to infrastructure
- `tf_destroy` - Destroy Terraform-managed infrastructure

### Output Management (1 tool)
- `tf_output` - Get Terraform output values (JSON or plain text)

### State Management (6 tools)
- `tf_state_list` - List all resources in Terraform state
- `tf_state_show` - Show detailed information for a specific resource
- `tf_state_rm` - Remove a resource from Terraform state
- `tf_state_mv` - Move/rename a resource in Terraform state
- `tf_import` - Import existing infrastructure into Terraform state
- `tf_refresh` - Refresh Terraform state from real infrastructure

### Code Formatting (1 tool)
- `tf_fmt` - Format Terraform configuration files (check or modify)

### Workspace Management (4 tools)
- `tf_workspace_list` - List all Terraform workspaces
- `tf_workspace_select` - Switch to a different workspace
- `tf_workspace_new` - Create a new workspace
- `tf_workspace_delete` - Delete a workspace

### Provider Management (1 tool)
- `tf_providers` - List Terraform providers in use

### Advanced Operations (3 tools)
- `tf_graph` - Generate resource dependency graph in DOT format
- `tf_taint` - Mark a resource for recreation on next apply
- `tf_untaint` - Remove taint marking from a resource

### Plan Management (1 tool)
- `tf_show_plan` - Show details of a saved execution plan file

### File Operations (3 tools)
- `tf_list_files` - List Terraform files in a directory (.tf, .tfvars, .tfstate)
- `tf_read_file` - Read contents of a Terraform configuration file
- `tf_write_file` - Write content to a Terraform configuration file

## Installation

```bash
npm install
npm run build
```

## Configuration

The server uses an optional environment variable to set the default working directory:

```bash
export TERRAFORM_WORKING_DIR="/path/to/your/terraform/projects"
```

If not set, the server will use the current working directory.

## Usage with Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "terraform": {
      "command": "node",
      "args": ["/path/to/mcp-terraform/dist/index.js"],
      "env": {
        "TERRAFORM_WORKING_DIR": "/path/to/terraform/projects"
      }
    }
  }
}
```

## Development

Run in development mode with hot reload:

```bash
npm run dev
```

## Requirements

- Terraform CLI must be installed and available in your PATH
- Appropriate cloud provider credentials configured (AWS, Azure, GCP, etc.)
- Terraform working directory with configuration files

## Example Use Cases

1. **Infrastructure Planning**: Review changes before applying them
2. **State Management**: Import existing resources, move resources between modules
3. **Workspace Management**: Manage multiple environments (dev, staging, prod)
4. **Code Quality**: Format Terraform files consistently
5. **Troubleshooting**: Inspect state, visualize resource dependencies
6. **Selective Operations**: Apply changes to specific resources using targets
7. **Configuration Management**: Read and modify Terraform configuration files

## Tool Parameters

### Common Parameters

- `dir` (optional): Working directory for Terraform operations. Defaults to `TERRAFORM_WORKING_DIR` or current directory
- `auto_approve` (optional): Skip interactive approval for apply/destroy operations
- `target` (optional): Limit operations to specific resources (e.g., `aws_instance.example`)
- `var` (optional): Pass variables to Terraform commands (object with key-value pairs)

### Plan Operations

```json
{
  "dir": "/path/to/project",
  "out": "plan.tfplan",
  "target": "aws_instance.web",
  "var": {
    "region": "us-west-2",
    "instance_type": "t3.micro"
  }
}
```

### State Operations

```json
{
  "dir": "/path/to/project",
  "address": "aws_instance.example",
  "source": "aws_instance.old_name",
  "destination": "aws_instance.new_name"
}
```

## Security Considerations

- The server executes Terraform commands with full permissions
- Ensure proper access controls on the working directory
- Be cautious with `auto_approve` flag on apply/destroy operations
- Store sensitive variables in Terraform variable files or environment variables, not in plain text
- Review plans carefully before applying changes to production infrastructure

## Output Formats

- Most commands return plain text output from Terraform CLI
- Use `json: true` with `tf_output` for structured JSON responses
- State operations return formatted resource information
- Graph operations return DOT format for visualization tools

## Visualization

The `tf_graph` tool generates dependency graphs in DOT format. Use tools like Graphviz to visualize:

```bash
# Save graph output to file
terraform graph > graph.dot

# Generate PNG image
dot -Tpng graph.dot -o graph.png
```

## Error Handling

The server captures both stdout and stderr from Terraform commands. Failed operations return error messages with exit codes for troubleshooting.

## API Reference

For detailed Terraform CLI documentation, see: https://developer.hashicorp.com/terraform/cli

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
