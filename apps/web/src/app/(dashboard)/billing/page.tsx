"use client";

import { Zap, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const PLANS = [
  { name: "Free", price: 0, credits: 50, current: true },
  { name: "Starter", price: 29, credits: 500, current: false },
  { name: "Pro", price: 79, credits: 2000, current: false },
  { name: "Enterprise", price: 249, credits: 10000, current: false },
];

export default function BillingPage() {
  // Placeholder data until billing router is connected
  const creditsUsed = 12;
  const creditsTotal = 50;
  const percentage = Math.round((creditsUsed / creditsTotal) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and credits</p>
      </div>

      {/* Credit Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Credit Usage
          </CardTitle>
          <CardDescription>
            {creditsUsed} of {creditsTotal} credits used this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{creditsUsed} used</span>
            <span>{creditsTotal - creditsUsed} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.current ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.current && <Badge>Current</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.credits} credits/month
                </p>
                <Button
                  variant={plan.current ? "outline" : "default"}
                  className="w-full"
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Recent Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No usage history yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
