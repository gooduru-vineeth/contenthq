"use client";

import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FlowCanvas } from "@/components/flow-builder/flow-canvas";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { FlowData } from "@contenthq/shared";

export default function FlowEditorPage() {
  const params = useParams();
  const flowId = params.id as string;

  const { data: flow, isLoading } = trpc.flow.getById.useQuery({ id: flowId });
  const updateFlow = trpc.flow.update.useMutation({
    onSuccess: () => {
      toast.success("Flow saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save flow");
    },
  });

  const handleSave = (flowData: FlowData) => {
    updateFlow.mutate({
      id: flowId,
      flowData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-muted-foreground">Flow not found</p>
        <Button asChild>
          <Link href="/flows">Back to Flows</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/flows">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{flow.name}</h1>
            <p className="text-sm text-muted-foreground">
              Version {flow.version} • {flow.status}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/flows/${flowId}/executions`}>
            <History className="h-4 w-4 mr-2" />
            Execution History
          </Link>
        </Button>
      </div>

      <div className="flex-1">
        <FlowCanvas flowData={flow.flowData as FlowData} onSave={handleSave} />
      </div>
    </div>
  );
}
