
'use server';

import { 
  getPersonalizedCareSuggestions, 
  type PersonalizedCareSuggestionsInput, 
  type PersonalizedCareSuggestionsOutput 
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString } from '@/lib/utils';
// Firebase imports are removed or commented out as we are using mock data
// import { db, storage } from '@/lib/firebase';
// import { collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

// --- Patient Management ---
export type PatientListItem = {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  joinDate: string; 
  primaryNurse: string;
  phone: string;
  email: string;
  address: string;
  mobilityStatus: string;
  pathologies: string[];
  allergies: string[];
  lastVisit: string; 
  condition: string; 
  status: string;
  hint?: string;
  currentMedications?: Array<{ name: string; dosage: string }>;
  recentVitals?: { date: string; bp: string; hr: string; temp: string; glucose: string };
  // createdAt?: Timestamp; // Replaced with string for mock
  createdAt?: string; 
};

// Mock data for patients
let mockPatients: PatientListItem[] = [
  {
    id: "pat1", name: "Alice Wonderland", age: 30, avatarUrl: "https://placehold.co/100x100.png?text=AW", joinDate: "2023-01-15", primaryNurse: "Nurse Alex Ray", phone: "555-0101", email: "alice@example.com", address: "123 Main St, Wonderland", mobilityStatus: "Fully Mobile", pathologies: ["Migraines"], allergies: ["Pollen"], lastVisit: "2024-07-15", condition: "Stable", status: "Stable", hint: "woman face" ,
    currentMedications: [{ name: "Sumatriptan", dosage: "50mg as needed" }],
    recentVitals: { date: "2024-07-15", bp: "120/80 mmHg", hr: "70 bpm", temp: "37.0°C", glucose: "90 mg/dL" }
  },
  { 
    id: "pat2", name: "Bob The Builder", age: 45, avatarUrl: "https://placehold.co/100x100.png?text=BB", joinDate: "2023-03-20", primaryNurse: "Nurse Betty Boo", phone: "555-0102", email: "bob@example.com", address: "456 Construct Ave, Builderville", mobilityStatus: "Ambulatory", pathologies: ["Hypertension"], allergies: ["Dust Mites"], lastVisit: "2024-07-20", condition: "Hypertension", status: "Needs Follow-up", hint: "man construction" ,
    currentMedications: [{ name: "Lisinopril", dosage: "10mg daily" }],
    recentVitals: { date: "2024-07-20", bp: "140/90 mmHg", hr: "75 bpm", temp: "36.8°C", glucose: "100 mg/dL" }
  },
  { 
    id: "pat3", name: "Eleanor Vance", age: 72, avatarUrl: "https://placehold.co/100x100.png?text=EV", joinDate: "2023-05-12", primaryNurse: "Nurse Nightingale", phone: "+1 (555) 123-4567", email: "eleanor.vance@example.com", address: "456 Oak Avenue, Springfield, IL", mobilityStatus: "Ambulatory with cane, difficulty with stairs", pathologies: ["Hypertension", "Osteoarthritis", "Type 2 Diabetes (diet-controlled)"], allergies: ["Penicillin", "Shellfish"], lastVisit: '2024-07-22', condition: 'COPD', status: 'Stable', hint: 'elderly person' ,
    currentMedications: [
      { name: "Lisinopril", dosage: "10mg daily" },
      { name: "Metformin", dosage: "500mg twice daily" },
      { name: "Acetaminophen", dosage: "500mg as needed for pain" },
    ],
    recentVitals: { date: "2024-07-28", bp: "135/85 mmHg", hr: "72 bpm", temp: "36.8°C", glucose: "110 mg/dL" },
    createdAt: new Date().toISOString(),
  }
];

export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  console.log("actions.ts: fetchPatients (mock)");
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  return { data: [...mockPatients] };
}

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  console.log(`actions.ts: fetchPatientById (mock) for id: ${id}`);
  await new Promise(resolve => setTimeout(resolve, 200));
  const patient = mockPatients.find(p => p.id === id);
  if (patient) {
    // Ensure currentMedications and recentVitals have default values if not present
    const patientData = {
      ...patient,
      currentMedications: patient.currentMedications || [
        { name: "Lisinopril", dosage: "10mg daily" },
        { name: "Metformin", dosage: "500mg twice daily" },
      ],
      recentVitals: patient.recentVitals || {
        date: "2024-07-30", bp: "140/90 mmHg", hr: "75 bpm", temp: "37.0°C", glucose: "120 mg/dL"
      },
    };
    return { data: patientData };
  } else {
    return { error: "Patient not found." };
  }
}

const AddPatientInputSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().positive(),
  avatarFile: z.custom<File | undefined>().optional(),
  avatarUrl: z.string().url().optional(), // Keep this for potential direct URL input if needed
  joinDate: z.date(),
  primaryNurse: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  mobilityStatus: z.string().min(3),
  pathologies: z.string().min(3), 
  allergies: z.string().optional(),
});
export type AddPatientFormValues = z.infer<typeof AddPatientInputSchema>;

export async function addPatient(
  values: AddPatientFormValues
): Promise<{ success?: boolean; message: string; patientId?: string }> {
  console.log("actions.ts: addPatient (mock)", values);
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const validatedValues = AddPatientInputSchema.parse(values);
    
    let avatarUrlToStore = validatedValues.avatarUrl || `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'person face';

    if (validatedValues.avatarFile) {
      // Simulate file upload: In a real scenario, you'd upload to cloud storage and get a URL.
      // For mock, we'll just log it and use a placeholder.
      console.log("Simulating upload for file:", validatedValues.avatarFile.name);
      avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`; // Generic placeholder
      hint = `patient ${validatedValues.fullName}`;
    }
    
    const randomPassword = generateRandomPassword();
    const newPatientId = `pat${Date.now()}`;

    const newPatient: PatientListItem = {
      id: newPatientId,
      name: validatedValues.fullName,
      age: validatedValues.age,
      avatarUrl: avatarUrlToStore,
      hint: hint,
      joinDate: validatedValues.joinDate.toISOString().split('T')[0],
      primaryNurse: validatedValues.primaryNurse,
      phone: validatedValues.phone,
      email: validatedValues.email,
      address: validatedValues.address,
      mobilityStatus: validatedValues.mobilityStatus,
      pathologies: validatedValues.pathologies.split(',').map(p => p.trim()).filter(p => p.length > 0),
      allergies: validatedValues.allergies ? validatedValues.allergies.split(',').map(a => a.trim()).filter(a => a.length > 0) : [],
      lastVisit: new Date().toISOString().split('T')[0], 
      condition: validatedValues.pathologies.split(',')[0]?.trim() || 'N/A',
      status: 'Stable',
      createdAt: new Date().toISOString(),
    };
    mockPatients.push(newPatient);

    console.log("Patient added to mock array with ID: ", newPatientId);
    console.log("Generated password for new patient:", randomPassword);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New patient ${validatedValues.fullName} (${validatedValues.email}) added with ID ${newPatientId}.`);

    return { success: true, message: `Patient ${validatedValues.fullName} added successfully (mock).`, patientId: newPatientId };
  } catch (error) {
    console.error("Error adding patient (mock): ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to add patient (mock). Please check server logs." };
  }
}

// --- Nurse Management ---
export type NurseListItem = {
  id: string;
  name: string;
  specialty: string;
  location: string;
  phone: string;
  email: string;
  avatar: string;
  status: 'Available' | 'On Duty' | 'Unavailable' | string;
  hint?: string;
  // createdAt?: Timestamp; // Replaced with string for mock
  createdAt?: string;
};

// Mock data for nurses
let mockNurses: NurseListItem[] = [
  { id: 'nur1', name: 'Nurse Alex Ray', specialty: 'Geriatrics', location: 'Springfield General Hospital', phone: '(555) 010-0101', email: 'alex.ray@example.com', avatar: 'https://placehold.co/100x100.png?text=AR', status: 'Available', hint: 'nurse medical', createdAt: new Date().toISOString() },
  { id: 'nur2', name: 'Nurse Betty Boo', specialty: 'Pediatrics', location: 'Community Health Clinic', phone: '(555) 010-0202', email: 'betty.boo@example.com', avatar: 'https://placehold.co/100x100.png?text=BB', status: 'On Duty', hint: 'nurse medical', createdAt: new Date().toISOString() },
  { id: 'nur3', name: 'Nurse Charles Xavier', specialty: 'Cardiology', location: 'City Heart Institute', phone: '(555) 010-0303', email: 'charles.xavier@example.com', avatar: 'https://placehold.co/100x100.png?text=CX', status: 'Available', hint: 'nurse medical', createdAt: new Date().toISOString() },
  { id: 'nur4', name: 'Nurse Diana Prince', specialty: 'Oncology', location: 'Hope Cancer Center', phone: '(555) 010-0404', email: 'diana.prince@example.com', avatar: 'https://placehold.co/100x100.png?text=DP', status: 'Unavailable', hint: 'nurse medical', createdAt: new Date().toISOString() },
  { id: 'nur5', name: 'Nurse Nightingale', specialty: 'General Practice', location: 'SanHome HQ', phone: '(555) 010-0505', email: 'nightingale@example.com', avatar: 'https://placehold.co/100x100.png?text=NN', status: 'Available', hint: 'nurse medical', createdAt: new Date().toISOString() },
];


const AddNurseInputSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  specialty: z.string().min(3, { message: "Specialty is required." }),
  location: z.string().min(3, { message: "Location is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  avatarFile: z.custom<File | undefined>().optional(),
});
export type AddNurseFormValues = z.infer<typeof AddNurseInputSchema>;

export async function fetchNurses(): Promise<{ data?: NurseListItem[], error?: string }> {
  console.log("actions.ts: fetchNurses (mock)");
  await new Promise(resolve => setTimeout(resolve, 200));
  return { data: [...mockNurses] };
}

export async function addNurse(
  values: AddNurseFormValues
): Promise<{ success?: boolean; message: string; nurseId?: string }> {
  console.log("actions.ts: addNurse (mock)", values);
  await new Promise(resolve => setTimeout(resolve, 500));
   try {
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      console.log("Simulating upload for nurse avatar:", validatedValues.avatarFile.name);
      avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
      hint = `nurse ${validatedValues.fullName}`;
    }
    
    const randomPassword = generateRandomPassword();
    const newNurseId = `nur${Date.now()}`;

    const newNurse: NurseListItem = {
      id: newNurseId,
      name: validatedValues.fullName,
      email: validatedValues.email,
      specialty: validatedValues.specialty,
      location: validatedValues.location,
      phone: validatedValues.phone,
      avatar: avatarUrlToStore,
      hint: hint,
      status: 'Available', 
      createdAt: new Date().toISOString(),
    };
    mockNurses.push(newNurse);

    console.log("Nurse added to mock array with ID: ", newNurseId);
    console.log("Generated password for new nurse:", randomPassword);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New nurse ${validatedValues.fullName} (${validatedValues.email}) added with ID ${newNurseId}.`);
    
    return { success: true, message: `Nurse ${validatedValues.fullName} added successfully (mock).`, nurseId: newNurseId };
  } catch (error) {
    console.error("Error adding nurse (mock): ", error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to add nurse (mock). Please check server logs." };
  }
}


// --- Dashboard Stats ---
const initialDashboardStats = {
  activePatients: 0, 
  activePatientsChange: "+0 since last week",
  upcomingAppointments: 0, 
  upcomingAppointmentsToday: "0 today",
  availableNurses: 0, 
  availableNursesOnline: "Online now", 
  careQualityScore: "N/A",
  careQualityScoreTrend: "Data unavailable",
};

export type DashboardStats = typeof initialDashboardStats;

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  console.log("actions.ts: fetchDashboardStats (mock)");
  await new Promise(resolve => setTimeout(resolve, 300)); 
  try {
    const stats = { ...initialDashboardStats };
    stats.activePatients = mockPatients.length;
    stats.availableNurses = mockNurses.filter(n => n.status === 'Available').length;
    // upcomingAppointments would require a mockVideoConsults array or similar
    return { data: stats };
  } catch (error) {
    console.error("Error fetching dashboard stats (mock):", error);
    return { error: "Could not load dashboard statistics (mock).", data: initialDashboardStats };
  }
}

// --- Video Consultation Scheduling ---
type VideoConsult = {
  id: string;
  patientId: string;
  patientName: string;
  nurseId: string;
  nurseName: string;
  consultationTime: string; // Store as ISO string
  dailyRoomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string; // Store as ISO string
};

let mockVideoConsults: VideoConsult[] = [];

const ScheduleVideoConsultInputSchema = z.object({
  patientId: z.string().min(1),
  nurseId: z.string().min(1),
  consultationDateTime: z.date(),
});
export type ScheduleVideoConsultFormServerValues = z.infer<typeof ScheduleVideoConsultInputSchema>;

export async function scheduleVideoConsult(
  values: ScheduleVideoConsultFormServerValues
): Promise<{ success?: boolean; message: string; consultId?: string; roomUrl?: string }> {
  console.log("actions.ts: scheduleVideoConsult (mock)", values);
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const validatedValues = ScheduleVideoConsultInputSchema.parse(values);

    const patient = mockPatients.find(p => p.id === validatedValues.patientId);
    const nurse = mockNurses.find(n => n.id === validatedValues.nurseId);

    if (!patient) return { success: false, message: "Selected patient not found (mock)." };
    if (!nurse) return { success: false, message: "Selected nurse not found (mock)." };

    const dailyCoBaseUrl = process.env.NEXT_PUBLIC_DAILY_CO_BASE_URL || "https://YOUR_DOMAIN.daily.co/"; // User needs to set this in .env
    const roomName = `sanhome-consult-${generateRandomString(8)}`;
    const dailyRoomUrl = `${dailyCoBaseUrl}${roomName}`;
    const newConsultId = `vc${Date.now()}`;

    const newVideoConsult: VideoConsult = {
      id: newConsultId,
      patientId: validatedValues.patientId,
      patientName: patient.name,
      nurseId: validatedValues.nurseId,
      nurseName: nurse.name,
      consultationTime: validatedValues.consultationDateTime.toISOString(),
      dailyRoomUrl: dailyRoomUrl,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    mockVideoConsults.push(newVideoConsult);

    console.log(`Simulating email to Patient ${patient.name} (${patient.email}): 
      Video consult scheduled for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);
    
    console.log(`Simulating email to Nurse ${nurse.name} (${nurse.email}): 
      Video consult scheduled with ${patient.name} for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);
      
    console.log(`Admin_Notification: Video consult scheduled (mock) between ${patient.name} and ${nurse.name} for ${validatedValues.consultationDateTime.toLocaleString()}. Link: ${dailyRoomUrl}. ID: ${newConsultId}`);

    return { 
      success: true, 
      message: `Video consult scheduled successfully (mock) for ${patient.name} with ${nurse.name}. Link: ${dailyRoomUrl}`, 
      consultId: newConsultId,
      roomUrl: dailyRoomUrl 
    };

  } catch (error) {
    console.error("Error scheduling video consult (mock): ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to schedule video consult (mock). Please check server logs." };
  }
}
