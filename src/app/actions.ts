
'use server';

import { 
  getPersonalizedCareSuggestions, 
  type PersonalizedCareSuggestionsInput, 
  type PersonalizedCareSuggestionsOutput 
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword } from '@/lib/utils';
import { db, storage } from '@/lib/firebase'; // Import db and storage
import { collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  joinDate: string; // Storing as YYYY-MM-DD string
  primaryNurse: string;
  phone: string;
  email: string;
  address: string;
  mobilityStatus: string;
  pathologies: string[];
  allergies: string[];
  lastVisit: string; // Storing as YYYY-MM-DD string
  condition: string;
  status: string;
  hint?: string;
  // Additional fields for profile page, if not directly on PatientListItem from DB
  currentMedications?: Array<{ name: string; dosage: string }>;
  recentVitals?: { date: string; bp: string; hr: string; temp: string; glucose: string };
  createdAt?: Timestamp; // Firestore timestamp
};

export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  try {
    const patientsCollection = collection(db, "patients");
    const querySnapshot = await getDocs(patientsCollection);
    const patientsData = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Ensure date fields are correctly formatted if stored as Timestamps
      joinDate: doc.data().joinDate instanceof Timestamp ? doc.data().joinDate.toDate().toISOString().split('T')[0] : doc.data().joinDate,
      lastVisit: doc.data().lastVisit instanceof Timestamp ? doc.data().lastVisit.toDate().toISOString().split('T')[0] : doc.data().lastVisit,
    })) as PatientListItem[];
    return { data: patientsData };
  } catch (e) {
    console.error("Error fetching patients from Firestore:", e);
    return { error: "Failed to fetch patients." };
  }
}

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  try {
    const patientDocRef = doc(db, "patients", id);
    const docSnap = await getDoc(patientDocRef);
    if (docSnap.exists()) {
      const patientData = { 
        id: docSnap.id, 
        ...docSnap.data(),
        joinDate: docSnap.data().joinDate instanceof Timestamp ? docSnap.data().joinDate.toDate().toISOString().split('T')[0] : docSnap.data().joinDate,
        lastVisit: docSnap.data().lastVisit instanceof Timestamp ? docSnap.data().lastVisit.toDate().toISOString().split('T')[0] : docSnap.data().lastVisit,
         // Mocking these for now as they are not in the addPatient form
        currentMedications: docSnap.data().currentMedications || [ 
          { name: "Lisinopril", dosage: "10mg daily" },
          { name: "Metformin", dosage: "500mg twice daily" },
        ],
        recentVitals: docSnap.data().recentVitals || {
          date: "2024-07-30", bp: "140/90 mmHg", hr: "75 bpm", temp: "37.0°C", glucose: "120 mg/dL"
        },
      } as PatientListItem;
      return { data: patientData };
    } else {
      return { error: "Patient not found." };
    }
  } catch (e) {
    console.error("Error fetching patient by ID from Firestore:", e);
    return { error: "Failed to fetch patient details." };
  }
}

const AddPatientInputSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().positive(),
  avatarFile: z.instanceof(File).optional(),
  avatarUrl: z.string().url().optional(), // To store the URL from storage
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
  try {
    const validatedValues = AddPatientInputSchema.parse(values);
    let avatarUrlToStore = validatedValues.avatarUrl || `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'person face';

    if (validatedValues.avatarFile) {
      const storageRef = ref(storage, `patient-avatars/${Date.now()}_${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `patient ${validatedValues.fullName}`; // More specific hint if image uploaded
    }

    const randomPassword = generateRandomPassword();
    
    const patientDataForFirestore = {
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
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "patients"), patientDataForFirestore);

    console.log("Patient added with ID: ", docRef.id);
    console.log("Generated password for new patient:", randomPassword);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New patient ${validatedValues.fullName} (${validatedValues.email}) added with ID ${docRef.id}.`);

    return { success: true, message: `Patient ${validatedValues.fullName} added successfully.`, patientId: docRef.id };
  } catch (error) {
    console.error("Error adding patient: ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to add patient. Please check server logs." };
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
  avatar: string; // URL to avatar image
  status: 'Available' | 'On Duty' | 'Unavailable' | string;
  hint?: string;
  createdAt?: Timestamp; // Firestore timestamp
};

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
  try {
    const nursesCollection = collection(db, "nurses");
    const querySnapshot = await getDocs(nursesCollection);
    const nursesData = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as NurseListItem[];
    return { data: nursesData };
  } catch (e) {
    console.error("Error fetching nurses from Firestore:", e);
    return { error: "Failed to fetch nurses." };
  }
}

export async function addNurse(
  values: AddNurseFormValues
): Promise<{ success?: boolean; message: string; nurseId?: string }> {
   try {
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      const storageRef = ref(storage, `nurse-avatars/${Date.now()}_${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `nurse ${validatedValues.fullName}`;
    }
    
    const randomPassword = generateRandomPassword();

    const nurseDataForFirestore = {
      name: validatedValues.fullName,
      email: validatedValues.email,
      specialty: validatedValues.specialty,
      location: validatedValues.location,
      phone: validatedValues.phone,
      avatar: avatarUrlToStore,
      hint: hint,
      status: 'Available', // Default status
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "nurses"), nurseDataForFirestore);

    console.log("Nurse added with ID: ", docRef.id);
    console.log("Generated password for new nurse:", randomPassword);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New nurse ${validatedValues.fullName} (${validatedValues.email}) added with ID ${docRef.id}.`);
    
    return { success: true, message: `Nurse ${validatedValues.fullName} added successfully.`, nurseId: docRef.id };
  } catch (error) {
    console.error("Error adding nurse: ", error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to add nurse. Please check server logs." };
  }
}


// --- Dashboard Stats ---
const mockDashboardStats = {
  activePatients: 0, // Will be calculated if we query patients
  activePatientsChange: "+0 since last week",
  upcomingAppointments: 0, // Needs appointments data
  upcomingAppointmentsToday: "0 today",
  availableNurses: 0, // Will be calculated if we query nurses
  availableNursesOnline: "Online now", // Needs more complex nurse status
  careQualityScore: "N/A",
  careQualityScoreTrend: "Data unavailable",
};

export type DashboardStats = typeof mockDashboardStats;

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
  try {
    // In a real app, you'd fetch and aggregate this from your database
    // For example, count patients, count nurses with status 'Available'
    const patientsResult = await fetchPatients();
    const nursesResult = await fetchNurses();

    const stats = { ...mockDashboardStats };

    if (patientsResult.data) {
      stats.activePatients = patientsResult.data.length;
      // More complex logic for activePatientsChange would be needed
    }
    if (nursesResult.data) {
      stats.availableNurses = nursesResult.data.filter(n => n.status === 'Available').length;
      // availableNursesOnline would need more complex status tracking
    }
    
    return { data: stats };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { error: "Could not load dashboard statistics.", data: mockDashboardStats };
  }
}
