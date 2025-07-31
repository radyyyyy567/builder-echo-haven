import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  ApiResponse,
} from "@shared/api";

const eventSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(30, "Name must be 30 characters or less"),
    description: z.string().optional(),
    time_start: z.string().min(1, "Start time is required"),
    time_end: z.string().min(1, "End time is required"),
    status: z.enum(["scheduled", "active", "completed", "cancelled"]),
  })
  .refine(
    (data) => {
      const start = new Date(data.time_start);
      const end = new Date(data.time_end);
      return end > start;
    },
    {
      message: "End time must be after start time",
      path: ["time_end"],
    },
  );

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSuccess: () => void;
}

function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  // Format for datetime-local input: YYYY-MM-DDTHH:MM
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventForm({
  open,
  onOpenChange,
  event,
  onSuccess,
}: EventFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEdit = !!event;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      time_start: "",
      time_end: "",
      status: "scheduled",
    },
  });

  // Reset form when event changes or dialog opens
  useEffect(() => {
    if (open) {
      if (event) {
        form.reset({
          name: event.name,
          description: event.description || "",
          time_start: formatDateTimeLocal(event.time_start),
          time_end: formatDateTimeLocal(event.time_end),
          status: event.status,
        });
      } else {
        // Default to 1 hour from now
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        form.reset({
          name: "",
          description: "",
          time_start: formatDateTimeLocal(now.toISOString()),
          time_end: formatDateTimeLocal(oneHourLater.toISOString()),
          status: "scheduled",
        });
      }
    }
  }, [open, event, form]);

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      const url = isEdit ? `/api/events/${event.uuid}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      // Convert datetime-local to ISO string
      const payload: CreateEventRequest | UpdateEventRequest = {
        name: data.name,
        description: data.description || undefined,
        time_start: new Date(data.time_start).toISOString(),
        time_end: new Date(data.time_end).toISOString(),
        status: data.status,
      };

      // For edit, only include changed fields
      if (isEdit) {
        const updatePayload: UpdateEventRequest = {};
        if (data.name !== event.name) updatePayload.name = data.name;
        if (data.description !== (event.description || ""))
          updatePayload.description = data.description;
        if (formatDateTimeLocal(event.time_start) !== data.time_start) {
          updatePayload.time_start = new Date(data.time_start).toISOString();
        }
        if (formatDateTimeLocal(event.time_end) !== data.time_end) {
          updatePayload.time_end = new Date(data.time_end).toISOString();
        }
        if (data.status !== event.status) updatePayload.status = data.status;

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });

        const result: ApiResponse<Event> = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: result.message || "Event updated successfully",
          });
          onSuccess();
          onOpenChange(false);
          form.reset();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update event",
            variant: "destructive",
          });
        }
      } else {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result: ApiResponse<Event> = await response.json();

        if (result.success) {
          toast({
            title: "Success",
            description: result.message || "Event created successfully",
          });
          onSuccess();
          onOpenChange(false);
          form.reset();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create event",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} event`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to the event here."
              : "Schedule a new event."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Team Building Workshop" {...field} />
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
                      placeholder="Brief description of the event..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
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
                {loading
                  ? "Saving..."
                  : isEdit
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
