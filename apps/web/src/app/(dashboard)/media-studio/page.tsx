"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const GenerationForm = dynamic(
  () => import("@/components/media-studio/generation-form").then((mod) => mod.GenerationForm),
  { loading: () => <Skeleton className="h-96 w-full" /> }
);
const GalleryView = dynamic(
  () => import("@/components/media-studio/gallery-view").then((mod) => mod.GalleryView),
  { loading: () => <Skeleton className="h-96 w-full" /> }
);
const ConversationList = dynamic(
  () => import("@/components/media-studio/conversation-list").then((mod) => mod.ConversationList),
  { loading: () => <Skeleton className="h-96 w-full" /> }
);
const ConversationView = dynamic(
  () => import("@/components/media-studio/conversation-view").then((mod) => mod.ConversationView),
  { loading: () => <Skeleton className="h-96 w-full" /> }
);

export default function MediaStudioPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState("generate");

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setActiveTab("conversations");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Media Studio</h1>
        <p className="text-muted-foreground">
          Generate and manage AI-powered images and videos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v !== "conversations") {
          setSelectedConversationId(null);
        }
      }}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-6">
          <GenerationForm onConversationCreated={handleConversationCreated} />
        </TabsContent>
        <TabsContent value="gallery" className="mt-6">
          <GalleryView />
        </TabsContent>
        <TabsContent value="conversations" className="mt-6">
          {selectedConversationId ? (
            <ConversationView
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
            />
          ) : (
            <ConversationList onSelect={setSelectedConversationId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
