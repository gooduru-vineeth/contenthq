"use client";

import { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  Info,
  Activity,
  Flame,
  Gift,
  Megaphone,
  UserCheck,
  Heart,
  Shield,
  Sparkles,
  Star,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ── Types ────────────────────────────────────────────────────────────────

type UserBalance = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  balance: number;
  reservedBalance: number;
  bonusBalance?: number;
  lifetimeCreditsReceived?: number;
  lifetimeCreditsUsed?: number;
  lastUpdated: Date;
};

type Transaction = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string | null;
  jobId: string | null;
  projectId: string | null;
  operationType: string | null;
  provider: string | null;
  model: string | null;
  adminUserId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  inputTokenCost: string | null;
  outputTokenCost: string | null;
  actualCostCredits: string | null;
  billedCostCredits: string | null;
  costMultiplier: string | null;
  costBreakdown: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type DayGroup = {
  dateKey: string;
  dateLabel: string;
  transactions: Transaction[];
  dayTotal: number;
};

type BonusSource =
  | "promotional"
  | "referral"
  | "compensation"
  | "loyalty"
  | "trial"
  | "admin_grant"
  | "signup_bonus";

// ── Constants ────────────────────────────────────────────────────────────

const BONUS_SOURCE_OPTIONS: { value: BonusSource; label: string }[] = [
  { value: "promotional", label: "Promotional" },
  { value: "referral", label: "Referral" },
  { value: "compensation", label: "Compensation" },
  { value: "loyalty", label: "Loyalty" },
  { value: "trial", label: "Trial" },
  { value: "admin_grant", label: "Admin Grant" },
  { value: "signup_bonus", label: "Signup Bonus" },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupTransactionsByDay(transactions: Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = formatDateKey(tx.createdAt);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, txs]) => ({
      dateKey,
      dateLabel: formatDate(txs[0]!.createdAt),
      transactions: txs,
      dayTotal: txs.reduce((sum, tx) => sum + tx.amount, 0),
    }));
}

function computeBurnRate(balance: UserBalance): {
  avgPerDay: number;
  daysRemaining: number | null;
} {
  const used = balance.lifetimeCreditsUsed ?? 0;
  if (used === 0) {
    return { avgPerDay: 0, daysRemaining: null };
  }

  const lastUpdated = new Date(balance.lastUpdated);
  const now = new Date();
  const daysSinceStart = Math.max(
    1,
    Math.ceil(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const effectiveDays = Math.max(daysSinceStart, 7);
  const avgPerDay = used / effectiveDays;

  const available = balance.balance - balance.reservedBalance;
  const daysRemaining =
    avgPerDay > 0 ? Math.floor(available / avgPerDay) : null;

  return { avgPerDay, daysRemaining };
}

function hasCostBreakdown(tx: Transaction): boolean {
  return !!(
    tx.provider ||
    tx.model ||
    tx.inputTokens ||
    tx.outputTokens ||
    tx.actualCostCredits ||
    tx.billedCostCredits
  );
}

function getBonusSourceIcon(source: string) {
  switch (source) {
    case "promotional":
      return <Megaphone className="h-3 w-3" />;
    case "referral":
      return <UserCheck className="h-3 w-3" />;
    case "compensation":
      return <Shield className="h-3 w-3" />;
    case "loyalty":
      return <Heart className="h-3 w-3" />;
    case "trial":
      return <Sparkles className="h-3 w-3" />;
    case "admin_grant":
      return <Star className="h-3 w-3" />;
    case "signup_bonus":
      return <Gift className="h-3 w-3" />;
    default:
      return <Gift className="h-3 w-3" />;
  }
}

function getBonusExpiryInfo(tx: Transaction): {
  expiresAt: Date | null;
  campaignId: string | null;
  source: string | null;
} {
  const meta = tx.metadata as Record<string, unknown> | null;
  return {
    expiresAt: null, // Expiry is on the bonus_credits record, not the transaction
    campaignId: (meta?.campaignId as string) ?? null,
    source: (meta?.source as string) ?? null,
  };
}

// ── Cost Breakdown Tooltip ───────────────────────────────────────────────

function CostBreakdownTooltip({ tx }: { tx: Transaction }) {
  if (!hasCostBreakdown(tx)) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <div className="space-y-1.5 text-xs">
          {tx.provider && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{tx.provider}</span>
            </div>
          )}
          {tx.model && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium truncate max-w-[180px]">
                {tx.model}
              </span>
            </div>
          )}
          {(tx.inputTokens != null || tx.outputTokens != null) && (
            <>
              <div className="border-t my-1" />
              {tx.inputTokens != null && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Input tokens</span>
                  <span className="font-mono">
                    {tx.inputTokens.toLocaleString()}
                  </span>
                </div>
              )}
              {tx.outputTokens != null && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Output tokens</span>
                  <span className="font-mono">
                    {tx.outputTokens.toLocaleString()}
                  </span>
                </div>
              )}
              {tx.cachedInputTokens != null && tx.cachedInputTokens > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Cached tokens</span>
                  <span className="font-mono">
                    {tx.cachedInputTokens.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}
          {(tx.actualCostCredits || tx.billedCostCredits) && (
            <>
              <div className="border-t my-1" />
              {tx.actualCostCredits && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Actual cost</span>
                  <span className="font-mono">
                    {parseFloat(tx.actualCostCredits).toFixed(2)}
                  </span>
                </div>
              )}
              {tx.billedCostCredits && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Billed cost</span>
                  <span className="font-mono">
                    {parseFloat(tx.billedCostCredits).toFixed(2)}
                  </span>
                </div>
              )}
              {tx.costMultiplier && parseFloat(tx.costMultiplier) !== 1 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Markup</span>
                  <span className="font-mono">{tx.costMultiplier}x</span>
                </div>
              )}
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Transaction Row ──────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount > 0;
  const isBonus = tx.type === "bonus_grant";
  const bonusInfo = isBonus ? getBonusExpiryInfo(tx) : null;

  return (
    <div
      className={`flex items-center justify-between border rounded-lg p-3 ${
        isBonus ? "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isBonus ? (
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
              <Gift className="mr-1 h-3 w-3" />
              Bonus
            </Badge>
          ) : (
            <Badge variant={isCredit ? "default" : "destructive"}>
              {tx.type}
            </Badge>
          )}
          <span className="text-sm truncate">{tx.description}</span>
          <CostBreakdownTooltip tx={tx} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground">
            {new Date(tx.createdAt).toLocaleTimeString()}
          </p>
          {isBonus && bonusInfo?.source && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400"
            >
              {getBonusSourceIcon(bonusInfo.source)}
              <span className="ml-1">{bonusInfo.source}</span>
            </Badge>
          )}
          {isBonus && bonusInfo?.campaignId && (
            <span className="text-[10px] text-purple-600 dark:text-purple-400">
              Campaign: {bonusInfo.campaignId}
            </span>
          )}
          {!isBonus && tx.operationType && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {tx.operationType}
            </Badge>
          )}
          {!isBonus && tx.provider && (
            <span className="text-[10px] text-muted-foreground">
              {tx.provider}
              {tx.model ? ` / ${tx.model}` : ""}
            </span>
          )}
        </div>
      </div>
      <div
        className={`text-lg font-mono shrink-0 ml-4 ${
          isBonus
            ? "text-purple-600"
            : isCredit
              ? "text-green-600"
              : "text-red-600"
        }`}
      >
        {isCredit ? "+" : ""}
        {tx.amount.toLocaleString()}
      </div>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────────

export default function AdminBillingPage() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");

  // Grant Credits dialog state
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");

  // Grant Bonus dialog state
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [bonusUserId, setBonusUserId] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusSource, setBonusSource] = useState<BonusSource>("admin_grant");
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusCampaignId, setBonusCampaignId] = useState("");
  const [bonusExpiresAt, setBonusExpiresAt] = useState("");

  // Transaction dialog state
  const [viewTransactionsUserId, setViewTransactionsUserId] = useState<
    string | null
  >(null);

  // ── Data Fetching ──────────────────────────────────────────────────────

  const { data: stats, isPending: statsPending } =
    trpc.adminBilling.getUsageSummary.useQuery();

  const { data: balances, isPending: balancesPending } =
    trpc.adminBilling.listBalances.useQuery({
      search: searchQuery || undefined,
      limit: 50,
    });

  const { data: userTransactions, isPending: transactionsPending } =
    trpc.adminBilling.getUserTransactions.useQuery(
      { userId: viewTransactionsUserId!, limit: 50 },
      { enabled: !!viewTransactionsUserId }
    );

  const { data: userMetrics, isPending: metricsPending } =
    trpc.adminBilling.getUserLifetimeMetrics.useQuery(
      { userId: viewTransactionsUserId! },
      { enabled: !!viewTransactionsUserId }
    );

  const groupedTransactions = useMemo(() => {
    if (!userTransactions) return [];
    return groupTransactionsByDay(userTransactions as Transaction[]);
  }, [userTransactions]);

  // ── Mutations ──────────────────────────────────────────────────────────

  const grantCreditsMutation = trpc.adminBilling.grantCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits granted successfully");
      setGrantDialogOpen(false);
      setSelectedUserId(null);
      setGrantAmount("");
      setGrantReason("");
      utils.adminBilling.listBalances.invalidate();
      utils.adminBilling.getUsageSummary.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to grant credits");
    },
  });

  const grantBonusMutation = trpc.adminBilling.grantBonus.useMutation({
    onSuccess: () => {
      toast.success("Bonus credits granted successfully");
      setBonusDialogOpen(false);
      resetBonusForm();
      utils.adminBilling.listBalances.invalidate();
      utils.adminBilling.getUsageSummary.invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to grant bonus credits");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleGrantCredits = () => {
    if (!selectedUserId || !grantAmount || !grantReason) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseInt(grantAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    grantCreditsMutation.mutate({
      userId: selectedUserId,
      amount,
      reason: grantReason,
    });
  };

  const resetBonusForm = () => {
    setBonusUserId(null);
    setBonusAmount("");
    setBonusSource("admin_grant");
    setBonusDescription("");
    setBonusCampaignId("");
    setBonusExpiresAt("");
  };

  const handleGrantBonus = () => {
    if (!bonusUserId || !bonusAmount) {
      toast.error("Please fill in required fields");
      return;
    }

    const amount = parseInt(bonusAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (bonusExpiresAt) {
      const expiry = new Date(bonusExpiresAt);
      if (expiry <= new Date()) {
        toast.error("Expiration date must be in the future");
        return;
      }
    }

    grantBonusMutation.mutate({
      userId: bonusUserId,
      amount,
      source: bonusSource,
      description: bonusDescription || undefined,
      campaignId: bonusCampaignId || undefined,
      expiresAt: bonusExpiresAt
        ? new Date(bonusExpiresAt).toISOString()
        : undefined,
    });
  };

  const openGrantDialog = (userId: string) => {
    setSelectedUserId(userId);
    setGrantDialogOpen(true);
  };

  const openBonusDialog = (userId: string) => {
    setBonusUserId(userId);
    setBonusDialogOpen(true);
  };

  // ── Table Columns ──────────────────────────────────────────────────────

  const columns: ColumnDef<UserBalance, unknown>[] = [
    {
      accessorKey: "userName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.userName ?? "Unknown"}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.userEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Balance" />
      ),
      cell: ({ row }) => {
        const available =
          row.original.balance - row.original.reservedBalance;
        return (
          <div>
            <div className="font-mono font-medium">
              {row.original.balance.toLocaleString()}
            </div>
            {row.original.reservedBalance > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="text-orange-600">
                  {row.original.reservedBalance.toLocaleString()} reserved
                </span>
                {" / "}
                <span className="text-green-600">
                  {available.toLocaleString()} avail
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "bonusBalance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bonus" />
      ),
      cell: ({ row }) => {
        const bonus = row.original.bonusBalance ?? 0;
        if (bonus === 0) {
          return <span className="text-xs text-muted-foreground">--</span>;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-default">
                  <Gift className="h-3.5 w-3.5 text-purple-500" />
                  <span className="font-mono text-purple-600 font-medium">
                    {bonus.toLocaleString()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {bonus.toLocaleString()} bonus credits available
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "lifetime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lifetime" />
      ),
      cell: ({ row }) => {
        const received = row.original.lifetimeCreditsReceived ?? 0;
        const used = row.original.lifetimeCreditsUsed ?? 0;
        const usagePct =
          received > 0 ? Math.round((used / received) * 100) : 0;

        if (received === 0 && used === 0) {
          return (
            <span className="text-xs text-muted-foreground">No data</span>
          );
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-default">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-green-600 font-mono">
                      +{received.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-600 font-mono">
                      -{used.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={usagePct} className="h-1.5 w-16" />
                    <span className="text-[10px] text-muted-foreground">
                      {usagePct}%
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div>Received: {received.toLocaleString()} credits</div>
                  <div>Used: {used.toLocaleString()} credits</div>
                  <div>Usage: {usagePct}% of lifetime credits</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "burnRate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Burn Rate" />
      ),
      cell: ({ row }) => {
        const { avgPerDay, daysRemaining } = computeBurnRate(row.original);

        if (avgPerDay === 0) {
          return <span className="text-xs text-muted-foreground">--</span>;
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-0.5 cursor-default">
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                    {avgPerDay.toFixed(1)}/day
                  </div>
                  {daysRemaining != null && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Clock className="h-3 w-3" />
                      <span
                        className={
                          daysRemaining < 7
                            ? "text-red-600 font-medium"
                            : daysRemaining < 30
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }
                      >
                        {daysRemaining}d remaining
                      </span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div>Avg usage: {avgPerDay.toFixed(2)} credits/day</div>
                  {daysRemaining != null && (
                    <div>Est. {daysRemaining} days until depleted</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => openGrantDialog(row.original.userId)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Grant Credits
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openBonusDialog(row.original.userId)}
            >
              <Gift className="mr-2 h-4 w-4 text-purple-500" />
              Grant Bonus
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                setViewTransactionsUserId(row.original.userId)
              }
            >
              <CreditCard className="mr-2 h-4 w-4" />
              View Transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Billing Management
          </h2>
          <p className="text-muted-foreground">
            Manage user credits, bonuses, and view platform statistics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-blue-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.totalUsers ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-yellow-500" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.totalBalance.toLocaleString() ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-green-500" />
                Total Reserved
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.totalReserved.toLocaleString() ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Total Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.totalAvailable.toLocaleString() ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-emerald-500" />
                Lifetime Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  {(stats?.totalLifetimeReceived ?? 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Flame className="h-4 w-4 text-red-500" />
                Lifetime Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsPending ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-red-600">
                  {(stats?.totalLifetimeUsed ?? 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Balances Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Balances</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {balancesPending ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={(balances as UserBalance[]) ?? []}
                searchKey="userName"
                searchPlaceholder="Search by name or email..."
              />
            )}
          </CardContent>
        </Card>

        {/* Grant Credits Dialog */}
        <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Credits</DialogTitle>
              <DialogDescription>
                Add credits to the selected user&apos;s account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter credit amount"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Promotional bonus, Support resolution"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGrantDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={grantCreditsMutation.isPending}
                onClick={handleGrantCredits}
              >
                {grantCreditsMutation.isPending
                  ? "Granting..."
                  : "Grant Credits"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grant Bonus Credits Dialog */}
        <Dialog
          open={bonusDialogOpen}
          onOpenChange={(open) => {
            setBonusDialogOpen(open);
            if (!open) resetBonusForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Grant Bonus Credits
              </DialogTitle>
              <DialogDescription>
                Add bonus credits with optional expiration and tracking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bonus-amount">
                    Amount <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bonus-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus-source">
                    Source <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={bonusSource}
                    onValueChange={(v) => setBonusSource(v as BonusSource)}
                  >
                    <SelectTrigger id="bonus-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {BONUS_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            {getBonusSourceIcon(opt.value)}
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus-description">Description</Label>
                <Input
                  id="bonus-description"
                  placeholder="e.g., Welcome bonus for new user"
                  value={bonusDescription}
                  onChange={(e) => setBonusDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bonus-campaign">Campaign ID</Label>
                  <Input
                    id="bonus-campaign"
                    placeholder="e.g., SUMMER2026"
                    value={bonusCampaignId}
                    onChange={(e) => setBonusCampaignId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus-expires">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Expires At
                    </span>
                  </Label>
                  <Input
                    id="bonus-expires"
                    type="datetime-local"
                    value={bonusExpiresAt}
                    onChange={(e) => setBonusExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBonusDialogOpen(false);
                  resetBonusForm();
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={grantBonusMutation.isPending}
                onClick={handleGrantBonus}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {grantBonusMutation.isPending
                  ? "Granting..."
                  : "Grant Bonus Credits"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Transactions Dialog -- grouped by day */}
        <Dialog
          open={!!viewTransactionsUserId}
          onOpenChange={() => setViewTransactionsUserId(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Transaction History</DialogTitle>
              <DialogDescription>
                Recent transactions for this user, grouped by day
              </DialogDescription>
            </DialogHeader>

            {/* User Metrics Summary */}
            {metricsPending ? (
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : userMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border p-3 bg-muted/30">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Balance
                  </p>
                  <p className="text-lg font-mono font-semibold">
                    {userMetrics.currentBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Lifetime Used
                  </p>
                  <p className="text-lg font-mono font-semibold text-red-600">
                    {userMetrics.lifetimeCreditsUsed.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Burn Rate (30d)
                  </p>
                  <p className="text-lg font-mono font-semibold text-orange-600">
                    {userMetrics.burnRate.avgDailyCredits.toFixed(1)}/day
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Days Remaining
                  </p>
                  <p
                    className={`text-lg font-mono font-semibold ${
                      userMetrics.daysRemaining != null &&
                      userMetrics.daysRemaining < 7
                        ? "text-red-600"
                        : userMetrics.daysRemaining != null &&
                            userMetrics.daysRemaining < 30
                          ? "text-orange-600"
                          : ""
                    }`}
                  >
                    {userMetrics.daysRemaining != null
                      ? `${userMetrics.daysRemaining}d`
                      : "--"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="max-h-[28rem] overflow-y-auto">
              {transactionsPending ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : groupedTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No transactions found
                </p>
              ) : (
                <Accordion
                  type="multiple"
                  defaultValue={groupedTransactions.map((g) => g.dateKey)}
                >
                  {groupedTransactions.map((group) => (
                    <AccordionItem key={group.dateKey} value={group.dateKey}>
                      <AccordionTrigger className="py-3 text-sm hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">
                            {group.dateLabel}
                          </span>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {group.transactions.length} txn
                              {group.transactions.length !== 1 ? "s" : ""}
                            </Badge>
                            <span
                              className={`font-mono text-sm ${
                                group.dayTotal >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {group.dayTotal >= 0 ? "+" : ""}
                              {group.dayTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {group.transactions.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
