"use client";

import { useState } from "react";
import { Zap, Clock, CreditCard, ArrowUpRight, ArrowDownRight, DollarSign, Lock, Check, Crown, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { PaymentDialog } from "@/components/payment/payment-dialog";

const PAYMENT_ENABLED = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true";

type Plan = {
  id: string;
  name: string;
  description?: string | null | undefined;
  priceInr: number;
  priceUsd?: number;
  credits: number;
  bonusCredits?: number | null | undefined;
  billingInterval?: string;
  isDefault?: boolean | null | undefined;
};

export default function BillingPage() {
  const utils = trpc.useUtils();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    type: "subscription" | "credit_pack";
    item: Plan | null;
  }>({ open: false, type: "subscription", item: null });

  // Fetch subscription plans
  const { data: plans, isPending: plansPending } = trpc.subscription.getPlans.useQuery();
  const { data: mySubscription } = trpc.subscription.getMy.useQuery();

  const handleSubscribe = (plan: Plan) => {
    setPaymentDialog({ open: true, type: "subscription", item: plan });
  };

  // Fetch balance
  const { data: balance, isPending: balancePending } = trpc.billing.getBalance.useQuery();
  const { data: availableBalance, isPending: availablePending } = trpc.billing.getAvailableBalance.useQuery();

  // Fetch credit packs
  const { data: packs, isPending: packsPending } = trpc.payment.getPacks.useQuery(undefined, {
    enabled: PAYMENT_ENABLED,
  });

  // Fetch transactions
  const { data: transactions, isPending: transactionsPending } = trpc.billing.getTransactions.useQuery({
    limit: 10,
  });

  // Fetch payment orders
  const { data: orders, isPending: ordersPending } = trpc.payment.getOrders.useQuery(
    { limit: 5 },
    { enabled: PAYMENT_ENABLED }
  );

  const handleBuyPack = (pack: Plan) => {
    setPaymentDialog({ open: true, type: "credit_pack", item: pack });
  };

  const purchasedCredits = balance?.balance ?? 0;
  const bonusCredits = balance?.bonusBalance ?? 0;
  const reservedCredits = balance?.reservedBalance ?? 0;
  const totalCredits = purchasedCredits + bonusCredits;
  const available = availableBalance?.available ?? 0;
  const percentage = totalCredits > 0 ? Math.round(((totalCredits - available) / totalCredits) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your credits and transactions</p>
      </div>

      {/* Subscription Section */}
      {balance?.subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{balance.subscription.planName} Plan</CardTitle>
                <CardDescription>
                  {balance.subscription.cancelAtPeriodEnd
                    ? `Cancelled - Access until ${new Date(balance.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(balance.subscription.currentPeriodEnd).toLocaleDateString()}`
                  }
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => toast.info("Plan management coming soon")}>
                Manage Plan
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Credits Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subscription Credits Used</span>
                <span>
                  {balance.subscription.creditsUsed.toLocaleString()} / {balance.subscription.creditsGranted.toLocaleString()}
                </span>
              </div>
              <Progress
                value={(balance.subscription.creditsUsed / balance.subscription.creditsGranted) * 100}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{balance.subscription.creditsRemaining.toLocaleString()} remaining</span>
                <Badge variant={balance.subscription.status === "active" ? "default" : "secondary"}>
                  {balance.subscription.status}
                </Badge>
              </div>
            </div>

            {/* Period Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Current Period</p>
                <p className="text-sm font-medium">
                  {new Date(balance.subscription.currentPeriodStart).toLocaleDateString()} -{" "}
                  {new Date(balance.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan Slug</p>
                <p className="text-sm font-medium">{balance.subscription.planSlug}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-yellow-500" /> Subscription Plans
        </h2>
        {plansPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : !plans || plans.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No subscription plans available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrentPlan = mySubscription?.planId === plan.id;
              const isExpanded = expandedPlanId === plan.id;
              const features = (plan.features ?? {}) as Record<string, unknown>;
              const featureItems: { label: string; value?: string }[] = [];
              if (features.maxProjects != null) featureItems.push({ label: "Projects", value: String(features.maxProjects) });
              if (features.pipelinesPerMonth != null) featureItems.push({ label: "Pipelines/mo", value: String(features.pipelinesPerMonth) });
              if (features.pipelinesPerDay != null) featureItems.push({ label: "Pipelines/day", value: String(features.pipelinesPerDay) });
              if (features.maxConcurrentPipelines != null) featureItems.push({ label: "Concurrent", value: String(features.maxConcurrentPipelines) });
              if (features.priorityProcessing === true) featureItems.push({ label: "Priority processing" });
              if (features.dedicatedSupport === true) featureItems.push({ label: "Dedicated support" });
              if (features.apiAccess === true) featureItems.push({ label: "API access" });
              return (
                <Card
                  key={plan.id}
                  className={`relative ${plan.popular ? "border-primary" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="gap-0.5 text-[10px] px-1.5 py-0">
                        <Sparkles className="h-2.5 w-2.5" /> Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-3 pt-4 space-y-2">
                    {/* Name + badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm truncate">{plan.name}</span>
                      {isCurrentPlan && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Current</Badge>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <span className="text-xl font-bold">₹{(plan.priceInr ?? 0).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/{plan.billingInterval === "yearly" ? "yr" : "mo"}</span>
                      {(plan.priceUsd ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1">(${plan.priceUsd})</span>
                      )}
                    </div>

                    {/* Credits summary */}
                    <p className="text-xs text-muted-foreground">
                      {(plan.credits ?? 0).toLocaleString()} credits
                      {plan.bonusCredits && plan.bonusCredits > 0 && (
                        <span className="text-green-600"> +{plan.bonusCredits.toLocaleString()} bonus</span>
                      )}
                    </p>

                    {/* Details toggle */}
                    {featureItems.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {isExpanded ? "Hide" : "View"} details
                        </button>
                        {isExpanded && (
                          <ul className="space-y-1 pt-1 border-t">
                            {featureItems.map((f) => (
                              <li key={f.label} className="flex items-center gap-1.5 text-[11px]">
                                <Check className="h-3 w-3 text-green-500 shrink-0" />
                                <span>{f.label}{f.value ? `: ${f.value}` : ""}</span>
                              </li>
                            ))}
                            {plan.description && (
                              <li className="text-[11px] text-muted-foreground pt-1">{plan.description}</li>
                            )}
                          </ul>
                        )}
                      </>
                    )}

                    {/* Subscribe */}
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={isCurrentPlan}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Purchased Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balancePending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{purchasedCredits.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-green-500" />
              Bonus Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balancePending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {bonusCredits > 0 ? `+${bonusCredits.toLocaleString()}` : bonusCredits.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-orange-500" />
              Reserved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balancePending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{reservedCredits.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-yellow-500" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availablePending ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{available.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Credit Usage
          </CardTitle>
          <CardDescription>
            {totalCredits - available} of {totalCredits} credits used
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balancePending ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <>
              <Progress value={percentage} className="h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{totalCredits - available} used</span>
                <span>{available} remaining</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Credit Packs */}
      {PAYMENT_ENABLED && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
          {packsPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packs?.map((pack) => (
                <Card key={pack.id} className={pack.popular ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{pack.name}</CardTitle>
                      {pack.popular && <Badge>Popular</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">₹{pack.priceInr}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pack.credits.toLocaleString()} credits
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!pack.active}
                      onClick={() => handleBuyPack(pack)}
                    >
                      Buy Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsPending ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tx.type === "credit" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={tx.type === "credit" ? "text-green-600" : "text-red-600"}>
                        {tx.type === "credit" ? "+" : "-"}
                        {tx.amount}
                      </span>
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Orders */}
      {PAYMENT_ENABLED && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersPending ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !orders || orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <code className="text-xs">{order.externalOrderId}</code>
                      </TableCell>
                      <TableCell>₹{order.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "captured"
                              ? "default"
                              : order.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
        type={paymentDialog.type}
        item={paymentDialog.item}
        onSuccess={() => {
          utils.subscription.getMy.invalidate();
          utils.billing.getBalance.invalidate();
          utils.billing.getAvailableBalance.invalidate();
          utils.billing.getTransactions.invalidate();
          utils.payment.getOrders.invalidate();
        }}
      />
    </div>
  );
}
