export const FLOW_NODE_TYPES = [
  "input",
  "output",
  "agent",
  "builtin",
  "condition",
  "parallelFanOut",
  "parallelFanIn",
  "delay",
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export const FLOW_STATUSES = ["active", "inactive", "draft"] as const;
export type FlowStatus = (typeof FLOW_STATUSES)[number];

export const FLOW_EXECUTION_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type FlowExecutionStatus = (typeof FLOW_EXECUTION_STATUSES)[number];

export const BUILTIN_ACTIONS = [
  "ingestion",
  "tts_generation",
  "audio_mixing",
  "video_assembly",
  "video_generation",
  "speech_generation",
  "media_generation",
] as const;
export type BuiltinAction = (typeof BUILTIN_ACTIONS)[number];

export interface FlowNodePosition {
  x: number;
  y: number;
}

export interface FlowNodeData {
  [key: string]: unknown;
  label: string;
  nodeType: FlowNodeType;
  /** For agent nodes: the agent ID to execute */
  agentId?: string;
  /** For builtin nodes: the action to perform */
  builtinAction?: BuiltinAction;
  /** For condition nodes: the expression to evaluate */
  conditionExpression?: string;
  /** For parallel fan-out: which data field to iterate */
  iterateField?: string;
  /** For delay nodes: seconds to wait or "manual" */
  delayConfig?: { type: "timer" | "manual"; seconds?: number };
  /** Custom config for any node */
  config?: Record<string, unknown>;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: FlowNodePosition;
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowConfig {
  autoAdvance: boolean;
  parallelScenes: boolean;
  maxRetries: number;
  timeoutMs?: number;
}

export interface FlowNodeLogEntry {
  nodeId: string;
  nodeType: FlowNodeType;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: unknown;
  error?: string;
}

export interface FlowExecutionContext {
  flowExecutionId: string;
  flowId: string;
  projectId: string;
  userId: string;
  /** Data passed between nodes keyed by source node ID */
  nodeOutputs: Record<string, unknown>;
  /** Input data provided to the flow */
  inputData: Record<string, unknown>;
}

export interface Flow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  flowData: FlowData;
  config: FlowConfig | null;
  version: number;
  status: FlowStatus;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  projectId: string;
  userId: string;
  status: FlowExecutionStatus;
  currentNodeId: string | null;
  nodeLog: FlowNodeLogEntry[];
  inputData: Record<string, unknown> | null;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFlowConfig {
  id: string;
  projectId: string;
  flowId: string;
  nodeOverrides: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const FLOW_NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  input: "Input",
  output: "Output",
  agent: "Agent",
  builtin: "Built-in Action",
  condition: "Condition",
  parallelFanOut: "Parallel Fan-Out",
  parallelFanIn: "Parallel Fan-In",
  delay: "Delay / Approval",
};
