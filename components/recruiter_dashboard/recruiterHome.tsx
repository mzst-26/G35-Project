"use client";

import { ArrowRight, CheckCircle2, Clock, PlayCircle, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { DashboardHomeProps } from "@/types/dashboard"
export default function RecruiterHome ({ onCreateJob }: DashboardHomeProps){
  return (
      <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Manage your jobs and track progress</p>
      </div>

      {/* Quick Action */}
      <Card className="bg-blue-600 border-0 shadow-lg mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl text-white mb-2">
                Need trade professionals?
              </h3>
              <p className="text-blue-100">Create a new job request in seconds</p>
            </div>

            <Button
              onClick={onCreateJob}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-3xl text-slate-900 mb-1">0</p>
            <p className="text-sm text-slate-600">Pending</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-3xl text-slate-900 mb-1">0</p>
            <p className="text-sm text-slate-600">Allocated</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <PlayCircle className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-3xl text-slate-900 mb-1">0</p>
            <p className="text-sm text-slate-600">In Progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-6">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-3xl text-slate-900 mb-1">0</p>
            <p className="text-sm text-slate-600">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-slate-900">Recent Jobs</h2>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-slate-600 text-sm">You don’t have any jobs yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
