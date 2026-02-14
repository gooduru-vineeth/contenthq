"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, _setStatusFilter] = useState<"active" | "cancelled" | "expired">();

  const { data: subscriptions, isLoading } = trpc.adminSubscription.listSubscriptions.useQuery({
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage user subscription plans
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-4">
          {subscriptions?.map((sub: any) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sub.plan?.name || "Unknown Plan"}</CardTitle>
                  <Badge
                    variant={
                      sub.status === "active"
                        ? "default"
                        : sub.status === "cancelled"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs">{sub.userId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Credits</p>
                    <p className="font-medium">
                      {sub.creditsUsed?.toLocaleString() || 0} / {sub.creditsGranted?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {sub.cancelAtPeriodEnd ? "Cancels at period end" : "Active"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {subscriptions?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No subscriptions found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
