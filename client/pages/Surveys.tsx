import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Surveys() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">
            Create and manage surveys with forms and analytics.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      {/* Placeholder Content */}
      <Card>
        <CardHeader className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Surveys Management</CardTitle>
          <CardDescription className="max-w-sm mx-auto">
            This page will contain the surveys management interface with the ability to:
            <br />• Create dynamic survey forms
            <br />• Link surveys to events and groups
            <br />• Track survey responses and analytics
            <br />• Export survey data and reports
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-12">
          <p className="text-sm text-muted-foreground">
            Continue prompting to have this page fully implemented with CRUD operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
