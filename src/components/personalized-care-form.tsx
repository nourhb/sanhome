"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

import { fetchPersonalizedCareSuggestions } from "@/app/actions";
import type { PersonalizedCareSuggestionsOutput } from "@/ai/flows/personalized-care-suggestions";

const formSchema = z.object({
  patientName: z.string().min(2, {
    message: "Patient name must be at least 2 characters.",
  }),
  mobilityStatus: z.string().min(3, {
    message: "Mobility status is required.",
  }),
  pathologies: z.string().min(3, {
    message: "Pathologies are required (e.g., Diabetes, Hypertension).",
  }),
});

type PersonalizedCareFormProps = {
  patient: {
    id: string;
    name: string;
    mobility: string;
    pathologies: string[];
  };
};

export function PersonalizedCareForm({ patient }: PersonalizedCareFormProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<PersonalizedCareSuggestionsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: patient.name,
      mobilityStatus: patient.mobility,
      pathologies: patient.pathologies.join(", "),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    setSuggestions(null);
    startTransition(async () => {
      const result = await fetchPersonalizedCareSuggestions(values);
      if (result.data) {
        setSuggestions(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          Personalized Care Suggestions (AI)
        </CardTitle>
        <CardDescription>
          Enter patient details to generate AI-powered care suggestions.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobilityStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobility Status</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bedridden, Wheelchair-bound, Ambulatory with assistance" {...field} />
                  </FormControl>
                  <FormDescription>
                    Describe the patient's current level of mobility.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pathologies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pathologies</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Diabetes Type 2, Hypertension, Arthritis"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List the patient's relevant medical conditions, separated by commas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Suggestions
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {error && (
        <div className="p-6 pt-0">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {suggestions && suggestions.careSuggestions && (
        <div className="p-6 pt-0">
          <Alert variant="default" className="bg-primary/10 border-primary/30">
             <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">AI Generated Care Suggestions</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap text-foreground">
              {suggestions.careSuggestions}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}
