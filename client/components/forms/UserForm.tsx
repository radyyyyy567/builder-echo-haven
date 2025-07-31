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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ApiResponse,
} from "@shared/api";

const userSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(30, "Username must be 30 characters or less"),
  email: z
    .string()
    .email("Invalid email address")
    .max(100, "Email must be 100 characters or less"),
  role: z.enum(["admin", "moderator", "user"]),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  status: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

export function UserForm({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEdit = !!user;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      role: "user",
      password: "",
      status: true,
    },
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          password: "", // Don't populate password for edit
        });
      } else {
        form.reset({
          username: "",
          email: "",
          role: "user",
          password: "",
          status: true,
        });
      }
    }
  }, [open, user, form]);

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      const url = isEdit ? `/api/users/${user.uuid}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      // For edit, only include changed fields (except password if empty)
      let payload: CreateUserRequest | UpdateUserRequest;

      if (isEdit) {
        payload = {};
        if (data.username !== user.username) payload.username = data.username;
        if (data.email !== user.email) payload.email = data.email;
        if (data.role !== user.role) payload.role = data.role;
        if (data.status !== user.status) payload.status = data.status;
        // Only include password if it's provided
        if (data.password && data.password.length > 0) {
          (payload as any).password = data.password;
        }
      } else {
        payload = {
          username: data.username,
          email: data.email,
          role: data.role,
          password: data.password!,
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse<User> = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description:
            result.message ||
            `User ${isEdit ? "updated" : "created"} successfully`,
        });
        onSuccess();
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: "Error",
          description:
            result.error || `Failed to ${isEdit ? "update" : "create"} user`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} user`,
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
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to the user account here."
              : "Add a new user to the system."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john.doe@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password {isEdit && "(leave empty to keep current)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isEdit
                          ? "Leave empty to keep current"
                          : "Enter password"
                      }
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this user account
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {loading ? "Saving..." : isEdit ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
