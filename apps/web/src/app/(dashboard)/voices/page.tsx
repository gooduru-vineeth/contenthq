"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceProfilesTab } from "@/components/voices/voice-profiles-tab";
import { ClonedVoicesTab } from "@/components/voices/cloned-voices-tab";

export default function VoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voices</h1>
        <p className="text-sm text-muted-foreground">
          Manage your voice profiles and cloned voices
        </p>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Voice Profiles</TabsTrigger>
          <TabsTrigger value="cloned">Cloned Voices</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="mt-6">
          <VoiceProfilesTab />
        </TabsContent>
        <TabsContent value="cloned" className="mt-6">
          <ClonedVoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
