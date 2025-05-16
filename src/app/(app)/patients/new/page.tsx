
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, generateRandomPassword } from "@/lib/utils";
import { CalendarIcon, Loader2, UserPlus, UploadCloud, Mail, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const patientFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  age: z.coerce.number().int().positive({ message: "Age must be a positive number." }),
  avatarFile: z
    .custom<File | undefined>()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ).optional(),
  joinDate: z.date({ required_error: "Join date is required." }),
  primaryNurse: z.string().min(1, { message: "Primary nurse selection is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  address: z.string().min(5, { message: "Address is required." }),
  mobilityStatus: z.string().min(3, { message: "Mobility status is required." }),
  pathologies: z.string().min(3, { message: "Pathologies are required." }),
  allergies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

// Mock data for nurse dropdown - in a real app, fetch this from your database
const mockNurses = [
  { id: 'n1', name: 'Nurse Alex Ray' },
  { id: 'n2', name: 'Nurse Betty Boo' },
  { id: 'n3', name: 'Nurse Charles Xavier' },
  { id: 'n4', name: 'Nurse Diana Prince' },
];

export default function AddPatientPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: "",
      age: undefined,
      avatarFile: undefined,
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
      const randomPassword = generateRandomPassword();
      console.log("Patient data submitted:", values);
      console.log("Generated password for new patient:", randomPassword);

      if (values.avatarFile) {
        console.log("Avatar file details:", {
          name: values.avatarFile.name,
          type: values.avatarFile.type,
          size: values.avatarFile.size,
        });
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      // Simulate sending email to patient
      console.log(`Simulating email to ${values.email} with password: ${randomPassword}`);
      toast({
        title: "Patient Added & Notified",
        description: `${values.fullName} has been added. An email with login credentials has been (simulated) sent to ${values.email}.`,
      });

      // Simulate admin notification
      console.log(`Admin_Notification: New patient ${values.fullName} (${values.email}) added.`);
       toast({
        title: "Admin Notified",
        description: `You (admin) have been notified about the new patient: ${values.fullName}.`,
        variant: "default",
      });
      
      form.reset();
      setAvatarPreview(null);
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
                name="avatarFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarPreview || undefined} alt="Avatar preview" data-ai-hint="person face" />
                        <AvatarFallback><UploadCloud className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            field.onChange(file); 
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setAvatarPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setAvatarPreview(null);
                            }
                          }}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>Upload a profile picture for the patient (max 5MB, JPG/PNG/WEBP).</FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                             <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select a nurse" className="pl-10" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockNurses.map(nurse => (
                            <SelectItem key={nurse.id} value={nurse.name}>
                              {nurse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                           <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="e.g., eleanor.vance@example.com" {...field} className="pl-10" />
                          </div>
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
