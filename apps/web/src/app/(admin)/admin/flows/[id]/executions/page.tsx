"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, formatDuration, intervalToDuration } from "date-fns";
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, Pause, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
interface FlowNodeLogEntry {
  nodeId: string;
  nodeType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
}

export default function FlowExecutionsPage() {
  const params = useParams();
  const flowId = params.id as string;
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  const { data: flow } = trpc.flow.getById.useQuery({ id: flowId });
  const { data: executions, isLoading } = trpc.flowExecution.list.useQuery({
    flowId,
    limit: 50,
  });
  const { data: executionDetail } = trpc.flowExecution.getById.useQuery(
    { id: selectedExecution! },
    { enabled: !!selectedExecution }
  );

  const getStatusBadge = (status: string) => {
    const configs: Record<
      string,
      { variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ElementType }
    > = {
      pending: { variant: "secondary", icon: Clock },
      running: { variant: "default", icon: Loader2 },
      completed: { variant: "outline", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "outline", icon: Ban },
    };
    const config = configs[status] || { variant: "outline", icon: Pause };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
        {status}
      </Badge>
    );
  };

  const getNodeStatusBadge = (status: string) => {
    const configs: Record<
      string,
      { variant: "default" | "secondary" | "outline" | "destructive" }
    > = {
      pending: { variant: "secondary" },
      running: { variant: "default" },
      completed: { variant: "outline" },
      failed: { variant: "destructive" },
      skipped: { variant: "outline" },
    };
    return (
      <Badge variant={configs[status]?.variant || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  const formatDurationMs = (ms: number | null) => {
    if (!ms) return "N/A";
    const duration = intervalToDuration({ start: 0, end: ms });
    return formatDuration(duration, { format: ["minutes", "seconds"] }) || `${ms}ms`;
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/flows/${flowId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution History</h1>
          {flow && (
            <p className="text-muted-foreground">
              {flow.name} • Version {flow.version}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !executions || executions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No executions yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Current Node</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>{getStatusBadge(execution.status)}</TableCell>
                  <TableCell>
                    {execution.startedAt
                      ? formatDistanceToNow(new Date(execution.startedAt), {
                          addSuffix: true,
                        })
                      : "Not started"}
                  </TableCell>
                  <TableCell>{formatDurationMs(execution.durationMs)}</TableCell>
                  <TableCell>
                    {execution.currentNodeId ? (
                      <code className="text-xs bg-muted px-1 rounded">
                        {execution.currentNodeId}
                      </code>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedExecution(execution.id)}
                    >
                      View Logs
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>Node execution log and status</DialogDescription>
          </DialogHeader>
          {executionDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(executionDetail.status)}
                <div className="text-sm text-muted-foreground">
                  {formatDurationMs(executionDetail.durationMs)}
                </div>
              </div>

              {executionDetail.errorMessage && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-sm text-destructive">Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{executionDetail.errorMessage}</p>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Node Execution Log</h3>
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {(executionDetail.nodeLog ?? []).map((log: FlowNodeLogEntry, index: number) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-1 rounded">
                                {log.nodeId}
                              </code>
                              <Badge variant="secondary" className="text-xs">
                                {log.nodeType}
                              </Badge>
                            </div>
                            {getNodeStatusBadge(log.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {log.startedAt && (
                              <div>
                                <span className="text-muted-foreground">Started:</span>{" "}
                                {new Date(log.startedAt).toLocaleTimeString()}
                              </div>
                            )}
                            {log.completedAt && (
                              <div>
                                <span className="text-muted-foreground">Completed:</span>{" "}
                                {new Date(log.completedAt).toLocaleTimeString()}
                              </div>
                            )}
                            {log.durationMs !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Duration:</span>{" "}
                                {formatDurationMs(log.durationMs)}
                              </div>
                            )}
                          </div>
                          {log.error && (
                            <div className="text-xs text-destructive">
                              <span className="font-medium">Error:</span> {log.error}
                            </div>
                          )}
                          {log.output != null ? (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View result
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                                {JSON.stringify(log.output, null, 2)}
                              </pre>
                            </details>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
