export interface CreditBalance {
  id: string;
  userId: string;
  balance: number;
  lastUpdated: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: "purchase" | "usage" | "refund";
  amount: number;
  description: string;
  jobId: string | null;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  price: number;
  limits: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodEnd: Date;
  createdAt: Date;
}
