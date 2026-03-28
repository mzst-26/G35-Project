"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2, HelpCircle, Banknote, FileText } from "lucide-react";
import { type TradePenalty } from "@/types/trade-dashboard";
import { useTradePenalties } from "@/hooks/useTradePenalties";

export default function Penalties() {
  const [expandedPenaltyId, setExpandedPenaltyId] = useState<string | number | null>(null);
  const { penalties, stats, isLoading, error } = useTradePenalties();

  const getStatusBadge = (status: TradePenalty["status"]) => {
    const statusConfig = {
      paid: { bg: "bg-green-100", text: "text-green-800", label: "Paid" },
      unpaid: { bg: "bg-red-100", text: "text-red-800", label: "Unpaid" },
      disputed: { bg: "bg-amber-100", text: "text-amber-800", label: "Disputed" },
    };
    const config = statusConfig[status];
    return (
      <Badge className={`${config.bg} ${config.text} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "Job Rejection":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "Late Arrival":
        return <Clock className="h-5 w-5 text-red-600" />;
      case "Missing Documentation":
        return <FileText className="h-5 w-5 text-slate-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-slate-600" />;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Error state
  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl text-slate-900 mb-2">Penalties</h1>
          <p className="text-slate-600">View and manage your penalty history</p>
        </div>
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl text-slate-900 mb-2">Penalties</h1>
          <p className="text-slate-600">View and manage your penalty history</p>
        </div>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-slate-600">Loading penalties...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl text-slate-900 mb-2">Penalties</h1>
        <p className="text-slate-600">View and manage your penalty history</p>
      </div>

      {/* Info Alert */}
      {stats.unpaid > 0 && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Outstanding Penalties:</strong> You have <strong>£{stats.unpaid}</strong> in unpaid penalties. These will be deducted from your next payout.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Penalties */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Total Penalties</p>
                <p className="text-2xl font-semibold text-slate-900">£{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid Penalties */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Paid</p>
                <p className="text-2xl font-semibold text-slate-900">£{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unpaid Penalties */}
        <Card className={`shadow-sm border-slate-200 ${stats.unpaid > 0 ? "border-red-200" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stats.unpaid > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                <Banknote className={`h-5 w-5 ${stats.unpaid > 0 ? "text-red-600" : "text-slate-700"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Unpaid</p>
                <p className={`text-2xl font-semibold ${stats.unpaid > 0 ? "text-red-600" : "text-slate-900"}`}>
                  £{stats.unpaid}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Penalties List */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Penalty History</CardTitle>
          <CardDescription>All recorded penalties and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {penalties.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-200 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">No penalties recorded</p>
              <p className="text-sm text-slate-600">Keep up the great work!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {penalties.map((penalty) => (
                <div
                  key={penalty.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                >
                  {/* Penalty Row */}
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedPenaltyId(expandedPenaltyId === penalty.id ? null : penalty.id)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getReasonIcon(penalty.reason)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{penalty.reason}</p>
                        <p className="text-sm text-slate-600">{formatDate(penalty.date)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-lg text-slate-900">£{penalty.amount}</p>
                      {getStatusBadge(penalty.status)}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedPenaltyId === penalty.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 rounded p-3">
                      {penalty.description && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Details</p>
                          <p className="text-sm text-slate-700">{penalty.description}</p>
                        </div>
                      )}

                      {penalty.referenceJob && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Related Job</p>
                          <p className="text-sm text-slate-700">{penalty.referenceJob}</p>
                        </div>
                      )}

                      {penalty.status === "unpaid" && (
                        <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">
                          Pay Now
                        </Button>
                      )}

                      {penalty.status === "disputed" && (
                        <Button size="sm" variant="outline" className="mt-3">
                          View Appeal Status
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 mb-1">How are penalties calculated?</p>
            <p className="text-sm text-blue-800">
              Penalties are applied for job rejections (£50), late arrivals, and missing documentation. You can appeal a penalty within 30 days of issuance. Unpaid penalties are deducted from your next payout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
