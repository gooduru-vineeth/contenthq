import { db } from "@contenthq/db/client";
import { flowExecutions, flows, projectFlowConfigs, generatedMedia } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import { executeAgent } from "@contenthq/ai";
import {
  addIngestionJob,
  addTTSGenerationJob,
  addAudioMixingJob,
  addVideoAssemblyJob,
  addVideoGenerationJob,
  addSpeechGenerationJob,
  addMediaGenerationJob,
  waitForJobCompletion,
  QUEUE_NAMES,
} from "@contenthq/queue";
import type {
  FlowNode,
  FlowEdge,
  FlowNodeLogEntry,
  FlowExecutionContext,
  FlowData,
} from "@contenthq/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

interface NodeResult {
  data: unknown;
  nextNodeIds: string[];
}

export interface FlowExecutionResult {
  executionId: string;
  status: "completed" | "failed";
  outputData: unknown;
  durationMs: number;
  nodeLog: FlowNodeLogEntry[];
}

export class FlowEngine {
  constructor(private dbInstance: DrizzleDb = db) {}

  async executeFlow(
    flowId: string,
    projectId: string,
    userId: string,
    inputData: Record<string, unknown> = {}
  ): Promise<FlowExecutionResult> {
    const startTime = Date.now();

    // Load flow definition
    const [flow] = await this.dbInstance
      .select()
      .from(flows)
      .where(eq(flows.id, flowId));

    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const flowData = flow.flowData as FlowData;

    // Load node overrides if any
    const [projectConfig] = await this.dbInstance
      .select()
      .from(projectFlowConfigs)
      .where(eq(projectFlowConfigs.projectId, projectId));

    const nodeOverrides = (projectConfig?.nodeOverrides ?? {}) as Record<
      string,
      Record<string, unknown>
    >;

    // Create flow execution record
    const [execution] = await this.dbInstance
      .insert(flowExecutions)
      .values({
        flowId,
        projectId,
        userId,
        status: "running",
        inputData,
        startedAt: new Date(),
      })
      .returning();

    const context: FlowExecutionContext = {
      flowExecutionId: execution.id,
      flowId,
      projectId,
      userId,
      nodeOutputs: {},
      inputData,
    };

    const nodeLog: FlowNodeLogEntry[] = [];

    try {
      // Build adjacency list from edges
      const adjacency = buildAdjacencyList(flowData.edges);
      const nodeMap = new Map(flowData.nodes.map((n) => [n.id, n]));

      // Find start nodes (nodes with no incoming edges)
      const incomingCount = new Map<string, number>();
      for (const node of flowData.nodes) {
        incomingCount.set(node.id, 0);
      }
      for (const edge of flowData.edges) {
        incomingCount.set(
          edge.target,
          (incomingCount.get(edge.target) ?? 0) + 1
        );
      }

      const startNodeIds = flowData.nodes
        .filter((n) => (incomingCount.get(n.id) ?? 0) === 0)
        .map((n) => n.id);

      // Execute nodes in topological order using BFS
      const queue: string[] = [...startNodeIds];
      const visited = new Set<string>();
      const completedNodes = new Set<string>();
      let finalOutput: unknown = null;

      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Apply overrides if any
        const overrideData = nodeOverrides[nodeId];
        const effectiveNode = overrideData
          ? { ...node, data: { ...node.data, ...overrideData } }
          : node;

        // Update current node in execution
        await this.dbInstance
          .update(flowExecutions)
          .set({ currentNodeId: nodeId, updatedAt: new Date() })
          .where(eq(flowExecutions.id, execution.id));

        const logEntry: FlowNodeLogEntry = {
          nodeId,
          nodeType: node.type,
          status: "running",
          startedAt: new Date().toISOString(),
        };

        try {
          const result = await this.executeNode(
            effectiveNode,
            context,
            adjacency
          );
          context.nodeOutputs[nodeId] = result.data;

          logEntry.status = "completed";
          logEntry.completedAt = new Date().toISOString();
          logEntry.result = result.data;
          completedNodes.add(nodeId);

          // If this is an output node, capture the final output
          if (node.type === "output") {
            finalOutput = result.data;
          }

          // Enqueue next nodes
          for (const nextId of result.nextNodeIds) {
            // Check all incoming edges are satisfied
            const incomingEdges = flowData.edges.filter(
              (e) => e.target === nextId
            );
            const allSatisfied = incomingEdges.every((e) =>
              completedNodes.has(e.source)
            );
            if (allSatisfied && !visited.has(nextId)) {
              queue.push(nextId);
            }
          }
        } catch (error) {
          logEntry.status = "failed";
          logEntry.error =
            error instanceof Error ? error.message : String(error);
          nodeLog.push(logEntry);
          throw error;
        }

        nodeLog.push(logEntry);
      }

      const durationMs = Date.now() - startTime;

      // Mark execution as completed
      await this.dbInstance
        .update(flowExecutions)
        .set({
          status: "completed",
          outputData: finalOutput as Record<string, unknown>,
          nodeLog,
          completedAt: new Date(),
          durationMs,
          currentNodeId: null,
          updatedAt: new Date(),
        })
        .where(eq(flowExecutions.id, execution.id));

      return {
        executionId: execution.id,
        status: "completed",
        outputData: finalOutput,
        durationMs,
        nodeLog,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.dbInstance
        .update(flowExecutions)
        .set({
          status: "failed",
          errorMessage,
          nodeLog,
          completedAt: new Date(),
          durationMs,
          updatedAt: new Date(),
        })
        .where(eq(flowExecutions.id, execution.id));

      return {
        executionId: execution.id,
        status: "failed",
        outputData: null,
        durationMs,
        nodeLog,
      };
    }
  }

  private async executeNode(
    node: FlowNode,
    context: FlowExecutionContext,
    adjacency: Map<string, string[]>
  ): Promise<NodeResult> {
    const nextNodeIds = adjacency.get(node.id) ?? [];

    switch (node.type) {
      case "input":
        return { data: context.inputData, nextNodeIds };

      case "output": {
        // Gather all upstream outputs
        const allOutputs = { ...context.nodeOutputs };
        return { data: allOutputs, nextNodeIds };
      }

      case "agent":
        return this.executeAgentNode(node, context, nextNodeIds);

      case "builtin":
        return this.executeBuiltinNode(node, context, nextNodeIds);

      case "condition":
        return this.executeConditionNode(node, context, adjacency);

      case "parallelFanOut":
        return this.executeParallelFanOut(node, context, nextNodeIds);

      case "parallelFanIn":
        return this.executeParallelFanIn(node, context, nextNodeIds);

      case "delay":
        return this.executeDelayNode(node, nextNodeIds);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeAgentNode(
    node: FlowNode,
    context: FlowExecutionContext,
    nextNodeIds: string[]
  ): Promise<NodeResult> {
    const agentId = node.data.agentId;
    if (!agentId) {
      throw new Error(`Agent node "${node.id}" missing agentId`);
    }

    // Build variables from upstream node outputs
    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(context.nodeOutputs)) {
      if (typeof value === "string") {
        variables[key] = value;
      } else if (value && typeof value === "object") {
        for (const [subKey, subValue] of Object.entries(
          value as Record<string, unknown>
        )) {
          if (typeof subValue === "string") {
            variables[subKey] = subValue;
          }
        }
      }
    }

    // Also add input data as variables
    for (const [key, value] of Object.entries(context.inputData)) {
      if (typeof value === "string") {
        variables[key] = value;
      }
    }

    const result = await executeAgent({
      agentId,
      variables,
      projectId: context.projectId,
      userId: context.userId,
      db: this.dbInstance,
    });

    return { data: result.data, nextNodeIds };
  }

  private async executeBuiltinNode(
    node: FlowNode,
    context: FlowExecutionContext,
    nextNodeIds: string[]
  ): Promise<NodeResult> {
    const action = node.data.builtinAction;
    if (!action) {
      throw new Error(`Builtin node "${node.id}" missing builtinAction`);
    }

    const { projectId, userId, flowExecutionId } = context;

    switch (action) {
      case "ingestion": {
        const sourceUrl =
          (context.inputData.sourceUrl as string) ?? "";
        const sourceType =
          (context.inputData.sourceType as string) ?? "url";
        const job = await addIngestionJob({
          projectId,
          userId,
          sourceUrl,
          sourceType,
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.INGESTION,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "tts_generation": {
        const config = node.data.config ?? {};
        const job = await addTTSGenerationJob({
          projectId,
          userId,
          sceneId: config.sceneId as string ?? "",
          narrationScript: config.narrationScript as string ?? "",
          voiceId: config.voiceId as string ?? "alloy",
          provider: config.provider as string ?? "openai",
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.TTS_GENERATION,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "audio_mixing": {
        const config = node.data.config ?? {};
        const job = await addAudioMixingJob({
          projectId,
          userId,
          sceneId: config.sceneId as string ?? "",
          voiceoverUrl: config.voiceoverUrl as string ?? "",
          musicTrackId: (config.musicTrackId as string) ?? null,
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.AUDIO_MIXING,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "video_assembly": {
        const config = node.data.config ?? {};
        const job = await addVideoAssemblyJob({
          projectId,
          userId,
          sceneIds: (config.sceneIds as string[]) ?? [],
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.VIDEO_ASSEMBLY,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "video_generation": {
        const config = node.data.config ?? {};
        const job = await addVideoGenerationJob({
          projectId,
          userId,
          sceneId: config.sceneId as string ?? "",
          imageUrl: config.imageUrl as string ?? "",
          motionSpec: (config.motionSpec as Record<string, unknown>) ?? {},
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.VIDEO_GENERATION,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "speech_generation": {
        const config = node.data.config ?? {};
        // Text can come from config or upstream node outputs
        let text = (config.text as string) ?? "";
        if (!text) {
          for (const output of Object.values(context.nodeOutputs)) {
            if (output && typeof output === "object") {
              const val = (output as Record<string, unknown>).text;
              if (typeof val === "string" && val) {
                text = val;
                break;
              }
            }
          }
        }

        // Create speech generation record
        const speechGenId = crypto.randomUUID();
        const { speechGenerations } = await import("@contenthq/db/schema");
        await this.dbInstance.insert(speechGenerations).values({
          id: speechGenId,
          userId,
          projectId,
          inputText: text,
          provider: (config.provider as string) ?? "openai",
          model: (config.model as string) ?? null,
          voiceId: (config.voiceId as string) ?? "alloy",
          voiceSettings:
            (config.voiceSettings as Record<string, unknown>) ?? null,
          audioFormat: (config.audioFormat as string) ?? "mp3",
          status: "pending",
          progress: 0,
          flowExecutionId,
          flowNodeId: node.id,
        });

        const job = await addSpeechGenerationJob({
          speechGenerationId: speechGenId,
          userId,
          projectId,
          text,
          provider: (config.provider as string) ?? "openai",
          model: config.model as string | undefined,
          voiceId: (config.voiceId as string) ?? "alloy",
          voiceSettings: config.voiceSettings as
            | Record<string, unknown>
            | undefined,
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.SPEECH_GENERATION,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      case "media_generation": {
        const config = node.data.config ?? {};
        const prompt =
          (config.prompt as string) ??
          (context.inputData.prompt as string) ??
          "";
        const mediaType =
          (config.mediaType as string) ?? "image";
        const model =
          (config.model as string) ?? "dall-e-3";
        const provider =
          (config.provider as string) ?? "openai";
        const aspectRatio =
          (config.aspectRatio as string) ?? "1:1";
        const quality =
          (config.quality as string) ?? "standard";
        const duration = config.duration as number | undefined;
        const mediaCount = (config.count as number) ?? 1;

        // Create placeholder record
        const mediaId = crypto.randomUUID();
        await this.dbInstance.insert(generatedMedia).values({
          id: mediaId,
          userId,
          projectId,
          mediaType: mediaType as "image" | "video",
          prompt,
          model,
          provider,
          aspectRatio,
          quality,
          status: "pending",
          flowExecutionId,
          flowNodeId: node.id,
        });

        const job = await addMediaGenerationJob({
          userId,
          projectId,
          generatedMediaId: mediaId,
          prompt,
          mediaType: mediaType as "image" | "video",
          model,
          provider,
          aspectRatio,
          quality,
          duration,
          count: mediaCount,
          flowExecutionId,
          flowNodeId: node.id,
        });
        const result = await waitForJobCompletion(
          QUEUE_NAMES.MEDIA_GENERATION,
          job.id!,
          flowExecutionId,
          node.id
        );
        return { data: result, nextNodeIds };
      }

      default:
        throw new Error(`Unknown builtin action: ${action}`);
    }
  }

  private async executeConditionNode(
    node: FlowNode,
    context: FlowExecutionContext,
    adjacency: Map<string, string[]>
  ): Promise<NodeResult> {
    const expression = node.data.conditionExpression;
    if (!expression) {
      throw new Error(`Condition node "${node.id}" missing conditionExpression`);
    }

    // Simple expression evaluation using upstream outputs
    let conditionResult = false;
    try {
      // Support simple key-based checks like "nodeOutputs.storyWriter.scenes.length > 0"
      const evalContext = {
        nodeOutputs: context.nodeOutputs,
        inputData: context.inputData,
      };
       
      const fn = new Function(
        "ctx",
        `with(ctx) { return ${expression}; }`
      );
      conditionResult = Boolean(fn(evalContext));
    } catch {
      console.warn(
        `[FlowEngine] Failed to evaluate condition: ${expression}`
      );
    }

    // Find edges from this node — by convention, edges with label "true"/"false"
    // or sourceHandle "true"/"false" determine which path to take
    const outEdges = (adjacency.get(node.id) ?? []).map((targetId) => targetId);

    // For simplicity: if condition is true, follow all next nodes
    // In a more advanced implementation, edges would have labels
    return { data: { conditionResult }, nextNodeIds: outEdges };
  }

  private async executeParallelFanOut(
    node: FlowNode,
    context: FlowExecutionContext,
    nextNodeIds: string[]
  ): Promise<NodeResult> {
    const iterateField = node.data.iterateField;
    if (!iterateField) {
      return { data: context.nodeOutputs, nextNodeIds };
    }

    // Find the array to iterate from upstream outputs
    let items: unknown[] = [];
    for (const output of Object.values(context.nodeOutputs)) {
      if (output && typeof output === "object") {
        const val = (output as Record<string, unknown>)[iterateField];
        if (Array.isArray(val)) {
          items = val;
          break;
        }
      }
    }

    return { data: { items, count: items.length }, nextNodeIds };
  }

  private async executeParallelFanIn(
    node: FlowNode,
    context: FlowExecutionContext,
    nextNodeIds: string[]
  ): Promise<NodeResult> {
    // Merge all upstream node outputs
    return { data: context.nodeOutputs, nextNodeIds };
  }

  private async executeDelayNode(
    node: FlowNode,
    nextNodeIds: string[]
  ): Promise<NodeResult> {
    const config = node.data.delayConfig;
    if (config?.type === "timer" && config.seconds) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.seconds! * 1000)
      );
    }
    // For "manual" type, in a full implementation this would pause and wait
    // for external approval. For now, pass through.
    return { data: { delayed: true }, nextNodeIds };
  }
}

function buildAdjacencyList(edges: FlowEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }
  return adjacency;
}

export const flowEngine = new FlowEngine();
