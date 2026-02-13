"use client";

import type { FC } from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { env } from "@/lib/env";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Send,
  Loader2,
  RotateCcw,
  Settings,
  ImageIcon,
  History,
} from "lucide-react";
import { MultiModelSelector } from "./multi-model-selector";
import { MultiAspectRatioSelector } from "./multi-aspect-ratio-selector";
import { MultiQualitySelector } from "./multi-quality-selector";
import { ChatEditResultsGrid } from "./chat-edit-results-grid";
import { ImageZoomModal } from "./image-zoom-modal";
import { ChatHistoryPanel } from "./chat-history-panel";
import { FileUploader } from "@/components/file-uploader";
import type { ChatEditMessage } from "./chat-edit-types";

interface GeneratedMedia {
  id: string;
  mediaUrl: string | null;
  prompt: string;
  model: string;
  provider: string;
  mediaType: string;
  aspectRatio: string;
  quality: string;
}

interface ChatEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: GeneratedMedia;
  onSuccess?: () => void;
  initialConversationId?: string;
}

export const ChatEditModal: FC<ChatEditModalProps> = ({
  open,
  onOpenChange,
  media,
  onSuccess,
  initialConversationId,
}) => {
  // Source image state
  const [sourceMediaId, setSourceMediaId] = useState(media.id);
  const [sourceMediaUrl, setSourceMediaUrl] = useState(media.mediaUrl ?? "");
  const originalMediaId = media.id;
  const originalMediaUrl = media.mediaUrl ?? "";

  // Settings state
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedRatios, setSelectedRatios] = useState<string[]>(["1:1"]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([
    "standard",
  ]);
  const [strength, setStrength] = useState([0.5]);
  const [showStrength, setShowStrength] = useState(false);

  // Reference image
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
    null
  );
  const [isUploadingReference, setIsUploadingReference] = useState(false);

  // Chat state
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatEditMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );

  // Progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Zoom modal
  const [zoomImages, setZoomImages] = useState<
    Array<{ url: string; prompt?: string; model?: string }>
  >([]);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Queries
  const { data: editableModels, isLoading: modelsLoading } =
    trpc.mediaGeneration.getEditableModels.useQuery(undefined, {
      enabled: open,
    });

  const utils = trpc.useUtils();

  // Auto-select first model when models load
  useEffect(() => {
    if (editableModels && editableModels.length > 0 && selectedModels.length === 0) {
      setSelectedModels([editableModels[0]!.id]);
    }
  }, [editableModels, selectedModels.length]);

  // Check if any Replicate model is selected (for strength slider)
  useEffect(() => {
    if (!editableModels) return;
    const hasReplicate = selectedModels.some((modelId) => {
      const model = editableModels.find((m) => m.id === modelId);
      return model?.provider === "replicate";
    });
    setShowStrength(hasReplicate);
  }, [selectedModels, editableModels]);

  // Mutation
  const chatEditMutation = trpc.mediaGeneration.chatEdit.useMutation({
    onSuccess: (data) => {
      stopTimer();
      setIsGenerating(false);

      const assistantMessage: ChatEditMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        results: data.results,
        summary: data.summary,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);

      if (data.summary.failed > 0 && data.summary.succeeded > 0) {
        toast.warning(
          `${data.summary.succeeded} succeeded, ${data.summary.failed} failed`
        );
      } else if (data.summary.failed > 0) {
        toast.error("All combinations failed");
      } else {
        toast.success(`${data.summary.succeeded} edits completed`);
      }
    },
    onError: (error) => {
      stopTimer();
      setIsGenerating(false);
      toast.error(error.message || "Failed to edit media");
    },
  });

  // Timer
  const startTimer = useCallback(() => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Combination count
  const combinationCount = useMemo(() => {
    return (
      selectedModels.length *
      selectedRatios.length *
      selectedQualities.length
    );
  }, [selectedModels.length, selectedRatios.length, selectedQualities.length]);

  // Models formatted for selector
  const formattedModels = useMemo(() => {
    if (!editableModels) return [];
    return editableModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      capabilities: {
        supportsEditing: m.capabilities.supportsEditing,
        supportsStyle: m.capabilities.supportsStyle,
      },
    }));
  }, [editableModels]);

  // Handlers
  const handleSend = () => {
    if (!prompt.trim() || selectedModels.length === 0 || isGenerating) return;

    const userMessage: ChatEditMessage = {
      id: crypto.randomUUID(),
      role: "user",
      prompt: prompt.trim(),
      settings: {
        models: selectedModels,
        aspectRatios: selectedRatios as ChatEditMessage["settings"] extends undefined ? never : NonNullable<ChatEditMessage["settings"]>["aspectRatios"],
        qualities: selectedQualities as ChatEditMessage["settings"] extends undefined ? never : NonNullable<ChatEditMessage["settings"]>["qualities"],
        strength: showStrength ? strength[0] : undefined,
        referenceImageUrl: referenceImageUrl ?? undefined,
      },
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);
    startTimer();

    chatEditMutation.mutate({
      sourceMediaId,
      editPrompt: prompt.trim(),
      models: selectedModels,
      aspectRatios: selectedRatios as Array<"1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9">,
      qualities: selectedQualities as Array<"standard" | "hd">,
      strength: showStrength ? strength[0] : undefined,
      referenceImageUrl: referenceImageUrl ?? undefined,
      conversationId,
    });

    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUseAsSource = (mediaUrl: string, generatedMediaId: string) => {
    setSourceMediaId(generatedMediaId);
    setSourceMediaUrl(mediaUrl);
    toast.success("Source image updated");
  };

  const handleResetSource = () => {
    setSourceMediaId(originalMediaId);
    setSourceMediaUrl(originalMediaUrl);
    toast.success("Source image reset to original");
  };

  const handleZoom = (
    images: Array<{ url: string; prompt?: string; model?: string }>,
    index: number
  ) => {
    setZoomImages(images);
    setZoomIndex(index);
    setShowZoom(true);
  };

  const handleReferenceUpload = async (files: File[]) => {
    if (files.length === 0) {
      setReferenceImageUrl(null);
      return;
    }

    const file = files[0]!;
    setIsUploadingReference(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/reference-upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setReferenceImageUrl(data.data.url);
      toast.success("Reference image uploaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload reference image"
      );
    } finally {
      setIsUploadingReference(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setMessages([]);
    toast.success("Conversation loaded");
  };

  const handleClose = () => {
    stopTimer();
    setMessages([]);
    setPrompt("");
    setConversationId(undefined);
    setSourceMediaId(media.id);
    setSourceMediaUrl(media.mediaUrl ?? "");
    setReferenceImageUrl(null);
    setIsGenerating(false);
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
    void utils.mediaGeneration.list.invalidate();
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[90vh] w-full p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle>Chat to Edit</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 min-h-0">
              {/* Left Panel */}
              <div className="w-[400px] border-r flex flex-col shrink-0">
                <Tabs defaultValue="settings" className="flex flex-col h-full">
                  <TabsList className="mx-4 mt-4 shrink-0">
                    <TabsTrigger value="settings" className="gap-1.5">
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="reference" className="gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Reference
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="settings"
                    className="flex-1 overflow-hidden mt-0"
                  >
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-6">
                        {/* Source Image */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Source Image</Label>
                            {sourceMediaId !== originalMediaId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetSource}
                                className="gap-1 h-7"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                              </Button>
                            )}
                          </div>
                          {sourceMediaUrl && (
                            <div className="relative aspect-square rounded-lg border overflow-hidden">
                              <Image
                                src={sourceMediaUrl}
                                alt="Source image"
                                fill
                                className="object-cover"
                                sizes="400px"
                              />
                            </div>
                          )}
                          {sourceMediaId !== originalMediaId && (
                            <Badge variant="secondary" className="text-xs">
                              Using edited version
                            </Badge>
                          )}
                        </div>

                        {/* Model Selector */}
                        <div className="space-y-2">
                          <Label>Models</Label>
                          {modelsLoading ? (
                            <p className="text-sm text-muted-foreground">
                              Loading models...
                            </p>
                          ) : (
                            <MultiModelSelector
                              models={formattedModels}
                              selectedModels={selectedModels}
                              onChange={setSelectedModels}
                              disabled={isGenerating}
                              maxSelectable={5}
                            />
                          )}
                        </div>

                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                          <Label>Aspect Ratios</Label>
                          <MultiAspectRatioSelector
                            selectedRatios={selectedRatios}
                            onChange={setSelectedRatios}
                            disabled={isGenerating}
                          />
                        </div>

                        {/* Quality */}
                        <div className="space-y-2">
                          <Label>Quality</Label>
                          <MultiQualitySelector
                            selectedQualities={selectedQualities}
                            onChange={setSelectedQualities}
                            disabled={isGenerating}
                          />
                        </div>

                        {/* Strength Slider */}
                        {showStrength && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Edit Strength</Label>
                              <span className="text-sm text-muted-foreground">
                                {strength[0]?.toFixed(2)}
                              </span>
                            </div>
                            <Slider
                              value={strength}
                              onValueChange={setStrength}
                              min={0}
                              max={1}
                              step={0.05}
                              disabled={isGenerating}
                            />
                            <p className="text-xs text-muted-foreground">
                              Lower = more original, Higher = more changes
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="reference"
                    className="flex-1 overflow-hidden mt-0"
                  >
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Reference Image (Optional)</Label>
                        <p className="text-xs text-muted-foreground">
                          Upload a reference image to guide the edit style
                        </p>
                      </div>
                      {referenceImageUrl ? (
                        <div className="space-y-3">
                          <div className="relative aspect-square rounded-lg border overflow-hidden">
                            <Image
                              src={referenceImageUrl}
                              alt="Reference image"
                              fill
                              className="object-cover"
                              sizes="400px"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReferenceImageUrl(null)}
                            className="w-full"
                          >
                            Remove Reference
                          </Button>
                        </div>
                      ) : (
                        <FileUploader
                          accept="image/png,image/jpeg,image/webp"
                          maxSize={10 * 1024 * 1024}
                          maxFiles={1}
                          onUpload={handleReferenceUpload}
                          disabled={isUploadingReference || isGenerating}
                        />
                      )}
                      {isUploadingReference && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="history"
                    className="flex-1 overflow-hidden mt-0"
                  >
                    <ChatHistoryPanel
                      onSelectConversation={handleSelectConversation}
                      currentConversationId={conversationId}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Panel - Chat */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Messages */}
                <ScrollArea className="flex-1 px-6">
                  <div className="py-4 space-y-6">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-muted p-6 mb-4">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Start editing
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          Select models and settings on the left, then describe
                          the changes you want to make to your image.
                        </p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div key={msg.id}>
                        {msg.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] rounded-lg bg-primary px-4 py-3 text-primary-foreground">
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.prompt}
                              </p>
                              {msg.settings && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-primary-foreground/20"
                                  >
                                    {msg.settings.models.length} model
                                    {msg.settings.models.length !== 1
                                      ? "s"
                                      : ""}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-primary-foreground/20"
                                  >
                                    {msg.settings.aspectRatios.length} ratio
                                    {msg.settings.aspectRatios.length !== 1
                                      ? "s"
                                      : ""}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {msg.summary && (
                              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                                <span>
                                  {msg.summary.succeeded} of{" "}
                                  {msg.summary.totalCombinations} completed
                                </span>
                                {msg.summary.failed > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {msg.summary.failed} failed
                                  </Badge>
                                )}
                              </div>
                            )}
                            {msg.results && (
                              <ChatEditResultsGrid
                                results={msg.results}
                                onUseAsSource={handleUseAsSource}
                                onZoom={handleZoom}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Progress indicator */}
                    {isGenerating && (
                      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              Generating {combinationCount} combination
                              {combinationCount !== 1 ? "s" : ""}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Elapsed: {formatElapsedTime(elapsedTime)}
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full animate-pulse"
                            style={{ width: "60%" }}
                          />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Bar */}
                <div className="border-t px-6 py-4 shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Textarea
                        placeholder="Describe the changes you want to make... (Cmd+Enter to send)"
                        value={prompt}
                        onChange={(e) => {
                          if (e.target.value.length <= 4000) {
                            setPrompt(e.target.value);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        className="resize-none"
                        disabled={isGenerating}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {prompt.length} / 4000
                        </span>
                        {combinationCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {combinationCount} combination
                            {combinationCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={
                        !prompt.trim() ||
                        selectedModels.length === 0 ||
                        isGenerating
                      }
                      size="default"
                      className="shrink-0"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoom Modal */}
      {showZoom && zoomImages.length > 0 && (
        <ImageZoomModal
          open={showZoom}
          onOpenChange={setShowZoom}
          images={zoomImages}
          initialIndex={zoomIndex}
        />
      )}
    </>
  );
};
