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

// Rate limiting
export type RateLimitOperation =
  | "media_generation"
  | "speech_generation"
  | "pipeline_start"
  | "ai_generation";

export interface RateLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

export interface PlanRateLimits {
  media_generation: { hourly: number };
  speech_generation: { hourly: number };
  pipeline_start: { daily: number };
  ai_generation: { hourly: number };
}

// Credit types
export type CreditTransactionType =
  | "usage"
  | "purchase"
  | "bonus"
  | "admin_grant"
  | "admin_deduction"
  | "refund"
  | "reservation"
  | "reservation_settle"
  | "reservation_release";

export interface CreditReservation {
  id: string;
  userId: string;
  projectId: string | null;
  amount: number;
  operationType: string;
  status: "active" | "settled" | "released" | "expired";
  expiresAt: Date;
  createdAt: Date;
  settledAt: Date | null;
}

// Payment types
export type PaymentProvider = "razorpay";
export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  priceUsd: number;
  description: string | null;
  popular: boolean;
  active: boolean;
  sortOrder: number;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  creditPackId: string;
  provider: PaymentProvider;
  externalOrderId: string;
  externalPaymentId: string | null;
  credits: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  paidAt: Date | null;
  createdAt: Date;
}
