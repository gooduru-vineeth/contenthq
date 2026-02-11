"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentForm } from "@/components/admin/agent-form";
import { trpc } from "@/lib/trpc";
import type { AgentType, AgentStatus } from "@contenthq/shared";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const utils = trpc.useUtils();

  const [variablesJson, setVariablesJson] = useState("{}");
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [revertVersion, setRevertVersion] = useState<number | null>(null);

  const { data: agent, isLoading } = trpc.agent.getById.useQuery({ id: agentId });
  const { data: versionHistory } = trpc.agent.getVersionHistory.useQuery({
    agentId,
    limit: 10,
  });

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Agent updated successfully");
      utils.agent.getById.invalidate({ id: agentId });
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update agent: ${error.message}`);
    },
  });

  const executeMutation = trpc.agent.execute.useMutation({
    onSuccess: (data) => {
      toast.success("Agent executed successfully");
      setExecutionResult(JSON.stringify(data, null, 2));
    },
    onError: (error) => {
      toast.error(`Execution failed: ${error.message}`);
      setExecutionResult(`Error: ${error.message}`);
    },
  });

  const revertMutation = trpc.agent.revertToVersion.useMutation({
    onSuccess: () => {
      toast.success("Agent reverted successfully");
      utils.agent.getById.invalidate({ id: agentId });
      utils.agent.getVersionHistory.invalidate({ agentId });
      setRevertVersion(null);
    },
    onError: (error) => {
      toast.error(`Failed to revert: ${error.message}`);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "inactive":
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const handleExecute = () => {
    try {
      const variables = JSON.parse(variablesJson);
      executeMutation.mutate({
        agentId,
        variables,
      });
    } catch {
      toast.error("Invalid JSON in variables");
    }
  };

  const handleRevert = () => {
    if (revertVersion !== null) {
      revertMutation.mutate({
        agentId,
        targetVersion: revertVersion,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading agent...</div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Agent not found</div>
        </div>
      </div>
    );
  }

  const histories = versionHistory?.history ?? [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/agents")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </Button>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {agent.name}
              </h1>
              <Badge
                variant="outline"
                className={getStatusColor(agent.status ?? "draft")}
              >
                {agent.status ?? "draft"}
              </Badge>
              <Badge variant="outline">v{agent.version}</Badge>
            </div>
            {agent.description && (
              <p className="text-muted-foreground">{agent.description}</p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="test">Test Execution</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Update the agent&apos;s settings and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentForm
                defaultValues={{
                  name: agent.name,
                  slug: agent.slug,
                  description: agent.description || undefined,
                  agentType: agent.agentType as AgentType,
                  aiModelId: agent.aiModelId || undefined,
                  systemPrompt: agent.systemPrompt || undefined,
                  promptTemplateId: agent.promptTemplateId || undefined,
                  modelConfig: {
                    temperature: agent.modelConfig?.temperature ?? 0.7,
                    maxTokens: agent.modelConfig?.maxTokens ?? 2000,
                  },
                  outputConfig: agent.outputConfig
                    ? {
                        outputType: (agent.outputConfig.outputType as "text" | "object" | "array") ?? "text",
                        schemaName: agent.outputConfig.schemaName || undefined,
                      }
                    : { outputType: "text" },
                  expectedVariables: agent.expectedVariables ?? [],
                  isDefault: agent.isDefault ?? false,
                  status: (agent.status as AgentStatus) ?? "draft",
                }}
                onSubmit={(values) =>
                  updateMutation.mutate({ id: agentId, ...values })
                }
                isSubmitting={updateMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Execution</CardTitle>
                <CardDescription>
                  Execute the agent with test variables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Variables (JSON)
                  </label>
                  <Textarea
                    placeholder='{"variable": "value"}'
                    value={variablesJson}
                    onChange={(e) => setVariablesJson(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleExecute}
                  disabled={executeMutation.isPending}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {executeMutation.isPending ? "Executing..." : "Execute Agent"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Result</CardTitle>
                <CardDescription>
                  Output from the agent execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {executionResult ? (
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                    {executionResult}
                  </pre>
                ) : (
                  <div className="text-muted-foreground text-center py-8">
                    No execution result yet. Run a test to see output.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                View and revert to previous versions of this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {histories.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {histories.map((version) => (
                        <TableRow key={version.version}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                v{version.version}
                              </span>
                              {version.version === agent.version && (
                                <Badge variant="secondary" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {version.changeNote || "\u2014"}
                          </TableCell>
                          <TableCell className="text-right">
                            {version.version !== agent.version && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevertVersion(version.version)}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Revert
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  No version history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={revertVersion !== null}
        onOpenChange={() => setRevertVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Version {revertVersion}</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version with the configuration from version{" "}
              {revertVersion}. The current version will be preserved in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              <History className="mr-2 h-4 w-4" />
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
