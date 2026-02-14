"use client";

import { useState } from "react";
import { Search, UserPlus, DollarSign, Users, CreditCard, TrendingUp } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserBalance = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  balance: number;
  reservedBalance: number;
  lastUpdated: Date;
};

export default function AdminBillingPage() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [viewTransactionsUserId, setViewTransactionsUserId] = useState<string | null>(null);

  // Fetch admin stats
  const { data: stats, isPending: statsPending } = trpc.adminBilling.getUsageSummary.useQuery();

  // Fetch user balances
  const { data: balances, isPending: balancesPending } = trpc.adminBilling.listBalances.useQuery({
    search: searchQuery || undefined,
    limit: 50,
  });

  // Fetch user transactions for modal
  const { data: userTransactions, isPending: transactionsPending } = trpc.adminBilling.getUserTransactions.useQuery(
    { userId: viewTransactionsUserId!, limit: 20 },
    { enabled: !!viewTransactionsUserId }
  );

  // Grant credits mutation
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

  const openGrantDialog = (userId: string) => {
    setSelectedUserId(userId);
    setGrantDialogOpen(true);
  };

  const columns: ColumnDef<UserBalance, unknown>[] = [
    {
      accessorKey: "userName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.userName ?? "Unknown"}</div>
          <div className="text-sm text-muted-foreground">{row.original.userEmail}</div>
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Balance" />,
      cell: ({ row }) => (
        <div className="font-mono">{row.original.balance.toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "reservedBalance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reserved" />,
      cell: ({ row }) => (
        <div className="font-mono text-orange-600">{row.original.reservedBalance.toLocaleString()}</div>
      ),
    },
    {
      id: "available",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Available" />,
      cell: ({ row }) => {
        const available = row.original.balance - row.original.reservedBalance;
        return <div className="font-mono text-green-600">{available.toLocaleString()}</div>;
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
            <DropdownMenuItem onClick={() => openGrantDialog(row.original.userId)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Grant Credits
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewTransactionsUserId(row.original.userId)}>
              <CreditCard className="mr-2 h-4 w-4" />
              View Transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing Management</h2>
        <p className="text-muted-foreground">Manage user credits and view platform statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
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
              <div className="text-2xl font-bold">{stats?.totalBalance.toLocaleString() ?? 0}</div>
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
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={grantCreditsMutation.isPending}
              onClick={handleGrantCredits}
            >
              {grantCreditsMutation.isPending ? "Granting..." : "Grant Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transactions Dialog */}
      <Dialog
        open={!!viewTransactionsUserId}
        onOpenChange={() => setViewTransactionsUserId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              Recent transactions for this user
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {transactionsPending ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !userTransactions || userTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No transactions found
              </p>
            ) : (
              <div className="space-y-2">
                {userTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={tx.type === "credit" ? "default" : "destructive"}
                        >
                          {tx.type}
                        </Badge>
                        <span className="text-sm">{tx.description}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`text-lg font-mono ${
                        tx.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
