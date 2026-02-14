import { useMemo } from "react";
import type { PipelineStage } from "@contenthq/shared";
import { getStageStatus } from "../pipeline-progress";
import { getConsolidatedStages } from "./constants";
import type { ConsolidatedStageWithStatus, StageStatus } from "./types";

function resolveConsolidatedStatus(
  rawStatuses: StageStatus[],
): StageStatus {
  if (rawStatuses.some((s) => s === "failed")) return "failed";
  if (rawStatuses.some((s) => s === "active")) return "active";
  if (rawStatuses.every((s) => s === "completed")) return "completed";
  return "pending";
}

export function usePipelineStageStatus(
  currentStage: PipelineStage | null,
  projectStatus: string,
  selectedStage: PipelineStage | null,
  pipelineTemplateId?: string | null,
): ConsolidatedStageWithStatus[] {
  return useMemo(() => {
    const stages = getConsolidatedStages(pipelineTemplateId);
    return stages.map((stage) => {
      const rawStatuses = stage.rawStages.map((raw) =>
        getStageStatus(raw, currentStage, projectStatus),
      );
      const status = resolveConsolidatedStatus(rawStatuses);
      const isSelected = selectedStage
        ? stage.rawStages.includes(selectedStage)
        : false;

      return { ...stage, status, isSelected };
    });
  }, [currentStage, projectStatus, selectedStage, pipelineTemplateId]);
}
