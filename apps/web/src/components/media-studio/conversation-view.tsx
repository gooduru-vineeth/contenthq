"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Loader2,
  Maximize2,
  Download,
  AlertCircle,
} from "lucide-react";
import { MediaZoomModal } from "./media-zoom-modal";

interface ConversationViewProps {
  conversationId: string;
  onBack: () => void;
}

export function ConversationView({
  conversationId,
  onBack,
}: ConversationViewProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [zoomMedia, setZoomMedia] = useState<{
    url: string;
    type: "image" | "video";
    prompt?: string;
    model?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation, isLoading } =
    trpc.mediaGeneration.getConversation.useQuery(
      { id: conversationId },
      {
        refetchInterval: (query) => {
          // Poll every 3s if any assistant message has pending/generating media
          const data = query.state.data;
          if (!data?.messages) return false;
          const hasPending = data.messages.some(
            (msg) =>
              msg.role === "assistant" &&
              msg.generatedMedia &&
              (msg.generatedMedia.status === "pending" ||
                msg.generatedMedia.status === "generating")
          );
          return hasPending ? 3000 : false;
        },
      }
    );

  const { data: models } = trpc.mediaGeneration.getModels.useQuery({
    type: (conversation?.mediaType as "image" | "video") ?? "image",
  });

  const utils = trpc.useUtils();

  const sendMutation = trpc.mediaGeneration.sendMessage.useMutation({
    onSuccess: () => {
      setPrompt("");
      void utils.mediaGeneration.getConversation.invalidate({
        id: conversationId,
      });
      void utils.mediaGeneration.listConversations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // Derive effective model: use selected model or fall back to conversation model
  const effectiveModel = selectedModel ?? conversation?.model ?? "";

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages?.length, scrollToBottom]);

  const handleSend = () => {
    if (!prompt.trim()) return;

    sendMutation.mutate({
      conversationId,
      prompt: prompt.trim(),
      model: effectiveModel || undefined,
      mediaType: (conversation?.mediaType as "image" | "video") ?? undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = useCallback((url: string, type: string) => {
    const timestamp = new Date().getTime();
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated-${type}-${timestamp}.${type === "image" ? "png" : "mp4"}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Conversation not found.</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {conversation.title || conversation.initialPrompt}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {conversation.model}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {conversation.mediaType}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {conversation.messageCount} messages
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-lg bg-primary px-4 py-3 text-primary-foreground">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[80%] space-y-2">
                  {msg.generatedMedia ? (
                    <div className="rounded-lg border bg-card overflow-hidden">
                      {msg.generatedMedia.status === "completed" &&
                      msg.generatedMedia.mediaUrl ? (
                        <div>
                          <div className="relative">
                            {msg.generatedMedia.mediaType === "image" ? (
                              <div className="relative aspect-square max-w-sm">
                                <Image
                                  src={msg.generatedMedia.mediaUrl}
                                  alt={msg.generatedMedia.prompt}
                                  fill
                                  className="object-cover rounded-t-lg"
                                  sizes="(max-width: 768px) 80vw, 384px"
                                />
                              </div>
                            ) : (
                              <video
                                src={msg.generatedMedia.mediaUrl}
                                controls
                                className="w-full max-w-sm rounded-t-lg"
                              />
                            )}
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {msg.generatedMedia.model}
                              </Badge>
                              {msg.generatedMedia.generationTimeMs && (
                                <span className="text-xs text-muted-foreground">
                                  {(
                                    msg.generatedMedia.generationTimeMs / 1000
                                  ).toFixed(1)}
                                  s
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setZoomMedia({
                                    url: msg.generatedMedia!.mediaUrl!,
                                    type: msg.generatedMedia!
                                      .mediaType as "image" | "video",
                                    prompt: msg.generatedMedia!.prompt,
                                    model: msg.generatedMedia!.model,
                                  })
                                }
                              >
                                <Maximize2 className="h-3.5 w-3.5 mr-1" />
                                Zoom
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDownload(
                                    msg.generatedMedia!.mediaUrl!,
                                    msg.generatedMedia!.mediaType
                                  )
                                }
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : msg.generatedMedia.status === "pending" ||
                        msg.generatedMedia.status === "generating" ? (
                        <div className="flex items-center gap-3 p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {msg.generatedMedia.status === "pending"
                                ? "Queued..."
                                : "Generating..."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {msg.generatedMedia.model}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 text-destructive">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">
                              Generation failed
                            </p>
                            {msg.generatedMedia.errorMessage && (
                              <p className="text-xs mt-1">
                                {msg.generatedMedia.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t pt-4 mt-auto space-y-3">
        {models && models.length > 0 && (
          <div className="sm:hidden">
            <Select
              value={effectiveModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Refine your generation... (Cmd+Enter to send)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none"
              disabled={sendMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            {models && models.length > 0 && (
              <Select
                value={effectiveModel}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger className="w-[180px] hidden sm:flex">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={handleSend}
              disabled={!prompt.trim() || sendMutation.isPending}
              size="default"
            >
              {sendMutation.isPending ? (
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

      {/* Zoom Modal */}
      {zoomMedia && (
        <MediaZoomModal
          open={!!zoomMedia}
          onOpenChange={(open) => {
            if (!open) setZoomMedia(null);
          }}
          mediaUrl={zoomMedia.url}
          mediaType={zoomMedia.type}
          prompt={zoomMedia.prompt}
          model={zoomMedia.model}
        />
      )}
    </div>
  );
}
