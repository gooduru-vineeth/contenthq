"use client";

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

export default function MediaStudioPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Media Studio</h1>
        <p className="text-muted-foreground">
          Generate and manage AI-powered images and videos
        </p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-6">
          <GenerationForm />
        </TabsContent>
        <TabsContent value="gallery" className="mt-6">
          <GalleryView />
        </TabsContent>
        <TabsContent value="conversations" className="mt-6">
          <p className="text-muted-foreground">
            Conversation history coming soon...
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
