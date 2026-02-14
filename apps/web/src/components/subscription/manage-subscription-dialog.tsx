"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crown, CreditCard, Calendar, Zap, AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type ManageSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageSubscriptionDialog({
  open,
  onOpenChange,
}: ManageSubscriptionDialogProps) {
  const utils = trpc.useUtils();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch current subscription
  const { data: subscription, isPending: subscriptionPending } = trpc.subscription.getMy.useQuery(
    undefined,
    { enabled: open }
  );

  // Fetch available plans
  const { data: plans, isPending: plansPending } = trpc.subscription.getPlans.useQuery(
    undefined,
    { enabled: open }
  );

  // Cancel subscription mutation
  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled successfully");
      utils.subscription.getMy.invalidate();
      utils.billing.getBalance.invalidate();
      setCancelDialogOpen(false);
      setCancelReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel subscription");
    },
  });

  // Reactivate subscription mutation
  const reactivateMutation = trpc.subscription.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Subscription reactivated successfully");
      utils.subscription.getMy.invalidate();
      utils.billing.getBalance.invalidate();
      setReactivateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reactivate subscription");
    },
  });

  // Change plan mutation
  const changePlanMutation = trpc.subscription.changePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan change scheduled successfully");
      utils.subscription.getMy.invalidate();
      utils.billing.getBalance.invalidate();
      setSelectedPlanId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change plan");
    },
  });

  const handleCancel = () => {
    cancelMutation.mutate({
      cancelAtPeriodEnd: true,
      reason: cancelReason || undefined,
    });
  };

  const handleReactivate = () => {
    reactivateMutation.mutate();
  };

  const handleChangePlan = (newPlanId: string) => {
    changePlanMutation.mutate({
      newPlanId,
      effective: "next_period",
    });
  };

  if (!open) return null;

  const isLoading = subscriptionPending || plansPending;
  const currentPlanId = subscription?.planId;
  const isCancelled = subscription?.cancelAtPeriodEnd;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Manage Subscription
            </DialogTitle>
            <DialogDescription>
              View your current plan, upgrade, downgrade, or cancel your subscription
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : !subscription ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No active subscription found</p>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="plans">Change Plan</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {subscription.planName}
                          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                            {subscription.status}
                          </Badge>
                          {isCancelled && (
                            <Badge variant="destructive">Cancelled</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {isCancelled
                            ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                            : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Credits per Period</p>
                          <p className="text-2xl font-bold">{subscription.creditsGranted.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Credits Remaining</p>
                          <p className="text-2xl font-bold">{subscription.creditsRemaining.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Current Period</p>
                          <p className="text-sm">
                            {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{" "}
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Credits Used</p>
                          <p className="text-sm">{subscription.creditsUsed.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isCancelled && (
                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-orange-900">Subscription Cancelled</p>
                          <p className="text-sm text-orange-700 mt-1">
                            Your subscription will remain active until{" "}
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                            You can reactivate it anytime before this date.
                          </p>
                          <Button
                            onClick={() => setReactivateDialogOpen(true)}
                            className="mt-3"
                            variant="outline"
                          >
                            Reactivate Subscription
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Change Plan Tab */}
              <TabsContent value="plans" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {plans?.map((plan) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isSelected = plan.id === selectedPlanId;

                    return (
                      <Card
                        key={plan.id}
                        className={
                          isCurrent
                            ? "border-primary bg-primary/5"
                            : isSelected
                            ? "border-blue-500"
                            : ""
                        }
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {isCurrent && <Badge>Current</Badge>}
                            {plan.popular && !isCurrent && <Badge variant="secondary">Popular</Badge>}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {plan.description || "Subscription plan"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold">₹{plan.priceInr}</span>
                              <span className="text-muted-foreground">/{plan.billingInterval}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Zap className="h-4 w-4" />
                              {plan.credits.toLocaleString()} credits
                              {plan.bonusCredits && plan.bonusCredits > 0 && (
                                <span className="text-green-600">
                                  + {plan.bonusCredits.toLocaleString()} bonus
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            disabled={isCurrent || !plan.active || changePlanMutation.isPending}
                            onClick={() => handleChangePlan(plan.id)}
                            variant={isSelected ? "default" : "outline"}
                          >
                            {isCurrent
                              ? "Current Plan"
                              : changePlanMutation.isPending && isSelected
                              ? "Changing..."
                              : "Change to this plan"}
                          </Button>
                          {!isCurrent && (
                            <p className="text-xs text-muted-foreground text-center">
                              Change takes effect at next billing cycle
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Subscription Settings</CardTitle>
                    <CardDescription>Manage your subscription preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-1">Plan: {subscription.planName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Billing Interval: {subscription.planSlug === "free" ? "Free" : "Monthly"}
                        </p>
                      </div>

                      {subscription.planSlug !== "free" && !isCancelled && (
                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-2 text-red-600">Danger Zone</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Cancel your subscription. You'll retain access until the end of your billing period.
                          </p>
                          <Button
                            variant="destructive"
                            onClick={() => setCancelDialogOpen(true)}
                            disabled={cancelMutation.isPending}
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until{" "}
              {subscription && new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
              After that, you'll be downgraded to the free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Help us improve by sharing why you're cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will be reactivated and will continue to renew automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={reactivateMutation.isPending}
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
