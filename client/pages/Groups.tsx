import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, MoreHorizontal, Users2, User } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
import { GroupWithUsers, PaginatedResponse, ApiResponse, Group } from "@shared/api";
import { GroupForm } from "@/components/forms/GroupForm";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export default function Groups() {
  const [groups, setGroups] = useState<GroupWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { toast } = useToast();

  // Fetch groups from API
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/groups?${params}`);
      const data: PaginatedResponse<GroupWithUsers> = await response.json();

      if (data.success) {
        setGroups(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch groups",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit group
  const editGroup = (group: GroupWithUsers) => {
    // Convert GroupWithUsers to Group for the form
    const groupForEdit: Group = {
      uuid: group.uuid,
      name: group.name,
      description: group.description,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
    setEditingGroup(groupForEdit);
    setShowGroupForm(true);
  };

  // Delete group
  const deleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });
      const data: ApiResponse<null> = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Group deleted successfully",
        });
        fetchGroups(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete group",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  // Effect to fetch groups when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm]);

  useEffect(() => {
    fetchGroups();
  }, [currentPage, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Manage user groups and their relationships.
          </p>
        </div>
        <Button onClick={() => {
          setEditingGroup(null);
          setShowGroupForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
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
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Groups ({total})
          </CardTitle>
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
                    <TableHead>Group</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.uuid}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Users2 className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-md" />
                          </div>
                          <div>
                            <div className="font-medium">{group.name}</div>
                            {group.description && (
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {group.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{group.users.length}</span>
                          <span className="text-sm text-muted-foreground">members</span>
                        </div>
                        {group.users.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {group.users.slice(0, 3).map((user) => (
                              <Badge key={user.uuid} variant="outline" className="text-xs">
                                {user.username}
                              </Badge>
                            ))}
                            {group.users.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{group.users.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(group.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editGroup(group)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteGroup(group.uuid)}
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
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* Group Form Dialog */}
      <GroupForm
        open={showGroupForm}
        onOpenChange={(open) => {
          setShowGroupForm(open);
          if (!open) setEditingGroup(null);
        }}
        group={editingGroup}
        onSuccess={fetchGroups}
      />
    </div>
  );
}
