"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Flame,
  Zap,
  Server,
  Cpu,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ────────────────────────────────────────────────────────────────

type DateRange = "7" | "14" | "30" | "90";

// ── Helpers ──────────────────────────────────────────────────────────────

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0]!,
    endDate: end.toISOString().split("T")[0]!,
  };
}

function getBarWidth(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-500",
  anthropic: "bg-orange-500",
  google: "bg-blue-500",
  "fal.ai": "bg-purple-500",
  replicate: "bg-pink-500",
  elevenlabs: "bg-yellow-500",
  xai: "bg-red-500",
};

function getProviderColor(provider: string | null): string {
  if (!provider) return "bg-gray-400";
  const key = provider.toLowerCase();
  for (const [k, v] of Object.entries(PROVIDER_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-slate-500";
}

// ── Components ───────────────────────────────────────────────────────────

function HorizontalBar({
  label,
  sublabel,
  value,
  maxValue,
  colorClass,
  suffix,
}: {
  label: string;
  sublabel?: string;
  value: number;
  maxValue: number;
  colorClass: string;
  suffix?: string;
}) {
  const width = getBarWidth(value, maxValue);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{label}</span>
          {sublabel && (
            <span className="text-[10px] text-muted-foreground truncate">
              {sublabel}
            </span>
          )}
        </div>
        <span className="font-mono text-sm shrink-0 ml-2">
          {value.toLocaleString()}
          {suffix ?? ""}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function UsageTimeline({
  data,
}: {
  data: { date: string; totalCreditsUsed: number; totalRequests: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No usage data for this period
      </p>
    );
  }

  const maxCredits = Math.max(...data.map((d) => d.totalCreditsUsed));

  return (
    <div className="space-y-0.5">
      {data.map((day) => {
        const height = getBarWidth(day.totalCreditsUsed, maxCredits);
        const dateLabel = new Date(day.date + "T00:00:00").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        );

        return (
          <TooltipProvider key={day.date}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 group cursor-default">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0 text-right">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-4 rounded-sm bg-secondary">
                    <div
                      className="h-full rounded-sm bg-primary/80 group-hover:bg-primary transition-colors"
                      style={{ width: `${height}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">
                    {day.totalCreditsUsed.toLocaleString()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div>Date: {day.date}</div>
                  <div>Credits: {day.totalCreditsUsed.toLocaleString()}</div>
                  <div>Requests: {day.totalRequests.toLocaleString()}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30");

  const { startDate, endDate } = useMemo(
    () => getDateRange(parseInt(range)),
    [range]
  );

  // ── Queries ────────────────────────────────────────────────────────────

  const { data: burnRate, isPending: burnPending } =
    trpc.analytics.getBurnRate.useQuery({ days: parseInt(range) });

  const { data: usageData, isPending: usagePending } =
    trpc.analytics.getMyUsage.useQuery({
      startDate,
      endDate,
      groupBy: "day",
    });

  const { data: modelUsage, isPending: modelPending } =
    trpc.analytics.getUsageByModel.useQuery({ startDate, endDate });

  const { data: providerUsage, isPending: providerPending } =
    trpc.analytics.getUsageByProvider.useQuery({ startDate, endDate });

  // ── Derived Data ───────────────────────────────────────────────────────

  const timelineData = useMemo(() => {
    if (!usageData) return [];
    if (usageData.source === "summaries") {
      return usageData.data.map((s) => ({
        date: s.date,
        totalCreditsUsed: s.totalCreditsUsed ?? 0,
        totalRequests: s.totalRequests ?? 0,
      }));
    }
    return usageData.data.map((t) => ({
      date: t.date,
      totalCreditsUsed: t.totalCreditsUsed ?? 0,
      totalRequests: t.totalRequests ?? 0,
    }));
  }, [usageData]);

  const maxModelCredits = useMemo(() => {
    if (!modelUsage || modelUsage.length === 0) return 0;
    return Math.max(...modelUsage.map((m) => m.totalCredits));
  }, [modelUsage]);

  const maxProviderCredits = useMemo(() => {
    if (!providerUsage || providerUsage.length === 0) return 0;
    return Math.max(...providerUsage.map((p) => p.totalCredits));
  }, [providerUsage]);

  const totalProviderCredits = useMemo(() => {
    if (!providerUsage) return 0;
    return providerUsage.reduce((sum, p) => sum + p.totalCredits, 0);
  }, [providerUsage]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Track your credit usage and spending patterns
            </p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Burn Rate Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Flame className="h-4 w-4 text-orange-500" />
                Avg Daily Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burnPending ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {burnRate?.avgDailyCredits.toFixed(1) ?? "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">credits/day</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-red-500" />
                Total Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burnPending ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <div className="text-2xl font-bold font-mono text-red-600">
                    {(burnRate?.totalUsed ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    in last {burnRate?.periodDays ?? range} days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-yellow-500" />
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burnPending ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {(burnRate?.requestCount ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API calls made
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-blue-500" />
                Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burnPending ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {burnRate?.periodDays ?? parseInt(range)}d
                  </div>
                  <p className="text-xs text-muted-foreground">active days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Timeline + Model/Provider Breakdown */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Usage Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Daily Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usagePending ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <UsageTimeline data={timelineData} />
              )}
            </CardContent>
          </Card>

          {/* Usage by Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4" />
                Usage by Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {modelPending ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !modelUsage || modelUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No model usage data
                </p>
              ) : (
                <div className="space-y-3">
                  {modelUsage.slice(0, 10).map((m, i) => (
                    <HorizontalBar
                      key={`${m.model}-${m.provider}-${i}`}
                      label={m.model ?? "Unknown"}
                      sublabel={m.provider ?? undefined}
                      value={m.totalCredits}
                      maxValue={maxModelCredits}
                      colorClass={getProviderColor(m.provider)}
                      suffix={` (${m.requestCount} reqs)`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage by Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4" />
                Usage by Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              {providerPending ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : !providerUsage || providerUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No provider usage data
                </p>
              ) : (
                <div className="space-y-4">
                  {providerUsage.map((p, i) => {
                    const pct =
                      totalProviderCredits > 0
                        ? Math.round(
                            (p.totalCredits / totalProviderCredits) * 100
                          )
                        : 0;
                    return (
                      <div key={`${p.provider}-${i}`} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-3 w-3 rounded-full ${getProviderColor(p.provider)}`}
                            />
                            <span className="font-medium">
                              {p.provider ?? "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {p.requestCount} reqs
                            </Badge>
                            <span className="font-mono text-sm">
                              {p.totalCredits.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({pct}%)
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={getBarWidth(
                            p.totalCredits,
                            maxProviderCredits
                          )}
                          className="h-2"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
