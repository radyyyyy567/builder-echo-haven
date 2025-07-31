import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Group, CreateGroupRequest, UpdateGroupRequest, ApiResponse } from "@shared/api";

const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Name must be 30 characters or less"),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface GroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group | null;
  onSuccess: () => void;
}

export function GroupForm({ open, onOpenChange, group, onSuccess }: GroupFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEdit = !!group;

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Reset form when group changes or dialog opens
  useEffect(() => {
    if (open) {
      if (group) {
        form.reset({
          name: group.name,
          description: group.description || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
        });
      }
    }
  }, [open, group, form]);

  const onSubmit = async (data: GroupFormData) => {
    setLoading(true);
    try {
      const url = isEdit ? `/api/groups/${group.uuid}` : "/api/groups";
      const method = isEdit ? "PUT" : "POST";

      // For edit, only include changed fields
      let payload: CreateGroupRequest | UpdateGroupRequest;
      
      if (isEdit) {
        payload = {};
        if (data.name !== group.name) payload.name = data.name;
        if (data.description !== (group.description || "")) payload.description = data.description;
      } else {
        payload = {
          name: data.name,
          description: data.description || undefined,
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse<Group> = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || `Group ${isEdit ? "updated" : "created"} successfully`,
        });
        onSuccess();
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${isEdit ? "update" : "create"} group`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} group`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Group" : "Create New Group"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to the group here."
              : "Add a new group to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Engineering Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the group..."
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEdit ? "Update Group" : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
