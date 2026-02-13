"use client";

import {
  Download,
  Pen,
  Layers,
  Image,
  ShieldCheck,
  Film,
  Mic,
  Music,
  Type,
  Clapperboard,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StagePanel } from "./stage-panel";
import { IngestionConfig } from "./ingestion-config";
import { StoryWritingConfig } from "./story-writing-config";
import { SceneGenerationConfig } from "./scene-generation-config";
import { VisualGenerationConfig } from "./visual-generation-config";
import { VisualVerificationConfig } from "./visual-verification-config";
import { VideoGenerationConfig } from "./video-generation-config";
import { TtsConfig } from "./tts-config";
import { AudioMixingConfig } from "./audio-mixing-config";
import { CaptionConfig } from "./caption-config";
import { AssemblyConfig } from "./assembly-config";

export function StageConfigStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Configuration</CardTitle>
        <CardDescription>
          Configure each stage of the video generation pipeline. Disable stages
          to skip them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StagePanel
          title="Ingestion"
          description="Content extraction settings"
          icon={Download}
          configKey="stageConfigs.ingestion"
        >
          <IngestionConfig />
        </StagePanel>
        <StagePanel
          title="Story Writing"
          description="AI story generation"
          icon={Pen}
          configKey="stageConfigs.storyWriting"
        >
          <StoryWritingConfig />
        </StagePanel>
        <StagePanel
          title="Scene Generation"
          description="Visual scene planning"
          icon={Layers}
          configKey="stageConfigs.sceneGeneration"
        >
          <SceneGenerationConfig />
        </StagePanel>
        <StagePanel
          title="Visual Generation"
          description="Image creation"
          icon={Image}
          configKey="stageConfigs.visualGeneration"
        >
          <VisualGenerationConfig />
        </StagePanel>
        <StagePanel
          title="Visual Verification"
          description="Quality checking"
          icon={ShieldCheck}
          configKey="stageConfigs.visualVerification"
        >
          <VisualVerificationConfig />
        </StagePanel>
        <StagePanel
          title="Video Generation"
          description="Video clip creation"
          icon={Film}
          configKey="stageConfigs.videoGeneration"
        >
          <VideoGenerationConfig />
        </StagePanel>
        <StagePanel
          title="Text-to-Speech"
          description="Voice narration"
          icon={Mic}
          configKey="stageConfigs.tts"
        >
          <TtsConfig />
        </StagePanel>
        <StagePanel
          title="Audio Mixing"
          description="Audio layering and ducking"
          icon={Music}
          configKey="stageConfigs.audioMixing"
        >
          <AudioMixingConfig />
        </StagePanel>
        <StagePanel
          title="Caption Generation"
          description="Subtitle overlay"
          icon={Type}
          configKey="stageConfigs.captionGeneration"
          defaultEnabled={false}
        >
          <CaptionConfig />
        </StagePanel>
        <StagePanel
          title="Final Assembly"
          description="Video compilation"
          icon={Clapperboard}
          configKey="stageConfigs.assembly"
        >
          <AssemblyConfig />
        </StagePanel>
      </CardContent>
    </Card>
  );
}
