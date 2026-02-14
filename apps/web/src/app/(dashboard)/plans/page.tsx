"use client";

import { Package, Check, Sparkles, Crown, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PaymentDialog } from "@/components/payment/payment-dialog";

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

export default function PlansPage() {
  const { data: plans, isPending } = trpc.subscription.getPlans.useQuery();
  const { data: mySubscription } = trpc.subscription.getMy.useQuery();
  const utils = trpc.useUtils();
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    plan: Plan | null;
  }>({ open: false, plan: null });

  const subscribeMutation = trpc.subscription.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Subscribed successfully!");
      utils.subscription.getMy.invalidate();
      utils.billing.getBalance.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubscribe = (plan: NonNullable<typeof plans>[number]) => {
    // For free plan, use direct mutation (no payment required)
    if (plan.isDefault || (plan.priceInr === 0 && plan.priceUsd === 0)) {
      subscribeMutation.mutate({ planId: plan.id });
      return;
    }
    // For paid plans, open payment dialog
    setPaymentDialog({ open: true, plan });
  };

  const getFeatureList = (plan: NonNullable<typeof plans>[number]) => {
    const features = plan.features ?? {};
    const items: Array<{
      label: string;
      icon: typeof Check;
      highlight?: boolean;
      color?: string;
    }> = [];

    // Credits (always first)
    items.push({
      label: `${plan.credits.toLocaleString()} credits/${plan.billingInterval}`,
      icon: Zap,
      highlight: true,
    });

    if ((plan.bonusCredits ?? 0) > 0) {
      items.push({
        label: `+${(plan.bonusCredits ?? 0).toLocaleString()} bonus credits`,
        icon: Sparkles,
        highlight: true,
        color: "text-green-600",
      });
    }

    // Project limits
    if (features.maxProjects) {
      items.push({
        label:
          features.maxProjects === -1
            ? "Unlimited projects"
            : `${features.maxProjects} projects`,
        icon: Check,
      });
    }

    // Pipeline limits
    if (features.pipelinesPerMonth) {
      items.push({
        label: `${features.pipelinesPerMonth} pipelines/month`,
        icon: Check,
      });
    }

    if (features.pipelinesPerDay) {
      items.push({
        label: `${features.pipelinesPerDay} pipelines/day`,
        icon: Check,
      });
    }

    if (features.maxConcurrentPipelines) {
      items.push({
        label: `${features.maxConcurrentPipelines} concurrent pipelines`,
        icon: Check,
      });
    }

    // Premium features
    if (features.priorityProcessing) {
      items.push({ label: "Priority processing", icon: Crown });
    }

    if (features.dedicatedSupport) {
      items.push({ label: "Dedicated support", icon: Crown });
    }

    if (features.apiAccess) {
      items.push({ label: "API access", icon: Crown });
    }

    return items;
  };

  if (isPending) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[500px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <CardContent className="pt-6">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No subscription plans available at the moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that fits your content production needs
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl">
        {plans.map((plan) => {
          const isCurrentPlan = mySubscription?.planId === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.popular && "border-primary shadow-lg"
              )}
            >
              {/* Popular badge - absolutely positioned */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="gap-1 bg-primary">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isCurrentPlan && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="h-3 w-3" /> Current
                    </Badge>
                  )}
                  {plan.isDefault && !isCurrentPlan && (
                    <Badge variant="outline">Free</Badge>
                  )}
                </div>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ₹{((plan.priceInr ?? 0) / 100).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.billingInterval}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${((plan.priceUsd ?? 0) / 100).toFixed(2)} USD
                  </div>
                </div>

                {/* Features - Always Visible */}
                <ul className="space-y-3">
                  {getFeatureList(plan).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <feature.icon
                        className={cn(
                          "h-5 w-5 mt-0.5 flex-shrink-0",
                          feature.color || "text-green-600"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          feature.highlight && "font-medium"
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan || subscribeMutation.isPending}
                  onClick={() => handleSubscribe(plan)}
                >
                  {isCurrentPlan ? (
                    "Current Plan"
                  ) : plan.isDefault ? (
                    "Get Started Free"
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
        type="subscription"
        item={paymentDialog.plan}
        onSuccess={() => {
          toast.success("Subscription activated!");
          utils.subscription.getMy.invalidate();
          utils.billing.getBalance.invalidate();
        }}
      />
    </div>
  );
}
