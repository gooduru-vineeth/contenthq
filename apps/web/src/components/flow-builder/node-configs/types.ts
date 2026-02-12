import type { FlowNodeData } from "@contenthq/shared";

export interface NodeConfigProps {
  data: FlowNodeData;
  onUpdate: (field: string, value: unknown) => void;
}
