import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter,
  FileText,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  SurveyWithEvents,
  PaginatedResponse,
  ApiResponse,
  Survey,
} from "@shared/api";
import { SurveyForm } from "@/components/forms/SurveyForm";

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "inactive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export default function Surveys() {
  const [surveys, setSurveys] = useState<SurveyWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const { toast } = useToast();

  // Fetch surveys from API
  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/surveys?${params}`);
      const data: PaginatedResponse<SurveyWithEvents> = await response.json();

      if (data.success) {
        setSurveys(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch surveys",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
      toast({
        title: "Error",
        description: "Failed to fetch surveys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit survey
  const editSurvey = (survey: SurveyWithEvents) => {
    // Convert SurveyWithEvents to Survey for the form
    const surveyForEdit: Survey = {
      uuid: survey.uuid,
      name: survey.name,
      form: survey.form,
      set_point: survey.set_point,
      status: survey.status,
      created_at: survey.created_at,
      updated_at: survey.updated_at,
    };
    setEditingSurvey(surveyForEdit);
    setShowSurveyForm(true);
  };

  // Delete survey
  const deleteSurvey = async (surveyId: string) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "DELETE",
      });
      const data: ApiResponse<null> = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Survey deleted successfully",
        });
        fetchSurveys(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete survey",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    }
  };

  // Effect to fetch surveys when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchSurveys();
  }, [currentPage, searchTerm, statusFilter]);

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
        <Button
          onClick={() => {
            setEditingSurvey(null);
            setShowSurveyForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surveys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Surveys ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Form Fields</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey) => (
                    <TableRow key={survey.uuid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-md" />
                          </div>
                          <div>
                            <div className="font-medium">{survey.name}</div>
                            {survey.set_point && (
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {survey.set_point}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(survey.status)}>
                          {survey.status.charAt(0).toUpperCase() +
                            survey.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {survey.events.length}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            events
                          </span>
                        </div>
                        {survey.events.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {survey.events.slice(0, 2).map((event) => (
                              <Badge
                                key={event.uuid}
                                variant="outline"
                                className="text-xs"
                              >
                                {event.name}
                              </Badge>
                            ))}
                            {survey.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{survey.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {survey.form?.fields?.length || 0} fields
                        </div>
                        {survey.form?.title && (
                          <div className="text-xs text-muted-foreground max-w-xs truncate">
                            {survey.form.title}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(survey.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => editSurvey(survey)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteSurvey(survey.uuid)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Survey Form Dialog */}
      <SurveyForm
        open={showSurveyForm}
        onOpenChange={(open) => {
          setShowSurveyForm(open);
          if (!open) setEditingSurvey(null);
        }}
        survey={editingSurvey}
        onSuccess={fetchSurveys}
      />
    </div>
  );
}
