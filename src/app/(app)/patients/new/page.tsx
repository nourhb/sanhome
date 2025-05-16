
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition } from "react";
import { format } from "date-fns";

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const patientFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  age: z.coerce.number().int().positive({ message: "Age must be a positive number." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  joinDate: z.date({ required_error: "Join date is required." }),
  primaryNurse: z.string().min(2, { message: "Primary nurse name is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  address: z.string().min(5, { message: "Address is required." }),
  mobilityStatus: z.string().min(3, { message: "Mobility status is required." }),
  pathologies: z.string().min(3, { message: "Pathologies are required." }),
  allergies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function AddPatientPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: "",
      age: undefined,
      avatarUrl: "",
      joinDate: undefined,
      primaryNurse: "",
      phone: "",
      email: "",
      address: "",
      mobilityStatus: "",
      pathologies: "",
      allergies: "",
    },
  });

  function onSubmit(values: PatientFormValues) {
    startTransition(async () => {
      // In a real app, you would send this data to your backend
      console.log("Patient data submitted:", values);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({
        title: "Patient Added",
        description: `${values.fullName} has been successfully added.`,
      });
      form.reset(); // Reset form after submission
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add New Patient</h1>
          <p className="text-muted-foreground">Enter the details for the new patient.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-primary" />
                Patient Information
              </CardTitle>
              <CardDescription>
                Please fill in all required fields to register a new patient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Eleanor Vance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 72" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://placehold.co/100x100.png" {...field} />
                    </FormControl>
                    <FormDescription>Enter a URL for the patient's profile picture.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Join Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryNurse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Nurse</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Nurse Nightingale" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <CardTitle className="text-lg font-medium pt-4 border-t mt-2">Contact Details</CardTitle>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                            <Input type="tel" placeholder="e.g., +1 (555) 123-4567" {...field} />
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="e.g., eleanor.vance@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., 456 Oak Avenue, Springfield, IL" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <CardTitle className="text-lg font-medium pt-4 border-t mt-2">Health Information</CardTitle>
                <FormField
                  control={form.control}
                  name="mobilityStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobility Status</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ambulatory with cane, difficulty with stairs" {...field} />
                      </FormControl>
                      <FormDescription>Describe the patient's current mobility.</FormDescription>
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
                        <Textarea placeholder="e.g., Hypertension, Osteoarthritis, Type 2 Diabetes" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of medical conditions.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Penicillin, Shellfish" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of known allergies.</FormDescription>
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
                    Adding Patient...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Patient
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

