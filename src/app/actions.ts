
'use server';

import {
  getPersonalizedCareSuggestions,
  type PersonalizedCareSuggestionsInput,
  type PersonalizedCareSuggestionsOutput
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString } from '@/lib/utils';
import { db, storage } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp,
  query, where, updateDoc, deleteDoc, writeBatch, getCountFromServer, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
  console.log("actions.ts: fetchPatients (Firestore)");
  try {
    const patientsCollection = collection(db, "patients");
    const q = query(patientsCollection, orderBy("createdAt", "desc"));
    const patientsSnapshot = await getDocs(q);
    const patientsList = patientsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
        // createdAt is already a Timestamp or undefined
      } as PatientListItem;
    });
    return { data: patientsList };
  } catch (error: any) {
    console.error("Error fetching patients from Firestore:", error);
    return { error: `Failed to fetch patients: ${error.message}` };
  }
}

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  console.log(`actions.ts: fetchPatientById (Firestore) for id: ${id}`);
  try {
    if (!id) return { error: "Patient ID is required." };
    const patientDocRef = doc(db, "patients", id);
    const patientDoc = await getDoc(patientDocRef);
    if (patientDoc.exists()) {
      const data = patientDoc.data();
      const patientData = {
        id: patientDoc.id,
        ...data,
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
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
  } catch (error: any) {
    console.error("Error fetching patient by ID from Firestore:", error);
    return { error: `Failed to fetch patient: ${error.message}` };
  }
}

const AddPatientInputSchema = z.object({
  fullName: z.string().min(2),
  age: z.coerce.number().int().positive(),
  avatarFile: z.custom<File | undefined>().optional(),
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
  console.log("actions.ts: addPatient (Firestore)", values);
  try {
    const validatedValues = AddPatientInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'person face';

    if (validatedValues.avatarFile) {
      const storageRef = ref(storage, `patient-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `patient ${validatedValues.fullName}`;
      console.log("Uploaded patient avatar to:", avatarUrlToStore);
    }

    const randomPassword = generateRandomPassword();
    const newPatientData = {
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

    const docRef = await addDoc(collection(db, "patients"), newPatientData);
    console.log("Patient added to Firestore with ID: ", docRef.id);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New patient ${validatedValues.fullName} (${validatedValues.email}) added with ID ${docRef.id}.`);

    return { success: true, message: `Patient ${validatedValues.fullName} added successfully.`, patientId: docRef.id };
  } catch (error: any) {
    console.error("Error adding patient to Firestore: ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add patient: ${error.message}` };
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

export async function fetchNurses(): Promise<{ data?: NurseListItem[], error?: string }> {
  console.log("actions.ts: fetchNurses (Firestore)");
  try {
    const nursesCollection = collection(db, "nurses");
    const q = query(nursesCollection, orderBy("createdAt", "desc"));
    const nursesSnapshot = await getDocs(q);
    const nursesList = nursesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // createdAt is already a Timestamp or undefined
      } as NurseListItem;
    });
    return { data: nursesList };
  } catch (error: any) {
    console.error("Error fetching nurses from Firestore:", error);
    return { error: `Failed to fetch nurses: ${error.message}` };
  }
}

const AddNurseInputSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  specialty: z.string().min(3, { message: "Specialty is required." }),
  location: z.string().min(3, { message: "Location is required." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  avatarFile: z.custom<File | undefined>().optional(),
});
export type AddNurseFormValues = z.infer<typeof AddNurseInputSchema>;

export async function addNurse(
  values: AddNurseFormValues
): Promise<{ success?: boolean; message: string; nurseId?: string }> {
  console.log("actions.ts: addNurse (Firestore)", values);
   try {
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      const storageRef = ref(storage, `nurse-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `nurse ${validatedValues.fullName}`;
      console.log("Uploaded nurse avatar to:", avatarUrlToStore);
    }

    const randomPassword = generateRandomPassword();
    const newNurseData = {
      name: validatedValues.fullName,
      email: validatedValues.email,
      specialty: validatedValues.specialty,
      location: validatedValues.location,
      phone: validatedValues.phone,
      avatar: avatarUrlToStore,
      hint: hint,
      status: 'Available' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "nurses"), newNurseData);
    console.log("Nurse added to Firestore with ID: ", docRef.id);
    console.log(`Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`Admin_Notification: New nurse ${validatedValues.fullName} (${validatedValues.email}) added with ID ${docRef.id}.`);

    return { success: true, message: `Nurse ${validatedValues.fullName} added successfully.`, nurseId: docRef.id };
  } catch (error: any) {
    console.error("Error adding nurse to Firestore: ", error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add nurse: ${error.message}` };
  }
}

// --- Dashboard Stats ---
export type DashboardStats = {
  activePatients: number;
  activePatientsChange: string;
  upcomingAppointments: number;
  upcomingAppointmentsToday: string;
  availableNurses: number;
  availableNursesOnline: string;
  careQualityScore: string;
  careQualityScoreTrend: string;
};

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  console.log("actions.ts: fetchDashboardStats (Firestore)");
  try {
    const patientsCollection = collection(db, "patients");
    const nursesCollection = collection(db, "nurses");
    const videoConsultsCollection = collection(db, "videoConsults");

    const patientCountSnapshot = await getCountFromServer(patientsCollection);
    const activePatients = patientCountSnapshot.data().count;

    const availableNursesQuery = query(nursesCollection, where("status", "==", "Available"));
    const availableNursesSnapshot = await getCountFromServer(availableNursesQuery);
    const availableNurses = availableNursesSnapshot.data().count;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = Timestamp.fromDate(todayStart);

    const upcomingAppointmentsQuery = query(videoConsultsCollection, where("consultationTime", ">=", todayStartTimestamp), where("status", "==", "scheduled"));
    const upcomingAppointmentsSnapshot = await getCountFromServer(upcomingAppointmentsQuery);
    const upcomingAppointments = upcomingAppointmentsSnapshot.data().count;

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const tomorrowStartTimestamp = Timestamp.fromDate(tomorrowStart);

    const todayAppointmentsQuery = query(
        videoConsultsCollection,
        where("consultationTime", ">=", todayStartTimestamp),
        where("consultationTime", "<", tomorrowStartTimestamp),
        where("status", "==", "scheduled")
    );
    const todayAppointmentsSnapshot = await getCountFromServer(todayAppointmentsQuery);
    const upcomingAppointmentsTodayCount = todayAppointmentsSnapshot.data().count;

    // Placeholder data for changes and quality score
    const activePatientsChange = activePatients > 0 ? `+${Math.floor(Math.random()*5 + 1)} since last week` : "N/A";
    const availableNursesOnline = availableNurses > 0 ? `Online: ${Math.floor(Math.random()*availableNurses + 1)}` : "Online: 0";
    const careQualityScore = `${Math.floor(Math.random() * 10 + 88)}%`;
    const careQualityScoreTrend = `Up by ${Math.floor(Math.random()*3+1)}% from last month`;


    const stats: DashboardStats = {
      activePatients: activePatients,
      activePatientsChange: activePatientsChange,
      upcomingAppointments: upcomingAppointments,
      upcomingAppointmentsToday: `${upcomingAppointmentsTodayCount} today`,
      availableNurses: availableNurses,
      availableNursesOnline: availableNursesOnline,
      careQualityScore: careQualityScore,
      careQualityScoreTrend: careQualityScoreTrend,
    };
    return { data: stats };
  } catch (error: any) {
    console.error("Error fetching dashboard stats from Firestore:", error);
    return {
      error: `Could not load dashboard statistics: ${error.message}`,
      data: { // Return some default/fallback stats
        activePatients: 0, activePatientsChange: "N/A",
        upcomingAppointments: 0, upcomingAppointmentsToday: "N/A",
        availableNurses: 0, availableNursesOnline: "N/A",
        careQualityScore: "N/A", careQualityScoreTrend: "N/A",
      }
    };
  }
}

// --- Video Consultation Scheduling ---
export type VideoConsultListItem = {
  id: string;
  patientId: string;
  patientName: string;
  nurseId: string;
  nurseName: string;
  consultationTime: string; // Converted to ISO string for client
  dailyRoomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string; // Converted to ISO string for client
};

const ScheduleVideoConsultInputSchema = z.object({
  patientId: z.string().min(1),
  nurseId: z.string().min(1),
  consultationDateTime: z.date(),
});
export type ScheduleVideoConsultFormServerValues = z.infer<typeof ScheduleVideoConsultInputSchema>;

export async function scheduleVideoConsult(
  values: ScheduleVideoConsultFormServerValues
): Promise<{ success?: boolean; message: string; consultId?: string; roomUrl?: string }> {
  console.log("actions.ts: scheduleVideoConsult (Firestore)", values);
  try {
    const validatedValues = ScheduleVideoConsultInputSchema.parse(values);

    const patientDocRef = doc(db, "patients", validatedValues.patientId);
    const nurseDocRef = doc(db, "nurses", validatedValues.nurseId);

    const [patientDocSnap, nurseDocSnap] = await Promise.all([
      getDoc(patientDocRef),
      getDoc(nurseDocRef)
    ]);

    if (!patientDocSnap.exists()) return { success: false, message: "Selected patient not found." };
    if (!nurseDocSnap.exists()) return { success: false, message: "Selected nurse not found." };

    const patient = patientDocSnap.data() as Omit<PatientListItem, 'id'>;
    const nurse = nurseDocSnap.data() as Omit<NurseListItem, 'id'>;

    const dailyCoBaseUrl = process.env.NEXT_PUBLIC_DAILY_CO_BASE_URL;
    if (!dailyCoBaseUrl || dailyCoBaseUrl.includes("YOUR_DOMAIN.daily.co")) {
        console.warn("CRITICAL: NEXT_PUBLIC_DAILY_CO_BASE_URL is not set correctly in .env file.");
        return { success: false, message: "Daily.co base URL not configured. Please set NEXT_PUBLIC_DAILY_CO_BASE_URL in your .env file."}
    }
    const roomName = `sanhome-consult-${generateRandomString(8)}`;
    const dailyRoomUrl = `${dailyCoBaseUrl.endsWith('/') ? dailyCoBaseUrl : dailyCoBaseUrl + '/'}${roomName}`;

    const newVideoConsultData = {
      patientId: validatedValues.patientId,
      patientName: patient.name,
      nurseId: validatedValues.nurseId,
      nurseName: nurse.name,
      consultationTime: Timestamp.fromDate(validatedValues.consultationDateTime),
      dailyRoomUrl: dailyRoomUrl,
      status: 'scheduled' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "videoConsults"), newVideoConsultData);

    console.log(`Simulating email to Patient ${patient.name} (${patient.email}):
      Video consult scheduled for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);

    console.log(`Simulating email to Nurse ${nurse.name} (${nurse.email}):
      Video consult scheduled with ${patient.name} for ${validatedValues.consultationDateTime.toLocaleString()}
      Join Link: ${dailyRoomUrl}`);

    console.log(`Admin_Notification: Video consult scheduled between ${patient.name} and ${nurse.name} for ${validatedValues.consultationDateTime.toLocaleString()}. Link: ${dailyRoomUrl}. ID: ${docRef.id}`);

    return {
      success: true,
      message: `Video consult scheduled successfully for ${patient.name} with ${nurse.name}. Link: ${dailyRoomUrl}`,
      consultId: docRef.id,
      roomUrl: dailyRoomUrl
    };

  } catch (error: any) {
    console.error("Error scheduling video consult: ", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to schedule video consult: ${error.message}` };
  }
}

export async function fetchVideoConsults(): Promise<{ data?: VideoConsultListItem[], error?: string }> {
  console.log("actions.ts: fetchVideoConsults (Firestore)");
  try {
    const consultsCollection = collection(db, "videoConsults");
    const q = query(consultsCollection, orderBy("consultationTime", "desc"));
    const consultsSnapshot = await getDocs(q);

    const consultsList = consultsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patientId: data.patientId,
        patientName: data.patientName,
        nurseId: data.nurseId,
        nurseName: data.nurseName,
        consultationTime: data.consultationTime instanceof Timestamp ? data.consultationTime.toDate().toISOString() : new Date().toISOString(),
        dailyRoomUrl: data.dailyRoomUrl,
        status: data.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as VideoConsultListItem;
    });
    return { data: consultsList };
  } catch (error: any) {
    console.error("Error fetching video consults from Firestore:", error);
    return { error: `Failed to fetch video consults: ${error.message}` };
  }
}
