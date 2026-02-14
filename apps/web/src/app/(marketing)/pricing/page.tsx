"use client";

import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: plans, isLoading } = trpc.subscription.getPlans.useQuery();
  const subscribeMutation = trpc.subscription.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Subscribed successfully!");
    },
    onError: (error) => {
      if (error.message.includes("coming soon")) {
        toast.info("Payment integration coming soon! Contact support to subscribe.");
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleSubscribe = (planId: string) => {
    subscribeMutation.mutate({ planId });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground">
          Choose the plan that fits your content production needs
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans?.map((plan) => (
          <Card
            key={plan.id}
            className={plan.popular ? "border-primary shadow-lg relative" : ""}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{plan.name}</CardTitle>
                {plan.isDefault && <Badge variant="secondary">Free</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ₹{(plan.priceInr / 100).toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">/{plan.billingInterval}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ${(plan.priceUsd / 100).toFixed(2)} USD
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.credits.toLocaleString()} credits/{plan.billingInterval}
                  </span>
                </li>
                {(plan.bonusCredits ?? 0) > 0 && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-600">
                      +{(plan.bonusCredits ?? 0).toLocaleString()} bonus credits
                    </span>
                  </li>
                )}
                {plan.features && plan.features.maxProjects && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.features.maxProjects === -1
                        ? "Unlimited projects"
                        : `${plan.features.maxProjects} projects`}
                    </span>
                  </li>
                )}
                {plan.features && plan.features.pipelinesPerDay && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.features.pipelinesPerDay} pipelines/day
                    </span>
                  </li>
                )}
                {plan.features && plan.features.priorityProcessing && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Priority processing</span>
                  </li>
                )}
                {plan.features && plan.features.dedicatedSupport && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Dedicated support</span>
                  </li>
                )}
                {plan.features && plan.features.apiAccess && (
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">API access</span>
                  </li>
                )}
              </ul>

              {/* CTA Button */}
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribeMutation.isPending}
              >
                {plan.isDefault ? "Get Started Free" : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What are credits?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Credits are used to generate AI content. Different operations consume different amounts of credits based on complexity and cost.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change my plan later?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time from your billing dashboard.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens when I run out of credits?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You can purchase additional credit packs or upgrade to a higher tier plan with more credits.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
