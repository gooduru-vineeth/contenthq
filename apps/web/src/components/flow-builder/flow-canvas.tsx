"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { NodeSidebar } from "./node-sidebar";
import { NodeConfigPanel } from "./node-config-panel";
import { AgentNode } from "./nodes/agent-node";
import { BuiltinNode } from "./nodes/builtin-node";
import { ConditionNode } from "./nodes/condition-node";
import { ParallelNode } from "./nodes/parallel-node";
import { InputNode } from "./nodes/input-node";
import { OutputNode } from "./nodes/output-node";
import type { FlowData, FlowNodeType } from "@contenthq/shared";

type FlowNodeData = {
  label: string;
  nodeType: string;
  [key: string]: unknown;
};

interface FlowCanvasProps {
  flowData: FlowData;
  onSave: (data: FlowData) => void;
}

const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  agent: AgentNode,
  builtin: BuiltinNode,
  condition: ConditionNode,
  parallelFanOut: ParallelNode,
  parallelFanIn: ParallelNode,
  delay: AgentNode,
};

const NODE_TYPE_LABELS: Record<string, string> = {
  input: "Input",
  output: "Output",
  agent: "Agent",
  builtin: "Built-in Action",
  condition: "Condition",
  parallelFanOut: "Parallel Fan-Out",
  parallelFanIn: "Parallel Fan-In",
  delay: "Delay / Approval",
};

export function FlowCanvas({ flowData, onSave }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    flowData.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data as FlowNodeData,
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as FlowNodeType;
      if (!type) return;

      const reactFlowBounds = (event.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: {
          label: NODE_TYPE_LABELS[type] || type,
          nodeType: type,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNodes((nds) => [...nds, newNode as any]);
    },
    [setNodes]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...updates },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const handleSave = useCallback(() => {
    const savedData: FlowData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type || "agent") as FlowNodeType,
        position: n.position,
        data: n.data as FlowData["nodes"][number]["data"],
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        label: e.label as string | undefined,
      })),
    };
    onSave(savedData);
  }, [nodes, edges, onSave]);

  return (
    <div className="flex h-screen w-full">
      <NodeSidebar />

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right" className="space-x-2">
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Flow
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
