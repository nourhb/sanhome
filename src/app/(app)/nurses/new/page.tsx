
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, UploadCloud, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { addNurse, type AddNurseFormValues as ActionAddNurseFormValues } from "@/app/actions"; 

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Client-side schema aligns with ActionAddNurseFormValues
const nurseFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  specialty: z.string().min(3, { message: "Specialty is required." }),
  location: z.string().min(3, { message: "Location is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  avatarFile: z
    .custom<File | undefined>()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ).optional(),
});

type ClientNurseFormValues = z.infer<typeof nurseFormSchema>;

export default function AddNursePage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<ClientNurseFormValues>({
    resolver: zodResolver(nurseFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      specialty: "",
      location: "",
      phone: "",
      avatarFile: undefined,
    },
  });

  function onSubmit(values: ClientNurseFormValues) {
    startTransition(async () => {
      // The AddNurseFormValues type in actions.ts expects avatarFile
      const actionValues: ActionAddNurseFormValues = { 
        ...values,
        avatarFile: values.avatarFile, // Pass the File object
      };
      
      const result = await addNurse(actionValues);
      
      if (result.success) {
        toast({
          title: "Nurse Added & Notified",
          description: result.message,
        });
        form.reset();
        setAvatarPreview(null);
        router.push("/nurses"); // Redirect to nurses list page
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Add Nurse",
          description: result.message,
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add New Nurse</h1>
          <p className="text-muted-foreground">Enter the details for the new nurse.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-primary" />
                Nurse Information
              </CardTitle>
              <CardDescription>
                Please fill in all required fields to register a new nurse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Alex Ray" {...field} />
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
                        <Input type="email" placeholder="e.g., nurse.alex@example.com" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Geriatrics, Pediatrics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Affiliated Clinic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Springfield General Hospital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., (555) 010-0101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatarFile"
                render={({ field: { onChange, value, ref, ...restField } }) => (
                  <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                     <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarPreview || undefined} alt="Avatar preview" data-ai-hint="nurse medical" />
                        <AvatarFallback><UploadCloud className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          ref={ref}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            onChange(file); 
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
                          {...restField}
                          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>Upload a profile picture for the nurse (max 5MB, JPG/PNG/WEBP).</FormDescription>
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
                    Adding Nurse...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Nurse
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
