
'use server';

import { 
  getPersonalizedCareSuggestions, 
  type PersonalizedCareSuggestionsInput, 
  type PersonalizedCareSuggestionsOutput 
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString } from '@/lib/utils'; // Added generateRandomString
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
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
  createdAt?: Timestamp; 
};

export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  try {
    const patientsCollection = collection(db, "patients");
    const querySnapshot = await getDocs(patientsCollection);
    const patientsData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : typeof data.joinDate === 'string' ? data.joinDate : new Date().toISOString().split('T')[0],
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : typeof data.lastVisit === 'string' ? data.lastVisit : new Date().toISOString().split('T')[0],
        pathologies: Array.isArray(data.pathologies) ? data.pathologies : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
      } as PatientListItem;
    });
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
      const data = docSnap.data();
      const patientData = { 
        id: docSnap.id, 
        ...data,
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : typeof data.joinDate === 'string' ? data.joinDate : new Date().toISOString().split('T')[0],
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : typeof data.lastVisit === 'string' ? data.lastVisit : new Date().toISOString().split('T')[0],
        pathologies: Array.isArray(data.pathologies) ? data.pathologies : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        currentMedications: data.currentMedications || [ 
          { name: "Lisinopril", dosage: "10mg daily" },
          { name: "Metformin", dosage: "500mg twice daily" },
        ],
        recentVitals: data.recentVitals || {
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
  avatarFile: z.custom<File | undefined>().optional(),
  avatarUrl: z.string().url().optional(),
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
      hint = `patient ${validatedValues.fullName}`; 
    }

    const randomPassword = generateRandomPassword();
    
    const patientDataForFirestore = {
      name: validatedValues.fullName,
      age: validatedValues.age,
      avatarUrl: avatarUrlToStore,
      hint: hint,
      joinDate: Timestamp.fromDate(validatedValues.joinDate),
      primaryNurse: validatedValues.primaryNurse,
      phone: validatedValues.phone,
      email: validatedValues.email,
      address: validatedValues.address,
      mobilityStatus: validatedValues.mobilityStatus,
      pathologies: validatedValues.pathologies.split(',').map(p => p.trim()).filter(p => p.length > 0),
      allergies: validatedValues.allergies ? validatedValues.allergies.split(',').map(a => a.trim()).filter(a => a.length > 0) : [],
      lastVisit: Timestamp.fromDate(new Date()), 
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
  avatar: string;
  status: 'Available' | 'On Duty' | 'Unavailable' | string;
  hint?: string;
  createdAt?: Timestamp;
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
      status: 'Available', 
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
  activePatients: 0, 
  activePatientsChange: "+0 since last week",
  upcomingAppointments: 0, 
  upcomingAppointmentsToday: "0 today",
  availableNurses: 0, 
  availableNursesOnline: "Online now", 
  careQualityScore: "N/A",
  careQualityScoreTrend: "Data unavailable",
};

export type DashboardStats = typeof mockDashboardStats;

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  await new Promise(resolve => setTimeout(resolve, 300)); 
  try {
    const patientsResult = await fetchPatients();
    const nursesResult = await fetchNurses();

    const stats = { ...mockDashboardStats };

    if (patientsResult.data) {
      stats.activePatients = patientsResult.data.length;
    }
    if (nursesResult.data) {
      stats.availableNurses = nursesResult.data.filter(n => n.status === 'Available').length;
    }
    // Fetching upcomingAppointments would require querying an 'appointments' or 'videoConsults' collection
    // For now, we'll keep it at 0 or use a mock value.
    // Example: const videoConsults = await getDocs(collection(db, "videoConsults")); stats.upcomingAppointments = videoConsults.docs.length;

    return { data: stats };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { error: "Could not load dashboard statistics.", data: mockDashboardStats };
  }
}

// --- Video Consultation Scheduling ---
const ScheduleVideoConsultInputSchema = z.object({
  patientId: z.string().min(1),
  nurseId: z.string().min(1),
  consultationDateTime: z.date(),
});
export type ScheduleVideoConsultFormServerValues = z.infer<typeof ScheduleVideoConsultInputSchema>;

export async function scheduleVideoConsult(
  values: ScheduleVideoConsultFormServerValues
): Promise<{ success?: boolean; message: string; consultId?: string; roomUrl?: string }> {
  try {
    const validatedValues = ScheduleVideoConsultInputSchema.parse(values);

    // Fetch patient and nurse details to get names and emails
    const patientSnap = await getDoc(doc(db, "patients", validatedValues.patientId));
    const nurseSnap = await getDoc(doc(db, "nurses", validatedValues.nurseId));

    if (!patientSnap.exists()) return { success: false, message: "Selected patient not found." };
    if (!nurseSnap.exists()) return { success: false, message: "Selected nurse not found." };

    const patientData = patientSnap.data() as PatientListItem;
    const nurseData = nurseSnap.data() as NurseListItem;

    // Simulate Daily.co room URL generation
    // IMPORTANT: Replace 'YOUR_DAILY_CO_DOMAIN.daily.co' with your actual Daily.co domain
    // or use an environment variable.
    const dailyCoBaseUrl = process.env.NEXT_PUBLIC_DAILY_CO_BASE_URL || "https://YOUR_DAILY_CO_DOMAIN.daily.co/";
    const roomName = `sanhome-consult-${generateRandomString(8)}`;
    const dailyRoomUrl = `${dailyCoBaseUrl}${roomName}`;

    const videoConsultData = {
      patientId: validatedValues.patientId,
      patientName: patientData.name,
      nurseId: validatedValues.nurseId,
      nurseName: nurseData.name,
      consultationTime: Timestamp.fromDate(validatedValues.consultationDateTime),
      dailyRoomUrl: dailyRoomUrl,
      status: 'scheduled',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "videoConsults"), videoConsultData);

    // Simulate sending email notifications
    console.log(`Simulating email to Patient ${patientData.name} (${patientData.email}): 
      Video consult scheduled for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);
    
    console.log(`Simulating email to Nurse ${nurseData.name} (${nurseData.email}): 
      Video consult scheduled with ${patientData.name} for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);
      
    console.log(`Admin_Notification: Video consult scheduled between ${patientData.name} and ${nurseData.name} for ${validatedValues.consultationDateTime.toLocaleString()}. Link: ${dailyRoomUrl}`);

    return { 
      success: true, 
      message: `Video consult scheduled successfully for ${patientData.name} with ${nurseData.name}. Link: ${dailyRoomUrl}`, 
      consultId: docRef.id,
      roomUrl: dailyRoomUrl 
    };

  } catch (error) {
    console.error("Error scheduling video consult: ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: "Failed to schedule video consult. Please check server logs." };
  }
}

