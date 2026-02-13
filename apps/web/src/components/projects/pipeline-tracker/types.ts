import type { LucideIcon } from "lucide-react";
import type { PipelineStage } from "@contenthq/shared";

export type StageStatus = "pending" | "active" | "completed" | "failed";

export interface ConsolidatedStage {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
  colorEnd: string;
  rawStages: PipelineStage[];
  primaryStage: PipelineStage;
}

export interface ConsolidatedStageWithStatus extends ConsolidatedStage {
  status: StageStatus;
  isSelected: boolean;
}

export interface PipelineProgressTrackerProps {
  currentStage: PipelineStage | null;
  projectStatus: string;
  progressPercent?: number;
  selectedStage?: PipelineStage | null;
  onStageSelect?: (stage: PipelineStage) => void;
}
