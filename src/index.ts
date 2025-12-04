#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TERRAFORM_WORKING_DIR = process.env.TERRAFORM_WORKING_DIR || process.cwd();

function runTerraform(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn("terraform", args, { cwd, shell: true });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ stdout, stderr, code: code || 0 }));
  });
}

const tools = [
  { name: "tf_version", description: "Get Terraform version", inputSchema: { type: "object", properties: {} } },
  { name: "tf_init", description: "Initialize Terraform working directory", inputSchema: { type: "object", properties: { dir: { type: "string", description: "Working directory" }, upgrade: { type: "boolean", description: "Upgrade providers" } } } },
  { name: "tf_validate", description: "Validate Terraform configuration", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_plan", description: "Create execution plan", inputSchema: { type: "object", properties: { dir: { type: "string" }, out: { type: "string", description: "Save plan to file" }, target: { type: "string", description: "Target specific resource" }, var: { type: "object", description: "Variables to pass" } } } },
  { name: "tf_apply", description: "Apply Terraform changes", inputSchema: { type: "object", properties: { dir: { type: "string" }, auto_approve: { type: "boolean" }, plan_file: { type: "string", description: "Apply saved plan" }, target: { type: "string" }, var: { type: "object" } } } },
  { name: "tf_destroy", description: "Destroy Terraform resources", inputSchema: { type: "object", properties: { dir: { type: "string" }, auto_approve: { type: "boolean" }, target: { type: "string" } } } },
  { name: "tf_output", description: "Get Terraform outputs", inputSchema: { type: "object", properties: { dir: { type: "string" }, name: { type: "string", description: "Specific output name" }, json: { type: "boolean" } } } },
  { name: "tf_state_list", description: "List resources in state", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_state_show", description: "Show resource in state", inputSchema: { type: "object", properties: { dir: { type: "string" }, address: { type: "string", description: "Resource address" } }, required: ["address"] } },
  { name: "tf_state_rm", description: "Remove resource from state", inputSchema: { type: "object", properties: { dir: { type: "string" }, address: { type: "string" } }, required: ["address"] } },
  { name: "tf_state_mv", description: "Move resource in state", inputSchema: { type: "object", properties: { dir: { type: "string" }, source: { type: "string" }, destination: { type: "string" } }, required: ["source", "destination"] } },
  { name: "tf_import", description: "Import existing resource into state", inputSchema: { type: "object", properties: { dir: { type: "string" }, address: { type: "string", description: "Resource address" }, id: { type: "string", description: "Resource ID" } }, required: ["address", "id"] } },
  { name: "tf_refresh", description: "Refresh state", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_fmt", description: "Format Terraform files", inputSchema: { type: "object", properties: { dir: { type: "string" }, check: { type: "boolean", description: "Check only, don't modify" }, recursive: { type: "boolean" } } } },
  { name: "tf_workspace_list", description: "List workspaces", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_workspace_select", description: "Select workspace", inputSchema: { type: "object", properties: { dir: { type: "string" }, name: { type: "string" } }, required: ["name"] } },
  { name: "tf_workspace_new", description: "Create workspace", inputSchema: { type: "object", properties: { dir: { type: "string" }, name: { type: "string" } }, required: ["name"] } },
  { name: "tf_workspace_delete", description: "Delete workspace", inputSchema: { type: "object", properties: { dir: { type: "string" }, name: { type: "string" } }, required: ["name"] } },
  { name: "tf_providers", description: "List providers", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_graph", description: "Generate resource graph (DOT format)", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_taint", description: "Mark resource for recreation", inputSchema: { type: "object", properties: { dir: { type: "string" }, address: { type: "string" } }, required: ["address"] } },
  { name: "tf_untaint", description: "Remove taint from resource", inputSchema: { type: "object", properties: { dir: { type: "string" }, address: { type: "string" } }, required: ["address"] } },
  { name: "tf_show_plan", description: "Show saved plan file", inputSchema: { type: "object", properties: { dir: { type: "string" }, plan_file: { type: "string" } }, required: ["plan_file"] } },
  { name: "tf_list_files", description: "List Terraform files in directory", inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "tf_read_file", description: "Read a Terraform file", inputSchema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
  { name: "tf_write_file", description: "Write a Terraform file", inputSchema: { type: "object", properties: { file_path: { type: "string" }, content: { type: "string" } }, required: ["file_path", "content"] } },
];

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  const dir = (args.dir as string) || TERRAFORM_WORKING_DIR;

  switch (name) {
    case "tf_version": { const r = await runTerraform(["version"], dir); return r.stdout || r.stderr; }

    case "tf_init": {
      const tfArgs = ["init", "-no-color"];
      if (args.upgrade) tfArgs.push("-upgrade");
      const r = await runTerraform(tfArgs, dir);
      return r.stdout + r.stderr;
    }

    case "tf_validate": { const r = await runTerraform(["validate", "-no-color"], dir); return r.stdout + r.stderr; }

    case "tf_plan": {
      const tfArgs = ["plan", "-no-color"];
      if (args.out) tfArgs.push(`-out=${args.out}`);
      if (args.target) tfArgs.push(`-target=${args.target}`);
      if (args.var) for (const [k, v] of Object.entries(args.var as object)) tfArgs.push(`-var=${k}=${v}`);
      const r = await runTerraform(tfArgs, dir);
      return r.stdout + r.stderr;
    }

    case "tf_apply": {
      const tfArgs = ["apply", "-no-color"];
      if (args.auto_approve) tfArgs.push("-auto-approve");
      if (args.target) tfArgs.push(`-target=${args.target}`);
      if (args.var) for (const [k, v] of Object.entries(args.var as object)) tfArgs.push(`-var=${k}=${v}`);
      if (args.plan_file) tfArgs.push(args.plan_file as string);
      const r = await runTerraform(tfArgs, dir);
      return r.stdout + r.stderr;
    }

    case "tf_destroy": {
      const tfArgs = ["destroy", "-no-color"];
      if (args.auto_approve) tfArgs.push("-auto-approve");
      if (args.target) tfArgs.push(`-target=${args.target}`);
      const r = await runTerraform(tfArgs, dir);
      return r.stdout + r.stderr;
    }

    case "tf_output": {
      const tfArgs = ["output", "-no-color"];
      if (args.json) tfArgs.push("-json");
      if (args.name) tfArgs.push(args.name as string);
      const r = await runTerraform(tfArgs, dir);
      return r.stdout || r.stderr;
    }

    case "tf_state_list": { const r = await runTerraform(["state", "list"], dir); return r.stdout || r.stderr; }
    case "tf_state_show": { const r = await runTerraform(["state", "show", args.address as string], dir); return r.stdout || r.stderr; }
    case "tf_state_rm": { const r = await runTerraform(["state", "rm", args.address as string], dir); return r.stdout + r.stderr; }
    case "tf_state_mv": { const r = await runTerraform(["state", "mv", args.source as string, args.destination as string], dir); return r.stdout + r.stderr; }
    case "tf_import": { const r = await runTerraform(["import", args.address as string, args.id as string], dir); return r.stdout + r.stderr; }
    case "tf_refresh": { const r = await runTerraform(["refresh", "-no-color"], dir); return r.stdout + r.stderr; }

    case "tf_fmt": {
      const tfArgs = ["fmt"];
      if (args.check) tfArgs.push("-check");
      if (args.recursive) tfArgs.push("-recursive");
      const r = await runTerraform(tfArgs, dir);
      return r.code === 0 ? "Formatting OK" + (r.stdout ? `\n${r.stdout}` : "") : r.stdout + r.stderr;
    }

    case "tf_workspace_list": { const r = await runTerraform(["workspace", "list"], dir); return r.stdout || r.stderr; }
    case "tf_workspace_select": { const r = await runTerraform(["workspace", "select", args.name as string], dir); return r.stdout + r.stderr; }
    case "tf_workspace_new": { const r = await runTerraform(["workspace", "new", args.name as string], dir); return r.stdout + r.stderr; }
    case "tf_workspace_delete": { const r = await runTerraform(["workspace", "delete", args.name as string], dir); return r.stdout + r.stderr; }
    case "tf_providers": { const r = await runTerraform(["providers"], dir); return r.stdout || r.stderr; }
    case "tf_graph": { const r = await runTerraform(["graph"], dir); return r.stdout || r.stderr; }
    case "tf_taint": { const r = await runTerraform(["taint", args.address as string], dir); return r.stdout + r.stderr; }
    case "tf_untaint": { const r = await runTerraform(["untaint", args.address as string], dir); return r.stdout + r.stderr; }
    case "tf_show_plan": { const r = await runTerraform(["show", "-no-color", args.plan_file as string], dir); return r.stdout || r.stderr; }

    case "tf_list_files": {
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".tf") || f.endsWith(".tfvars") || f.endsWith(".tfstate"));
      return files.length ? files.join("\n") : "No Terraform files found";
    }

    case "tf_read_file": {
      const filePath = path.resolve(dir, args.file_path as string);
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      return fs.readFileSync(filePath, "utf-8");
    }

    case "tf_write_file": {
      const filePath = path.resolve(dir, args.file_path as string);
      fs.writeFileSync(filePath, args.content as string);
      return `File written: ${filePath}`;
    }

    default: throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server({ name: "terraform-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args as Record<string, unknown>);
    return { content: [{ type: "text", text: result }] };
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Terraform MCP server running");
}
main().catch(console.error);
