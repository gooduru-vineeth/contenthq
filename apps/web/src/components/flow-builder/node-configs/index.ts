import type { ComponentType } from "react";
import type { FlowNodeType } from "@contenthq/shared";
import type { NodeConfigProps } from "./types";
import { AgentConfig } from "./agent-config";
import { BuiltinConfig } from "./builtin-config";
import { ConditionConfig } from "./condition-config";
import { ParallelConfig } from "./parallel-config";
import { DelayConfig } from "./delay-config";

export const NODE_CONFIG_MAP: Partial<
  Record<FlowNodeType, ComponentType<NodeConfigProps>>
> = {
  agent: AgentConfig,
  builtin: BuiltinConfig,
  condition: ConditionConfig,
  parallelFanOut: ParallelConfig,
  delay: DelayConfig,
};

export type { NodeConfigProps } from "./types";
