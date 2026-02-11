"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentListTable } from "@/components/admin/agent-list-table";
import { AgentForm } from "@/components/admin/agent-form";
import { trpc } from "@/lib/trpc";
import { AGENT_TYPES, AGENT_TYPE_LABELS } from "@contenthq/shared";
import type { AgentType } from "@contenthq/shared";

export default function AgentsPage() {
  const [selectedType, setSelectedType] = useState<AgentType | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: agents, isLoading } = trpc.agent.list.useQuery(
    selectedType === "all" ? {} : { agentType: selectedType }
  );

  const createMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      toast.success("Agent created successfully");
      utils.agent.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage AI agents and their configurations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
              <DialogDescription>
                Create a new AI agent with custom configuration
              </DialogDescription>
            </DialogHeader>
            <AgentForm
              onSubmit={(values) => createMutation.mutate(values)}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        value={selectedType}
        onValueChange={(value) => setSelectedType(value as AgentType | "all")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {AGENT_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {AGENT_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading agents...</div>
        </div>
      ) : (
        <AgentListTable
          agents={agents || []}
          onAgentDeleted={() => utils.agent.list.invalidate()}
        />
      )}
    </div>
  );
}
