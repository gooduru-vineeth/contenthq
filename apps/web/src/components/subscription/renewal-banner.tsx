"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PaymentDialog } from "@/components/payment/payment-dialog";

export function SubscriptionRenewalBanner() {
  const { data: subscription } = trpc.subscription.getMy.useQuery();
  const utils = trpc.useUtils();
  const [dismissed, setDismissed] = useState(false);
  const [showRenewal, setShowRenewal] = useState(false);

  if (!subscription || dismissed) return null;

  const now = new Date();
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const daysUntilExpiry = Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Show banner 7 days before expiry or during grace period (up to 7 days after)
  const shouldShow = daysUntilExpiry <= 7;
  if (!shouldShow) return null;

  // Determine variant based on urgency
  const variant = daysUntilExpiry < 0 ? "destructive" : "default";

  const message =
    daysUntilExpiry < 0
      ? `Your subscription expired ${Math.abs(daysUntilExpiry)} days ago. Renew now to continue using premium features!`
      : daysUntilExpiry === 0
      ? "Your subscription expires today!"
      : `Your subscription expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? "day" : "days"}.`;

  return (
    <>
      <Alert variant={variant} className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Subscription Renewal Required</AlertTitle>
        <AlertDescription className="flex items-center justify-between mt-2">
          <span>{message}</span>
          <div className="flex gap-2 ml-4">
            <Button size="sm" onClick={() => setShowRenewal(true)}>
              Renew Now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Renewal dialog - uses renewSubscription mutation */}
      {subscription.plan && (
        <PaymentDialog
          open={showRenewal}
          onOpenChange={setShowRenewal}
          type="subscription"
          item={subscription.plan}
          onSuccess={() => {
            setShowRenewal(false);
            setDismissed(true);
            utils.subscription.getMy.invalidate();
            utils.billing.getBalance.invalidate();
          }}
        />
      )}
    </>
  );
}
