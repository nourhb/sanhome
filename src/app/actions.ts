
'use server';

import { 
  getPersonalizedCareSuggestions, 
  type PersonalizedCareSuggestionsInput, 
  type PersonalizedCareSuggestionsOutput 
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword } from '@/lib/utils'; // Import the password generator

const PersonalizedCareSuggestionsInputSchema = z.object({
  patientName: z.string().min(1, "Patient name is required."),
  mobilityStatus: z.string().min(1, "Mobility status is required."),
  pathologies: z.string().min(1, "Pathologies are required."),
});

export async function fetchPersonalizedCareSuggestions(
  input: PersonalizedCareSuggestionsInput
): Promise<{ data?: PersonalizedCareSuggestionsOutput; error?: string }> {
  try {
    const validatedInput = PersonalizedCareSuggestionsInputSchema.parse(input);
    const result = await getPersonalizedCareSuggestions(validatedInput);
    return { data: result };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.errors.map(err => err.message).join(", ") };
    }
    console.error("Error fetching personalized care suggestions:", e);
    return { error: "Failed to generate care suggestions. Please try again." };
  }
}

// Mock data for patient list - this will serve as our "simulated database" for now
let mockPatients = [
  { id: '1', name: 'Alice Wonderland', age: 34, lastVisit: '2024-07-15', condition: 'Diabetes Type 1', status: 'Stable', avatarUrl: 'https://placehold.co/100x100.png', joinDate: '2023-01-15', primaryNurse: 'Nurse Alex Ray', phone: '+1 (555) 111-1111', email: 'alice@example.com', address: '123 Wonderland Lane', mobilityStatus: 'Ambulatory', pathologies: ['Diabetes Type 1'], allergies: ['Peanuts'], hint: 'woman smiling' },
  { id: '2', name: 'Bob The Builder', age: 52, lastVisit: '2024-07-20', condition: 'Hypertension', status: 'Needs Follow-up', avatarUrl: 'https://placehold.co/100x100.png', joinDate: '2023-02-20', primaryNurse: 'Nurse Betty Boo', phone: '+1 (555) 222-2222', email: 'bob@example.com', address: '456 Construction Rd', mobilityStatus: 'Ambulatory with cane', pathologies: ['Hypertension', 'Minor back pain'], allergies: [], hint: 'man construction' },
  { id: '3', name: 'Charlie Chaplin', age: 78, lastVisit: '2024-07-01', condition: 'Arthritis', status: 'Stable', avatarUrl: 'https://placehold.co/100x100.png', joinDate: '2022-11-10', primaryNurse: 'Nurse Charles Xavier', phone: '+1 (555) 333-3333', email: 'charlie@example.com', address: '789 Comedy Ave', mobilityStatus: 'Wheelchair-bound', pathologies: ['Arthritis', 'Glaucoma'], allergies: ['Aspirin'], hint: 'elderly man' },
  { id: '4', name: 'Diana Prince', age: 45, lastVisit: '2024-06-25', condition: 'Post-surgery Recovery', status: 'Improving', avatarUrl: 'https://placehold.co/100x100.png', joinDate: '2023-03-05', primaryNurse: 'Nurse Diana Prince', phone: '+1 (555) 444-4444', email: 'diana@example.com', address: '101 Themyscira Drive', mobilityStatus: 'Fully mobile', pathologies: ['Post-knee surgery recovery'], allergies: [], hint: 'woman confident' },
  { id: '5', name: 'Eleanor Vance', age: 62, lastVisit: '2024-07-22', condition: 'COPD', status: 'Stable', avatarUrl: 'https://placehold.co/100x100.png', joinDate: '2023-05-12', primaryNurse: 'Nurse Nightingale', phone: '+1 (555) 123-4567', email: 'eleanor.vance@example.com', address: '456 Oak Avenue, Springfield, IL', mobilityStatus: 'Ambulatory with cane, difficulty with stairs', pathologies: ['Hypertension', 'Osteoarthritis', 'Type 2 Diabetes (diet-controlled)'], allergies: ["Penicillin", "Shellfish"], hint: 'elderly woman' },
];

export type PatientListItem = typeof mockPatients[number] & { 
    // ensure all fields from PatientProfilePage are here if needed for list view
    // For PatientListPage, we mostly use: name, age, lastVisit, condition, status, id
    // For PatientProfilePage ([patientId]), we need more details:
    avatarUrl: string;
    joinDate: string;
    primaryNurse: string;
    phone: string;
    email: string;
    address: string;
    mobilityStatus: string; // Mapped to 'mobility' in profile
    pathologies: string[];
    allergies: string[];
    hint: string;
};


export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  // In a real app, you'd fetch this from your database (e.g., Firestore)
  // For example:
  // try {
  //   const q = query(collection(db, "patients"));
  //   const querySnapshot = await getDocs(q);
  //   const patientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientListItem[];
  //   return { data: patientsData };
  // } catch (e) {
  //   console.error("Error fetching patients from Firestore:", e);
  //   return { error: "Failed to fetch patients." };
  // }
  return { data: mockPatients };
}

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const patient = mockPatients.find(p => p.id === id);
  if (patient) {
    return { data: patient };
  } else {
    // In a real app with Firestore:
    // try {
    //   const docRef = doc(db, "patients", id);
    //   const docSnap = await getDoc(docRef);
    //   if (docSnap.exists()) {
    //     return { data: { id: docSnap.id, ...docSnap.data() } as PatientListItem };
    //   } else {
    //     return { error: "Patient not found." };
    //   }
    // } catch (e) {
    //   console.error("Error fetching patient by ID from Firestore:", e);
    //   return { error: "Failed to fetch patient details." };
    // }
    return { error: "Patient not found." };
  }
}


// Schema for addPatient action input
const AddPatientInputSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().positive(),
  avatarFile: z.instanceof(File).optional(), // Assuming file upload is handled separately or URL is passed
  avatarUrl: z.string().url().optional(), // If URL is passed directly
  joinDate: z.date(),
  primaryNurse: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  mobilityStatus: z.string().min(3),
  pathologies: z.string().min(3), // Comma-separated string
  allergies: z.string().optional(),
});
export type AddPatientFormValues = z.infer<typeof AddPatientInputSchema>;


export async function addPatient(
  values: AddPatientFormValues
): Promise<{ success?: boolean; message: string; patientId?: string }> {
  // In a real app, validate with AddPatientInputSchema.parse(values);
  // For now, we assume values are correctly structured as per the form's Zod schema.

  const randomPassword = generateRandomPassword();
  const newPatientId = (mockPatients.length + 1).toString(); // Simple ID generation for mock

  // Simulate adding to database (or Firestore)
  const newPatientData = {
    id: newPatientId,
    name: values.fullName,
    age: values.age,
    // In a real app, upload values.avatarFile to Firebase Storage and get URL
    avatarUrl: values.avatarUrl || `https://placehold.co/100x100.png?text=${values.fullName.split(" ").map(n=>n[0]).join("")}`,
    joinDate: values.joinDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    primaryNurse: values.primaryNurse,
    phone: values.phone,
    email: values.email,
    address: values.address,
    mobilityStatus: values.mobilityStatus,
    pathologies: values.pathologies.split(',').map(p => p.trim()),
    allergies: values.allergies ? values.allergies.split(',').map(a => a.trim()) : [],
    lastVisit: new Date().toISOString().split('T')[0], // Set last visit to today
    condition: values.pathologies.split(',')[0]?.trim() || 'N/A', // First pathology as condition
    status: 'Stable', // Default status
    hint: 'person face'
  };

  // Add to our mock "database"
  mockPatients.push(newPatientData);

  console.log("Patient data to be saved:", newPatientData);
  console.log("Generated password for new patient:", randomPassword);
  // Simulate sending email to patient
  console.log(`Simulating email to ${values.email} with password: ${randomPassword}`);
  // Simulate admin notification
  console.log(`Admin_Notification: New patient ${values.fullName} (${values.email}) added with ID ${newPatientId}.`);

  // In a real Firestore implementation:
  // try {
  //   const docRef = await addDoc(collection(db, "patients"), newPatientDataWithoutId); // Assuming newPatientDataWithoutId doesn't have id
  //   return { success: true, message: "Patient added successfully.", patientId: docRef.id };
  // } catch (error) {
  //   console.error("Error adding patient to Firestore: ", error);
  //   return { success: false, message: "Failed to add patient." };
  // }

  return { success: true, message: `Patient ${values.fullName} added (simulated). Email with credentials (simulated) sent to ${values.email}. Admin notified (simulated).`, patientId: newPatientId };
}


// Mock data for nurse list
const mockNurses = [
  { id: 'n1', name: 'Nurse Alex Ray', specialty: 'Geriatrics', location: 'Springfield General Hospital', phone: '(555) 010-0101', avatar: 'https://placehold.co/100x100.png', email: 'alex.ray@example.com', status: 'Available', hint: 'nurse medical' },
  { id: 'n2', name: 'Nurse Betty Boo', specialty: 'Pediatrics', location: 'Community Health Clinic', phone: '(555) 010-0202', avatar: 'https://placehold.co/100x100.png', email: 'betty.boo@example.com', status: 'On Duty', hint: 'nurse medical' },
  { id: 'n3', name: 'Nurse Charles Xavier', specialty: 'Cardiology', location: 'City Heart Institute', phone: '(555) 010-0303', avatar: 'https://placehold.co/100x100.png', email: 'charles.xavier@example.com', status: 'Available', hint: 'nurse medical' },
  { id: 'n4', name: 'Nurse Diana Prince', specialty: 'Oncology', location: 'Hope Cancer Center', phone: '(555) 010-0404', avatar: 'https://placehold.co/100x100.png', email: 'diana.prince@example.com', status: 'Unavailable', hint: 'nurse medical' },
  { id: 'n5', name: 'Nurse Eddie Brock', specialty: 'Psychiatry', location: 'Mental Wellness Center', phone: '(555) 010-0505', avatar: 'https://placehold.co/100x100.png', email: 'eddie.brock@example.com', status: 'On Duty', hint: 'nurse medical' },
];

export type NurseListItem = typeof mockNurses[number];

export async function fetchNurses(): Promise<{ data?: NurseListItem[], error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, you'd fetch this from your database
  return { data: mockNurses };
}


// Mock dashboard stats - in a real app, this would come from a database
const mockDashboardStats = {
  activePatients: 152,
  activePatientsChange: "+12 since last week",
  upcomingAppointments: 34,
  upcomingAppointmentsToday: "5 today",
  availableNurses: 28,
  availableNursesOnline: "Online now",
  careQualityScore: "92.5%",
  careQualityScoreTrend: "Above average",
};

export type DashboardStats = typeof mockDashboardStats;

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  // In a real app, you'd fetch and aggregate this from your database
  return { data: mockDashboardStats };
}
