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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Survey, CreateSurveyRequest, UpdateSurveyRequest, ApiResponse } from "@shared/api";

const surveySchema = z.object({
  name: z.string().min(1, "Name is required").max(30, "Name must be 30 characters or less"),
  form_json: z.string().min(1, "Form structure is required"),
  set_point: z.string().optional(),
  status: z.enum(["active", "inactive", "completed"]),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey?: Survey | null;
  onSuccess: () => void;
}

const defaultFormStructure = JSON.stringify({
  title: "Sample Survey",
  description: "Please fill out this survey",
  fields: [
    {
      id: "field1",
      type: "text",
      label: "Full Name",
      required: true
    },
    {
      id: "field2",
      type: "email",
      label: "Email Address",
      required: true
    },
    {
      id: "field3",
      type: "select",
      label: "How satisfied are you?",
      required: true,
      options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
    }
  ]
}, null, 2);

export function SurveyForm({ open, onOpenChange, survey, onSuccess }: SurveyFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEdit = !!survey;

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      name: "",
      form_json: defaultFormStructure,
      set_point: "",
      status: "active",
    },
  });

  // Reset form when survey changes or dialog opens
  useEffect(() => {
    if (open) {
      if (survey) {
        form.reset({
          name: survey.name,
          form_json: JSON.stringify(survey.form, null, 2),
          set_point: survey.set_point || "",
          status: survey.status,
        });
      } else {
        form.reset({
          name: "",
          form_json: defaultFormStructure,
          set_point: "",
          status: "active",
        });
      }
    }
  }, [open, survey, form]);

  const onSubmit = async (data: SurveyFormData) => {
    setLoading(true);
    try {
      // Validate JSON
      let formObject;
      try {
        formObject = JSON.parse(data.form_json);
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid JSON format in form structure",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const url = isEdit ? `/api/surveys/${survey.uuid}` : "/api/surveys";
      const method = isEdit ? "PUT" : "POST";

      // For edit, only include changed fields
      let payload: CreateSurveyRequest | UpdateSurveyRequest;
      
      if (isEdit) {
        payload = {};
        if (data.name !== survey.name) payload.name = data.name;
        if (JSON.stringify(formObject) !== JSON.stringify(survey.form)) payload.form = formObject;
        if (data.set_point !== (survey.set_point || "")) payload.set_point = data.set_point;
        if (data.status !== survey.status) payload.status = data.status;
      } else {
        payload = {
          name: data.name,
          form: formObject,
          set_point: data.set_point || undefined,
          status: data.status,
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse<Survey> = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || `Survey ${isEdit ? "updated" : "created"} successfully`,
        });
        onSuccess();
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${isEdit ? "update" : "create"} survey`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "create"} survey`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Survey" : "Create New Survey"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Make changes to the survey here."
              : "Create a new survey with custom form fields."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer Satisfaction Survey" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="set_point"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set Point (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or instructions for the survey..."
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="form_json"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Structure (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the form structure in JSON format..."
                      className="resize-none font-mono text-sm h-48"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Define your survey fields using JSON. Include title, description, and fields array with id, type, label, and required properties.
                  </div>
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
                {loading ? "Saving..." : isEdit ? "Update Survey" : "Create Survey"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
