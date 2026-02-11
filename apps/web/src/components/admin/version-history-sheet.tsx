"use client";

import { useState } from "react";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface VersionEntry {
  id: string;
  version: number;
  name: string;
  content: string;
  description?: string | null;
  editedBy?: string | null;
  changeNote?: string | null;
  createdAt: Date;
}

interface VersionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentVersion: number;
  currentContent: string;
  currentName: string;
  history: VersionEntry[];
  onRevert: (targetVersion: number) => void;
  isReverting?: boolean;
}

export function VersionHistorySheet({
  open,
  onOpenChange,
  title,
  currentVersion,
  currentContent,
  currentName,
  history,
  onRevert,
  isReverting,
}: VersionHistorySheetProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [revertTarget, setRevertTarget] = useState<VersionEntry | null>(null);

  const toggleExpand = (version: number) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[480px] overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>{title}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {/* Current version */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">v{currentVersion}</Badge>
                  <span className="text-sm font-medium">Current</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {currentName}
              </p>
            </div>

            {/* History entries */}
            {history.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No previous versions found.
              </div>
            )}

            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{entry.version}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(new Date(entry.createdAt))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(entry.version)}
                    >
                      {expandedVersion === entry.version ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevertTarget(entry)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Revert
                    </Button>
                  </div>
                </div>

                <p className="mt-1 text-sm">{entry.name}</p>

                {entry.changeNote && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {entry.changeNote}
                  </p>
                )}

                {expandedVersion === entry.version && (
                  <div className="mt-3 rounded-md bg-muted p-3">
                    <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                      {entry.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Revert Confirmation Dialog */}
      <Dialog
        open={!!revertTarget}
        onOpenChange={(open) => {
          if (!open) setRevertTarget(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revert to Version {revertTarget?.version}?</DialogTitle>
            <DialogDescription>
              This will create a new version with the content from version{" "}
              {revertTarget?.version}. The current state will be preserved in
              history.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">
                Current (v{currentVersion})
              </p>
              <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted p-3">
                <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                  {currentContent}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">
                Target (v{revertTarget?.version})
              </p>
              <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted p-3">
                <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                  {revertTarget?.content}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (revertTarget) {
                  onRevert(revertTarget.version);
                  setRevertTarget(null);
                }
              }}
              disabled={isReverting}
            >
              <RotateCcw className="h-4 w-4" />
              {isReverting ? "Reverting..." : "Confirm Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
