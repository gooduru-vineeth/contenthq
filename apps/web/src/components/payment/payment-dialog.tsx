"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useRazorpay } from "@/hooks/use-razorpay";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "subscription" | "credit_pack";
  item: {
    id: string;
    name: string;
    description?: string;
    priceInr: number;
    priceUsd?: number;
    credits: number;
    bonusCredits?: number;
    billingInterval?: string;
  } | null;
  onSuccess?: () => void;
}

export function PaymentDialog({
  type,
  item,
  open,
  onOpenChange,
  onSuccess,
}: PaymentDialogProps) {
  const [stage, setStage] = useState<"preview" | "processing">("preview");
  const { openCheckout } = useRazorpay();

  // Mutations
  const createSubscriptionOrder = trpc.subscription.subscribe.useMutation();
  const createCreditOrder = trpc.payment.createOrder.useMutation();
  const verifyPayment = trpc.payment.verifyPayment.useMutation();

  const handleProceed = async () => {
    if (!item) return;

    setStage("processing");

    try {
      // Create order based on type
      const orderData =
        type === "subscription"
          ? await createSubscriptionOrder.mutateAsync({
              planId: item.id,
              currency: "INR",
            })
          : await createCreditOrder.mutateAsync({
              creditPackId: item.id,
              currency: "INR",
            });

      // Open Razorpay checkout
      await openCheckout({
        key: orderData.clientKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ContentHQ",
        description:
          type === "subscription"
            ? `${item.name} Subscription`
            : "Credit Pack Purchase",
        order_id: orderData.externalOrderId,
        handler: async (response) => {
          try {
            await verifyPayment.mutateAsync({
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success("Payment successful!");
            onOpenChange(false);
            setStage("preview");
            onSuccess?.();
          } catch {
            toast.error("Payment verification failed");
            setStage("preview");
          }
        },
        modal: {
          ondismiss: () => {
            setStage("preview");
            toast.info("Payment cancelled");
          },
        },
        theme: {
          color: "#000000",
        },
      });
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to create order");
      setStage("preview");
    }
  };

  if (!item) return null;

  const price = item.priceInr / 100;
  const credits = item.credits ?? 0;
  const bonusCredits = item.bonusCredits ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {stage === "preview" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {type === "subscription"
                  ? "Subscribe to Plan"
                  : "Purchase Credits"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Item Details */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                )}
                {type === "subscription" && item.billingInterval && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Billed {item.billingInterval}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-semibold">
                    {credits.toLocaleString()}
                  </span>
                </div>
                {bonusCredits > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Bonus Credits</span>
                    <span className="font-semibold text-green-600">
                      +{bonusCredits.toLocaleString()}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">Total</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{price.toFixed(2)}</div>
                    {item.priceUsd && (
                      <div className="text-xs text-muted-foreground">
                        ${(item.priceUsd / 100).toFixed(2)} USD
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceed}
                disabled={createSubscriptionOrder.isPending || createCreditOrder.isPending}
                className="flex-1 sm:flex-none"
              >
                {createSubscriptionOrder.isPending || createCreditOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Processing payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please complete the payment in the Razorpay window
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
