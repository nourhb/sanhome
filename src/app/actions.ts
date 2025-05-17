
'use server';

import {
  getPersonalizedCareSuggestions,
  type PersonalizedCareSuggestionsInput,
  type PersonalizedCareSuggestionsOutput
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString, generatePhoneNumber, generateDateOfBirth } from '@/lib/utils';
import { auth as firebaseAuthInstance, db as firestoreInstance, storage as firebaseStorageInstance } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp,
  query, where, updateDoc, deleteDoc, writeBatch, getCountFromServer, orderBy, limit, setDoc, collectionGroup
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format, parseISO } from 'date-fns';

// REMINDER FOR SEEDING:
// To successfully seed the database using this server action when your Firestore rules are
// `allow read, write: if request.auth != null;`, you MUST:
// 1. Be logged into the application when triggering the seed action.
// 2. OR, TEMPORARILY open your Firestore rules (e.g., `allow read, write: if true;`),
//    run the seed, then IMMEDIATELY revert to secure rules. This is often necessary
//    because server actions using the client SDK may not perfectly carry client auth context.
//    This is crucial for the initial checks like getCountFromServer.

console.log('[ACTION_LOG] Top of actions.ts: Firebase db object initialized in lib/firebase.ts?', !!firestoreInstance);
console.log('[ACTION_LOG] Top of actions.ts: Firebase auth object initialized in lib/firebase.ts?', !!firebaseAuthInstance);


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
    console.error("[ACTION_ERROR] Error fetching personalized care suggestions:", e);
    return { error: "Failed to generate care suggestions. Please try again." };
  }
}

// --- Patient Management ---
export type PatientListItem = {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  joinDate: string; // Should be ISO string date
  primaryNurse: string;
  phone: string;
  email: string;
  address: string;
  mobilityStatus: string;
  pathologies: string[];
  allergies: string[];
  lastVisit: string; // Should be ISO string date
  condition: string;
  status: string;
  hint?: string;
  currentMedications?: Array<{ name: string; dosage: string }>;
  recentVitals?: { date: string; bp: string; hr: string; temp: string; glucose: string };
  createdAt?: Timestamp;
};

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  console.log(`[ACTION_LOG] fetchPatientById: Initiated for ID: ${id}`);
  try {
    if (!id) {
      console.error("[ACTION_ERROR] fetchPatientById: Patient ID is required.");
      return { error: "Patient ID is required." };
    }
    const patientDocRef = doc(firestoreInstance, "patients", id);
    console.log("[ACTION_LOG] fetchPatientById: Created document reference. Attempting getDoc...");
    const patientDoc = await getDoc(patientDocRef);

    if (patientDoc.exists()) {
      const data = patientDoc.data();
      console.log("[ACTION_LOG] fetchPatientById: Document exists. Mapping data.");
      const pathologiesArray = Array.isArray(data.pathologies) ? data.pathologies : (typeof data.pathologies === 'string' ? data.pathologies.split(',').map(p => p.trim()) : []);
      const allergiesArray = Array.isArray(data.allergies) ? data.allergies : (typeof data.allergies === 'string' ? data.allergies.split(',').map(a => a.trim()) : []);

      const patientData = {
        id: patientDoc.id,
        name: data.name || "N/A",
        age: data.age || 0,
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=P`,
        hint: data.hint || 'person face',
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate || new Date().toISOString().split('T')[0],
        primaryNurse: data.primaryNurse || "N/A",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        address: data.address || "N/A",
        mobilityStatus: data.mobilityStatus || "N/A",
        pathologies: pathologiesArray,
        allergies: allergiesArray,
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit || new Date().toISOString().split('T')[0],
        condition: data.condition || "N/A",
        status: data.status || "N/A",
        currentMedications: data.currentMedications || [
            { name: "Lisinopril", dosage: "10mg daily" },
            { name: "Metformin", dosage: "500mg twice daily" },
        ],
        recentVitals: data.recentVitals || {
            date: "2024-07-30", bp: "140/90 mmHg", hr: "75 bpm", temp: "37.0°C", glucose: "120 mg/dL"
        },
        createdAt: data.createdAt,
      } as PatientListItem;
      console.log("[ACTION_LOG] fetchPatientById: Data mapping complete. Returning data.");
      return { data: patientData };
    } else {
      console.warn(`[ACTION_WARN] fetchPatientById: Patient with ID ${id} not found.`);
      return { error: "Patient not found." };
    }
  } catch (error: any) {
    console.error(`[ACTION_ERROR] fetchPatientById: Error fetching patient ${id}:`, error.code, error.message, error);
    return { error: `Failed to fetch patient: ${error.message} (Code: ${error.code || 'N/A'})` };
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
export type AddPatientFormValues = z.infer<typeof AddPatientInputSchema>  & { avatarUrl?: string };


export async function addPatient(
  values: AddPatientFormValues
): Promise<{ success?: boolean; message: string; patientId?: string }> {
  console.log("[ACTION_LOG] addPatient: Initiated with values:", values.fullName);
  try {
    const validatedValues = AddPatientInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'person face';

    if (validatedValues.avatarFile) {
      console.log("[ACTION_LOG] addPatient: Avatar file provided. Uploading...");
      const storageRef = ref(firebaseStorageInstance, `patient-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `patient ${validatedValues.fullName}`;
      console.log("[ACTION_LOG] addPatient: Avatar uploaded to:", avatarUrlToStore);
    } else {
      console.log("[ACTION_LOG] addPatient: No avatar file provided. Using placeholder.");
    }

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
      lastVisit: Timestamp.fromDate(new Date()), // Default to now
      condition: validatedValues.pathologies.split(',')[0]?.trim() || 'N/A', // First pathology as condition
      status: 'Stable', // Default status
      createdAt: serverTimestamp(),
    };

    console.log("[ACTION_LOG] addPatient: Attempting to add document to Firestore 'patients' collection.");
    const docRef = await addDoc(collection(firestoreInstance, "patients"), newPatientData);
    console.log("[ACTION_LOG] addPatient: Patient added to Firestore with ID: ", docRef.id);

    return { success: true, message: `Patient ${validatedValues.fullName} added successfully.`, patientId: docRef.id };
  } catch (error: any) {
    console.error("[ACTION_ERROR] addPatient: Error adding patient to Firestore: ", error.code, error.message, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add patient: ${error.message} (Code: ${error.code || 'N/A'})` };
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


export async function addNurse(
  values: AddNurseFormValues
): Promise<{ success?: boolean; message: string; nurseId?: string }> {
  console.log("[ACTION_LOG] addNurse: Initiated with values:", values.fullName);
   try {
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      console.log("[ACTION_LOG] addNurse: Avatar file provided. Uploading...");
      const storageRef = ref(firebaseStorageInstance, `nurse-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `nurse ${validatedValues.fullName}`;
      console.log("[ACTION_LOG] addNurse: Avatar uploaded to:", avatarUrlToStore);
    } else {
      console.log("[ACTION_LOG] addNurse: No avatar file provided. Using placeholder.");
    }

    const newNurseData = {
      name: validatedValues.fullName,
      email: validatedValues.email,
      specialty: validatedValues.specialty,
      location: validatedValues.location,
      phone: validatedValues.phone,
      avatar: avatarUrlToStore,
      hint: hint,
      status: 'Available' as const, // Default status
      createdAt: serverTimestamp(),
    };

    console.log("[ACTION_LOG] addNurse: Attempting to add document to Firestore 'nurses' collection.");
    const docRef = await addDoc(collection(firestoreInstance, "nurses"), newNurseData);
    console.log("[ACTION_LOG] addNurse: Nurse added to Firestore with ID: ", docRef.id);

    // Simulate sending email and admin notification
    const randomPassword = generateRandomPassword(8);
    console.log(`[ACTION_LOG] addNurse: Simulated - Email sent to ${validatedValues.email} with temporary password: ${randomPassword}`);
    console.log(`[ACTION_LOG] addNurse: Simulated - Admin notified about new nurse registration: ${validatedValues.fullName}`);


    return { success: true, message: `Nurse ${validatedValues.fullName} added successfully & notified.`, nurseId: docRef.id };
  } catch (error: any)
{
    console.error("[ACTION_ERROR] addNurse: Error adding nurse to Firestore: ", error.code, error.message, error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add nurse: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

// --- Dashboard Stats ---
export type PatientRegistrationDataPoint = { month: string; newPatients: number };
export type AppointmentStatusDataPoint = { status: string; count: number, fill: string };
export type NursePerformanceDataPoint = { nurseName: string; consults: number, fill: string };

export type DashboardStats = {
  activePatients: number;
  activePatientsChange: string;
  upcomingAppointments: number;
  upcomingAppointmentsToday: string;
  availableNurses: number;
  availableNursesOnline: string;
  careQualityScore: string;
  careQualityScoreTrend: string;
  patientRegistrationsData: PatientRegistrationDataPoint[];
  appointmentStatusData: AppointmentStatusDataPoint[];
  nursePerformanceData: NursePerformanceDataPoint[];
};

export async function fetchDashboardStats(): Promise<{ data?: DashboardStats, error?: string}> {
  console.log("[ACTION_LOG] fetchDashboardStats: Initiated.");
  try {
    const patientsCollectionRef = collection(firestoreInstance, "patients");
    const nursesCollectionRef = collection(firestoreInstance, "nurses");
    const videoConsultsCollectionRef = collection(firestoreInstance, "videoConsults");

    console.log("[ACTION_LOG] fetchDashboardStats: Getting counts for patients, nurses, consults.");
    const [
      patientCountSnapshot,
      nursesSnapshot, // Fetch all nurses for status
      videoConsultsSnapshot // Fetch all consults for aggregation
    ] = await Promise.all([
      getCountFromServer(patientsCollectionRef),
      getDocs(query(nursesCollectionRef)), 
      getDocs(query(videoConsultsCollectionRef))
    ]);
    console.log("[ACTION_LOG] fetchDashboardStats: Counts and documents received.");

    const activePatients = patientCountSnapshot.data().count;
    const availableNurses = nursesSnapshot.docs.filter(doc => doc.data().status === 'Available').length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let upcomingAppointments = 0;
    let upcomingAppointmentsTodayCount = 0;
    const statusCounts: { [key: string]: number } = { scheduled: 0, completed: 0, cancelled: 0 };
    const nursePerformance: { [nurseName: string]: number } = {};

    videoConsultsSnapshot.docs.forEach(docSnap => {
      const consultData = docSnap.data();
      const consultTime = consultData.consultationTime as Timestamp;

      if (consultData.status === 'scheduled' && consultTime && consultTime.toDate() >= todayStart) {
        upcomingAppointments++;
        if (consultTime.toDate().toDateString() === todayStart.toDateString()) {
          upcomingAppointmentsTodayCount++;
        }
      }
      const status = consultData.status as string;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      } else if (status) { 
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      const nurseName = consultData.nurseName as string;
      if (nurseName) {
        nursePerformance[nurseName] = (nursePerformance[nurseName] || 0) + 1;
      }
    });
    console.log("[ACTION_LOG] fetchDashboardStats: Consults processed for upcoming, status, and performance.");
    
    const activePatientsChange = activePatients > 0 ? `+${Math.floor(Math.random()*5 + 1)} since last week` : "N/A";
    const availableNursesOnline = availableNurses > 0 ? `Online: ${Math.max(1,Math.floor(Math.random()*availableNurses))}` : "Online: 0";
    const careQualityScore = `${Math.floor(Math.random() * 10 + 88)}%`; 
    const careQualityScoreTrend = `Up by ${Math.floor(Math.random()*3+1)}% from last month`;

    
    console.log("[ACTION_LOG] fetchDashboardStats: Processing patient registrations data.");
    const patientsSnapshotForChart = await getDocs(query(patientsCollectionRef, orderBy("createdAt", "asc")));
    const monthlyRegistrations: { [key: string]: number } = {}; 
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    patientsSnapshotForChart.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.createdAt instanceof Timestamp) {
        const date = data.createdAt.toDate();
        
        const displayMonth = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
        monthlyRegistrations[displayMonth] = (monthlyRegistrations[displayMonth] || 0) + 1;
      }
    });

    const patientRegistrationsData: PatientRegistrationDataPoint[] = [];
    const currentJsDate = new Date();
    for (let i = 5; i >= 0; i--) { 
        const d = new Date(currentJsDate.getFullYear(), currentJsDate.getMonth() - i, 1);
        const displayMonthKey = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
        patientRegistrationsData.push({
            month: monthNames[d.getMonth()], 
            newPatients: monthlyRegistrations[displayMonthKey] || 0,
        });
    }
    console.log("[ACTION_LOG] fetchDashboardStats: Patient registrations processed.");


    const appointmentStatusData: AppointmentStatusDataPoint[] = [
      { status: "Completed", count: statusCounts.completed || 0, fill: "hsl(var(--chart-1))" },
      { status: "Scheduled", count: statusCounts.scheduled || 0, fill: "hsl(var(--chart-2))" },
      { status: "Cancelled", count: statusCounts.cancelled || 0, fill: "hsl(var(--destructive))" },
    ].filter(item => item.count > 0); 

    const nurseColors = ["hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-1))", "hsl(var(--chart-2))"];
    const nursePerformanceData: NursePerformanceDataPoint[] = Object.entries(nursePerformance)
      .map(([name, count], index) => ({
        nurseName: name,
        consults: count,
        fill: nurseColors[index % nurseColors.length]
      }))
      .sort((a, b) => b.consults - a.consults) 
      .slice(0, 5); 
    console.log("[ACTION_LOG] fetchDashboardStats: Nurse performance processed.");


    const stats: DashboardStats = {
      activePatients,
      activePatientsChange,
      upcomingAppointments,
      upcomingAppointmentsToday: `${upcomingAppointmentsTodayCount} today`,
      availableNurses,
      availableNursesOnline,
      careQualityScore,
      careQualityScoreTrend,
      patientRegistrationsData,
      appointmentStatusData,
      nursePerformanceData,
    };
    console.log("[ACTION_LOG] fetchDashboardStats: Stats assembly complete. Returning data.");
    return { data: stats };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchDashboardStats: Error fetching dashboard stats from Firestore:", error.code, error.message, error);
    
    return {
      error: `Could not load dashboard statistics: ${error.message} (Code: ${error.code || 'N/A'})`,
      data: { 
        activePatients: 0, activePatientsChange: "N/A",
        upcomingAppointments: 0, upcomingAppointmentsToday: "N/A",
        availableNurses: 0, availableNursesOnline: "N/A",
        careQualityScore: "N/A", careQualityScoreTrend: "N/A",
        patientRegistrationsData: Array(6).fill(null).map((_, i) => ({ month: new Date(0, i).toLocaleString('default', { month: 'short' }), newPatients: 0 })),
        appointmentStatusData: [],
        nursePerformanceData: [],
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
  consultationTime: string; // ISO Date String
  dailyRoomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string; // ISO Date String
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
  console.log("[ACTION_LOG] scheduleVideoConsult: Initiated with values:", values.patientId, values.nurseId);
  try {
    const validatedValues = ScheduleVideoConsultInputSchema.parse(values);

    const patientDocRef = doc(firestoreInstance, "patients", validatedValues.patientId);
    const nurseDocRef = doc(firestoreInstance, "nurses", validatedValues.nurseId);

    console.log("[ACTION_LOG] scheduleVideoConsult: Fetching patient and nurse documents.");
    const [patientDocSnap, nurseDocSnap] = await Promise.all([
      getDoc(patientDocRef),
      getDoc(nurseDocRef)
    ]);

    if (!patientDocSnap.exists()) {
      console.error("[ACTION_ERROR] scheduleVideoConsult: Selected patient not found:", validatedValues.patientId);
      return { success: false, message: "Selected patient not found." };
    }
    if (!nurseDocSnap.exists()) {
      console.error("[ACTION_ERROR] scheduleVideoConsult: Selected nurse not found:", validatedValues.nurseId);
      return { success: false, message: "Selected nurse not found." };
    }
    console.log("[ACTION_LOG] scheduleVideoConsult: Patient and nurse documents fetched.");

    const patient = patientDocSnap.data() as Omit<PatientListItem, 'id'>;
    const nurse = nurseDocSnap.data() as Omit<NurseListItem, 'id'>;

    const dailyCoBaseUrl = process.env.NEXT_PUBLIC_DAILY_CO_BASE_URL;
    if (!dailyCoBaseUrl || dailyCoBaseUrl.includes("YOUR_DAILY_CO_DOMAIN.daily.co") || dailyCoBaseUrl === "https://example.daily.co/") {
        console.warn("[ACTION_WARN] scheduleVideoConsult: NEXT_PUBLIC_DAILY_CO_BASE_URL is not set or uses placeholder. Using default fallback: https://sanhome.daily.co/");
    }
    const roomName = `sanhome-consult-${generateRandomString(8)}`;
    const effectiveDailyCoBaseUrl = dailyCoBaseUrl && !dailyCoBaseUrl.includes("YOUR_DAILY_CO_DOMAIN.daily.co") && dailyCoBaseUrl !== "https://example.daily.co/"
                                     ? dailyCoBaseUrl
                                     : "https://sanhome.daily.co/"; 
    const dailyRoomUrl = `${effectiveDailyCoBaseUrl.endsWith('/') ? effectiveDailyCoBaseUrl : effectiveDailyCoBaseUrl + '/'}${roomName}`;
    console.log("[ACTION_LOG] scheduleVideoConsult: Generated Daily room URL:", dailyRoomUrl);

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

    console.log("[ACTION_LOG] scheduleVideoConsult: Attempting to add document to Firestore 'videoConsults' collection.");
    const docRef = await addDoc(collection(firestoreInstance, "videoConsults"), newVideoConsultData);
    console.log("[ACTION_LOG] scheduleVideoConsult: Video consult added to Firestore with ID:", docRef.id);


    // Simulate notifications
    console.log(`[ACTION_LOG] scheduleVideoConsult: Simulated email to patient ${patient.email} about consult with link ${dailyRoomUrl}`);
    console.log(`[ACTION_LOG] scheduleVideoConsult: Simulated email to nurse ${nurse.email} about consult with link ${dailyRoomUrl}`);


    return {
      success: true,
      message: `Video consult scheduled successfully for ${patient.name} with ${nurse.name}.`,
      consultId: docRef.id,
      roomUrl: dailyRoomUrl
    };

  } catch (error: any) {
    console.error("[ACTION_ERROR] scheduleVideoConsult: Error scheduling video consult: ", error.code, error.message, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to schedule video consult: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

export async function fetchVideoConsults(): Promise<{ data?: VideoConsultListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchVideoConsults: Initiated.");
  try {
    const consultsCollectionRef = collection(firestoreInstance, "videoConsults");
    const q = query(consultsCollectionRef, orderBy("consultationTime", "desc"));
    console.log("[ACTION_LOG] fetchVideoConsults: Created query. Attempting getDocs...");
    const consultsSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchVideoConsults: Firestore getDocs successful. Found ${consultsSnapshot.docs.length} documents.`);

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
        status: data.status as VideoConsultListItem['status'],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as VideoConsultListItem;
    });
    console.log("[ACTION_LOG] fetchVideoConsults: Firestore data mapping complete. Returning data.");
    return { data: consultsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchVideoConsults: Error fetching video consults from Firestore:", error.code, error.message, error);
    return { error: `Failed to fetch video consults: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

// --- Database Seeding ---

const firstNames = [
  "Foulen", "Amina", "Mohamed", "Fatma", "Ali", "Sarah", "Youssef", "Hiba", "Ahmed", "Nour",
  "Khaled", "Lina", "Omar", "Zahra", "Hassan", "Mariem", "Ibrahim", "Sana", "Tarek", "Leila"
];
const lastNames = [
  "Ben Foulen", "Trabelsi", "Jlassi", "Gharbi", "Mabrouk", "Saidi", "Baccouche", "Hammami",
  "Chakroun", "Ben Ammar", "Dridi", "Sassi", "Kooli", "Mansouri", "Ayari", "Feki", "Belhadj",
  "Khemiri", "Zouari", "Gargouri"
];
const tunisianRoles = ["sage-femme", "patient", "infirmiere", "medecin", "aide-soignant", "kinesitherapeute", "admin"];
const addresses = [
  "Avenue Habib Bourguiba, Tunis", "Rue de la Liberté, Sfax", "Boulevard 7 Novembre, Sousse",
  "Rue Farhat Hached, Ariana", "Avenue Taieb Mhiri, Nabeul", "Rue de Carthage, Bizerte",
  "Avenue de la République, Monastir", "Rue Jamel Abdennasser, Kairouan",
  "Avenue Mohamed V, Gabès", "Rue Ibn Khaldoun, Gafsa", "Avenue Ali Belhouane, Mahdia",
  "Rue 18 Janvier, Djerba", "Avenue Hédi Chaker, Kasserine",
  "Rue de l'Indépendance, Sidi Bouzid", "Avenue de l'Environnement, Tozeur"
];
const genders = ["homme", "femme"];

const mockTunisianPatients = [
  {
    name: "Ahmed Ben Salah", age: 68,
    phone: generatePhoneNumber(), email: "ahmed.bensalah@example.com", address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Ambulatoire avec canne", pathologies: ["Diabète", "Hypertension"], allergies: ["Pénicilline"],
    lastVisitDate: "2024-07-15", condition: "Diabète de type 2", status: "Stable", hint: "elderly man tunisian"
  },
  {
    name: "Fatima Bouaziz", age: 75,
    phone: generatePhoneNumber(), email: "fatima.bouaziz@example.com", address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Fauteuil roulant", pathologies: ["Arthrose", "Problèmes cardiaques"], allergies: ["Aspirine"],
    lastVisitDate: "2024-07-20", condition: "Arthrose sévère", status: "Needs Follow-up", hint: "elderly woman tunisian"
  },
   {
    name: "Youssef Jlassi", age: 55,
    phone: generatePhoneNumber(), email: "youssef.jlassi@example.com", address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Mobile", pathologies: ["Asthme"], allergies: [],
    lastVisitDate: "2024-06-10", condition: "Asthme chronique", status: "Stable", hint: "man tunisian"
  },
  {
    name: "Mariem Saidi", age: 62,
    phone: generatePhoneNumber(), email: "mariem.saidi@example.com", address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Limitée, utilise un déambulateur", pathologies: ["Ostéoporose", "Hypertension"], allergies: ["Sulfamides"],
    lastVisitDate: "2024-07-01", condition: "Ostéoporose", status: "Needs Follow-up", hint: "woman tunisian"
  },
  {
    name: "Ali Trabelsi", age: 71,
    phone: generatePhoneNumber(), email: "ali.trabelsi@example.com", address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Mobile avec aide occasionnelle", pathologies: ["Insuffisance rénale légère"], allergies: [],
    lastVisitDate: "2024-05-25", condition: "Insuffisance rénale", status: "Stable", hint: "senior man tunisian"
  },
];

const mockTunisianNurses = [
  {
    name: "Leila Haddad", specialty: "Gériatrie", location: "Clinique El Amen, Tunis",
    phone: generatePhoneNumber(), email: "leila.haddad@sanhome.com", status: "Available", hint: "nurse woman tunisian"
  },
  {
    name: "Karim Zayani", specialty: "Soins Généraux", location: "Hôpital Sahloul, Sousse",
    phone: generatePhoneNumber(), email: "karim.zayani@sanhome.com", status: "On Duty", hint: "nurse man tunisian"
  },
  {
    name: "Sana Mabrouk", specialty: "Pédiatrie", location: "Cabinet Dr. Feki, Sfax",
    phone: generatePhoneNumber(), email: "sana.mabrouk@sanhome.com", status: "Available", hint: "female nurse tunisian"
  },
  {
    name: "Mohamed Gharbi", specialty: "Cardiologie", location: "Clinique Hannibal, Tunis",
    phone: generatePhoneNumber(), email: "mohamed.gharbi@sanhome.com", status: "Unavailable", hint: "male nurse tunisian"
  },
];

export async function seedDatabase(): Promise<{ success: boolean; message: string; details?: Record<string, string> }> {
  console.log("[ACTION_LOG] seedDatabase: Action invoked.");
  console.log(`[ACTION_LOG] seedDatabase: Firebase db object initialized? ${!!firestoreInstance}`);
  console.log(`[ACTION_LOG] seedDatabase: Firebase auth object initialized? ${!!firebaseAuthInstance}`);

  const results: Record<string, string> = { users: "", patients: "", nurses: "", videoConsults: "" };
  let allSuccess = true;
  const patientRefs: { id: string; name: string, email: string }[] = [];
  const nurseRefs: { id: string; name: string, email: string }[] = [];
  const userRefs: { uid: string, name: string, email: string }[] = [];

  if (!firestoreInstance || !firebaseAuthInstance) {
    const errMessage = "Firebase services (Firestore or Auth) not initialized correctly within server action. Check lib/firebase.ts and ensure .env configuration is loaded/available in this server context.";
    console.error(`[ACTION_ERROR] seedDatabase: ${errMessage}`);
    return { success: false, message: errMessage, details: {} };
  }
  console.log("[ACTION_LOG] seedDatabase: Starting main try-catch block for seeding.");
  try {
    // --- Seed Users ---
    console.log("[ACTION_LOG] seedDatabase: Checking 'users' collection in Firestore...");
    const usersCollectionRef = collection(firestoreInstance, "users");
    const usersCountSnapshot = await getCountFromServer(usersCollectionRef);
    const usersCount = usersCountSnapshot.data().count;
    console.log(`[ACTION_LOG] seedDatabase: Found ${usersCount} existing user documents in Firestore.`);
    results.users = `Checked 'users' collection, found ${usersCount} documents. `;


    if (usersCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'users' collection is empty. Attempting to seed users...");
      const sampleAuthUsers = Array.from({ length: 10 }, (_, index) => ({ 
        email: `user${index + 1}@sanhome.com`, 
        password: "Password123!",
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        role: tunisianRoles[Math.floor(Math.random() * tunisianRoles.length)], 
        phoneNumber: generatePhoneNumber(),
        address: addresses[Math.floor(Math.random() * addresses.length)],
        dateOfBirth: generateDateOfBirth(),
        gender: genders[Math.floor(Math.random() * genders.length)],
      }));

      let seededUsersCount = 0;
      for (const userData of sampleAuthUsers) {
        try {
          console.log(`[ACTION_LOG] seedDatabase: Attempting to create auth user: ${userData.email}`);
          if (!firebaseAuthInstance) {
            console.error("[ACTION_ERROR] seedDatabase: firebaseAuthInstance is null/undefined before createUserWithEmailAndPassword!");
            throw new Error("Firebase Auth instance not available for user creation.");
          }
          const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, userData.email, userData.password);
          const user = userCredential.user;
          console.log(`[ACTION_LOG] seedDatabase: Auth user ${userData.email} created with UID ${user.uid}.`);

          const userProfile = {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            phoneNumber: userData.phoneNumber,
            address: userData.address,
            dateOfBirth: Timestamp.fromDate(new Date(userData.dateOfBirth)),
            gender: userData.gender,
            createdAt: serverTimestamp(),
          };
          console.log(`[ACTION_LOG] seedDatabase: Attempting to set Firestore profile for UID ${user.uid}.`);
          await setDoc(doc(firestoreInstance, "users", user.uid), userProfile);
          userRefs.push({ uid: user.uid, name: `${userData.firstName} ${userData.lastName}`, email: userData.email });
          seededUsersCount++;
          console.log(`[ACTION_LOG] Seeded user profile in Firestore for ${userData.email}`);
          await sendEmailVerification(user);
          console.log(`[ACTION_LOG] Sent verification email to ${userData.email}`);
        } catch (e: any) {
          console.error(`[ACTION_ERROR] seedDatabase (user ${userData.email}): Code: ${e.code}, Message: ${e.message}`, e);
          results.users += `Error for ${userData.email}: ${e.message} (Code: ${e.code}). `;
          allSuccess = false;
        }
      }
      results.users += `Seeded ${seededUsersCount} users.`;
    } else {
      results.users += "Skipping seeding users.";
      console.log("[ACTION_LOG] seedDatabase: 'users' collection not empty, skipping user seeding.");
      const existingUsersSnapshot = await getDocs(collection(firestoreInstance, "users"));
        existingUsersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.firstName && data.lastName && data.email) { 
                 userRefs.push({ uid: docSnap.id, name: `${data.firstName} ${data.lastName}`, email: data.email });
            } else {
                console.warn(`[ACTION_WARN] seedDatabase: User document ${docSnap.id} missing name/email, skipping for refs.`);
            }
        });
       console.log(`[ACTION_LOG] seedDatabase: Loaded ${userRefs.length} existing user references.`);
    }


    // --- Seed Patients ---
    console.log("[ACTION_LOG] seedDatabase: Checking 'patients' collection...");
    const patientsCollectionRef = collection(firestoreInstance, "patients");
    console.log(`[ACTION_LOG] seedDatabase: Attempting getCountFromServer for 'patients' collection. Firestore instance valid: ${!!firestoreInstance}`);
    const patientsCountSnapshot = await getCountFromServer(patientsCollectionRef);
    const patientsCount = patientsCountSnapshot.data().count;
    console.log(`[ACTION_LOG] seedDatabase: Found ${patientsCount} existing patient documents. Current count: ${patientsCount}.`);
    results.patients = `Checked 'patients' collection, found ${patientsCount} documents. `;
    

    if (patientsCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'patients' collection is empty. Attempting to seed patients...");
      let seededPatientsCount = 0;
      for (const patientData of mockTunisianPatients) {
        try {
          const { lastVisitDate, ...restData } = patientData;
          
          const randomNurseName = nurseRefs.length > 0 
                                  ? nurseRefs[Math.floor(Math.random() * nurseRefs.length)].name 
                                  : (mockTunisianNurses[0]?.name || "Infirmière Non Assignée");
          
          const newPatient = {
            ...restData,
            primaryNurse: randomNurseName, 
            avatarUrl: `https://placehold.co/100x100.png?text=${patientData.name.split(" ").map(n=>n[0]).join("")}`, 
            joinDate: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000))), 
            lastVisit: Timestamp.fromDate(new Date(lastVisitDate)),
            pathologies: patientData.pathologies, 
            allergies: patientData.allergies,     
            createdAt: serverTimestamp(),
          };
          console.log(`[ACTION_LOG] seedDatabase: Attempting to add patient: ${newPatient.name}`);
          const docRef = await addDoc(collection(firestoreInstance, "patients"), newPatient);
          patientRefs.push({ id: docRef.id, name: newPatient.name, email: newPatient.email });
          seededPatientsCount++;
          console.log(`[ACTION_LOG] Seeded patient: ${newPatient.name} with ID ${docRef.id}`);
        } catch (e: any) {
          console.error(`[ACTION_ERROR] seedDatabase (patient ${patientData.name}): Code: ${e.code}, Message: ${e.message}`, e);
          results.patients += `Error for ${patientData.name}: ${e.message} (Code: ${e.code}). `;
          allSuccess = false;
        }
      }
      results.patients += `Seeded ${seededPatientsCount} patients.`;
    } else {
      console.log(`[ACTION_LOG] seedDatabase: 'patients' collection not empty (found ${patientsCount} docs), skipping patient seeding.`);
       const existingPatientsSnapshot = await getDocs(collection(firestoreInstance, "patients"));
        existingPatientsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.name && data.email) { 
                patientRefs.push({ id: docSnap.id, name: data.name, email: data.email });
            }
        });
      console.log(`[ACTION_LOG] seedDatabase: Loaded ${patientRefs.length} existing patient references.`);
    }


    // --- Seed Nurses ---
    console.log("[ACTION_LOG] seedDatabase: Checking 'nurses' collection...");
    const nursesCollectionRef = collection(firestoreInstance, "nurses");
    const nursesCountSnapshot = await getCountFromServer(nursesCollectionRef);
    const nursesCount = nursesCountSnapshot.data().count;
    console.log(`[ACTION_LOG] seedDatabase: Found ${nursesCount} existing nurse documents in Firestore.`);
    results.nurses = `Checked 'nurses' collection, found ${nursesCount} documents. `;


    if (nursesCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'nurses' collection is empty. Attempting to seed nurses...");
      let seededNursesCount = 0;
      for (const nurseData of mockTunisianNurses) {
        try {
          const newNurse = {
            ...nurseData,
            avatar: `https://placehold.co/100x100.png?text=${nurseData.name.split(" ").map(n=>n[0]).join("")}`, 
            createdAt: serverTimestamp(),
          };
          console.log(`[ACTION_LOG] seedDatabase: Attempting to add nurse: ${newNurse.name}`);
          const docRef = await addDoc(collection(firestoreInstance, "nurses"), newNurse);
          nurseRefs.push({ id: docRef.id, name: newNurse.name, email: newNurse.email });
          seededNursesCount++;
          console.log(`[ACTION_LOG] Seeded nurse: ${newNurse.name} with ID ${docRef.id}`);
        } catch (e: any) {
          console.error(`[ACTION_ERROR] seedDatabase (nurse ${nurseData.name}): Code: ${e.code}, Message: ${e.message}`, e);
          results.nurses += `Error for ${nurseData.name}: ${e.message} (Code: ${e.code}). `;
          allSuccess = false;
        }
      }
      results.nurses += `Seeded ${seededNursesCount} nurses.`;
    } else {
      console.log(`[ACTION_LOG] seedDatabase: 'nurses' collection not empty (found ${nursesCount} docs), skipping nurse seeding.`);
       const existingNursesSnapshot = await getDocs(collection(firestoreInstance, "nurses"));
        existingNursesSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.name && data.email) { 
                nurseRefs.push({ id: docSnap.id, name: data.name, email: data.email });
            }
        });
        console.log(`[ACTION_LOG] seedDatabase: Loaded ${nurseRefs.length} existing nurse references.`);
    }
    
    if (patientsCount === 0 && patientRefs.length > 0 && nurseRefs.length > 0) {
        console.log("[ACTION_LOG] seedDatabase: Re-assigning primary nurses to newly seeded patients using available nurses.");
        const batch = writeBatch(firestoreInstance);
        let updateCount = 0;
        try {
            for (const patientRef of patientRefs) {
                
                const patientDocSnap = await getDoc(doc(firestoreInstance, "patients", patientRef.id));
                if (patientDocSnap.exists()) {
                    const patientData = patientDocSnap.data();
                    if (patientData.primaryNurse === "Infirmière Non Assignée" || !nurseRefs.find(n => n.name === patientData.primaryNurse)) {
                        const randomNurse = nurseRefs[Math.floor(Math.random() * nurseRefs.length)];
                        const patientDocRefToUpdate = doc(firestoreInstance, "patients", patientRef.id);
                        batch.update(patientDocRefToUpdate, { primaryNurse: randomNurse.name });
                        updateCount++;
                    }
                }
            }
            if (updateCount > 0) {
                console.log(`[ACTION_LOG] seedDatabase: Committing ${updateCount} primary nurse reassignments...`);
                await batch.commit();
                console.log("[ACTION_LOG] seedDatabase: Finished re-assigning primary nurses batch commit.");
                results.patients += ` Reassigned primary nurse for ${updateCount} patients.`;
            } else {
                console.log("[ACTION_LOG] seedDatabase: No primary nurse reassignments needed for newly seeded patients.");
            }
        } catch (e: any) {
            console.error(`[ACTION_ERROR] seedDatabase: Error during primary nurse reassignment batch. Code: ${e.code}, Message: ${e.message}`, e);
            results.patients += `Error reassigning nurses: ${e.message}. `
            allSuccess = false;
        }
    }


    // --- Seed Video Consults ---
    console.log("[ACTION_LOG] seedDatabase: Checking 'videoConsults' collection...");
    const videoConsultsCollectionRef = collection(firestoreInstance, "videoConsults");
    const videoConsultsCountSnapshot = await getCountFromServer(videoConsultsCollectionRef);
    const videoConsultsCount = videoConsultsCountSnapshot.data().count;
    console.log(`[ACTION_LOG] seedDatabase: Found ${videoConsultsCount} existing video consult documents in Firestore.`);
    results.videoConsults = `Checked 'videoConsults' collection, found ${videoConsultsCount} documents. `;
    

    if (videoConsultsCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'videoConsults' collection is empty. Attempting to seed video consults...");
      if (patientRefs.length > 0 && nurseRefs.length > 0) {
        let seededConsultsCount = 0;
        const numConsultsToSeed = Math.min(5, patientRefs.length, nurseRefs.length); 
        for (let i = 0; i < numConsultsToSeed; i++) {
          try {
            const randomPatient = patientRefs[i % patientRefs.length]; 
            const randomNurse = nurseRefs[i % nurseRefs.length];   

            const consultDate = new Date();
            
            consultDate.setDate(consultDate.getDate() + Math.floor(Math.random() * 30) - 15); 
            consultDate.setHours(Math.floor(Math.random() * 10) + 8, Math.random() > 0.5 ? 30 : 0, 0, 0); 

            const statuses: VideoConsultListItem['status'][] = ['scheduled', 'completed', 'cancelled'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            const roomName = `sanhome-consult-${generateRandomString(8)}`;
            const dailyCoBaseUrl = process.env.NEXT_PUBLIC_DAILY_CO_BASE_URL || "https://sanhome.daily.co/";
            const dailyRoomUrl = `${dailyCoBaseUrl.endsWith('/') ? dailyCoBaseUrl : dailyCoBaseUrl + '/'}${roomName}`;

            const newConsult = {
              patientId: randomPatient.id,
              patientName: randomPatient.name,
              nurseId: randomNurse.id,
              nurseName: randomNurse.name,
              consultationTime: Timestamp.fromDate(consultDate),
              dailyRoomUrl: dailyRoomUrl,
              status: randomStatus,
              createdAt: serverTimestamp(),
            };
            console.log(`[ACTION_LOG] seedDatabase: Attempting to add video consult for patient ${randomPatient.name}`);
            await addDoc(collection(firestoreInstance, "videoConsults"), newConsult);
            seededConsultsCount++;
             console.log(`[ACTION_LOG] Seeded video consult for patient ${randomPatient.name} with nurse ${randomNurse.name}`);
          } catch (e: any) {
            console.error(`[ACTION_ERROR] seedDatabase (video consult ${i + 1}): Code: ${e.code}, Message: ${e.message}`, e);
            results.videoConsults += `Error for consult ${i+1}: ${e.message} (Code: ${e.code}). `;
            allSuccess = false;
          }
        }
        results.videoConsults += `Seeded ${seededConsultsCount} video consultations.`;
      } else {
        results.videoConsults += "Skipped seeding video consultations as patients or nurses were not available/seeded during this run.";
        console.log("[ACTION_LOG] seedDatabase: Skipping video consults, no patients or nurses refs available from this run.");
      }
    } else {
      console.log(`[ACTION_LOG] seedDatabase: 'videoConsults' collection not empty (found ${videoConsultsCount} docs), skipping.`);
    }

    console.log("[ACTION_LOG] seedDatabase: Seeding process completed with allSuccess =", allSuccess);
    if (allSuccess && (results.users.includes("Seeded") || results.patients.includes("Seeded") || results.nurses.includes("Seeded") || results.videoConsults.includes("Seeded") )) {
      return { success: true, message: "Database seeding process finished successfully.", details: results };
    } else if (!allSuccess) {
      return { success: false, message: "Database seeding completed with some errors. Check server logs for details.", details: results };
    } else {
        return { success: true, message: "All collections appear to be populated or no new data was seeded. Check server logs for details.", details: results };
    }

  } catch (error: any) {
    const firebaseErrorCode = error.code || 'N/A';
    const firebaseErrorMessage = error.message || 'Unknown error';
    let specificMessage = `Database seeding failed critically: ${firebaseErrorMessage} (Code: ${firebaseErrorCode}).`;

    console.error(`[ACTION_ERROR] seedDatabase: CRITICAL error during seeding process. Code: ${firebaseErrorCode}, Message: ${firebaseErrorMessage}`, error);
    
    console.error("[ACTION_ERROR] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (firebaseErrorCode === 'auth/email-already-in-use') {
        specificMessage = "Database seeding failed: One or more user emails already exist in Firebase Authentication. Clear existing test users or use different emails.";
    } else if (firebaseErrorCode === 'permission-denied' || firebaseErrorMessage.includes('PERMISSION_DENIED') || firebaseErrorMessage.includes("Missing or insufficient permissions")) {
        specificMessage = "Database seeding failed: Missing or insufficient permissions. Ensure Firestore/Auth rules allow writes FOR AUTHENTICATED USERS (if rules are 'request.auth != null') and that you are logged in when triggering this. If rules are temporarily open (allow write: if true;), ensure they are published and propagated. Firebase Code: " + firebaseErrorCode;
    } else if (firebaseErrorMessage.includes("auth is not a function") || firebaseErrorMessage.includes("auth is not defined") || firebaseErrorMessage.includes("auth is null") || firebaseErrorMessage.includes("Firebase: Error (auth/internal-error).") ) {
        specificMessage = "Database seeding failed: Firebase Authentication service might not be initialized correctly or available. Check Firebase setup in `lib/firebase.ts`. Firebase Message: " + firebaseErrorMessage;
    } else if (!firestoreInstance || !firebaseAuthInstance) {
         specificMessage = "Database seeding failed: Firebase services (Firestore or Auth) appear to be uninitialized within the server action. Check lib/firebase.ts and .env configuration.";
    } else if (firebaseErrorMessage.includes("Cloud Firestore API has not been used") || firebaseErrorMessage.includes("FIRESTORE_API_DISABLED") ) {
        specificMessage = `Database seeding failed: The Cloud Firestore API is not enabled for your project. Please visit https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id'} to enable it.`;
    } else if (firebaseErrorMessage.includes("Could not reach Cloud Firestore backend") ) {
        specificMessage = `Database seeding failed: Could not reach Cloud Firestore backend. This often indicates a network issue or that the Firestore API, while enabled, isn't reachable. Details: ${firebaseErrorMessage}`;
    } else if (firebaseErrorMessage.includes("Failed to fetch")) { 
        specificMessage = `Database seeding failed: A network error occurred ('Failed to fetch'). This could be a CORS issue if the request is cross-origin and not configured, a local network problem, or an issue with the Firebase backend. Details: ${firebaseErrorMessage}`;
    }


    return { success: false, message: specificMessage, details: results };
  }
}


// --- Server actions to fetch data (Patients, Nurses) ---
// These are currently not used by the respective list pages as they fetch client-side.
// Kept for potential future server-side rendering or other server actions.
export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchPatients: Initiated from Firestore.");
  try {
    const patientsCollectionRef = collection(firestoreInstance, "patients");
    const q = query(patientsCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchPatients: Created collection reference. Attempting getDocs...");

    const patientsSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchPatients: Firestore getDocs successful. Found ${patientsSnapshot.docs.length} documents.`);

    const patientsList = patientsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      
      const joinDate = data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : (typeof data.joinDate === 'string' ? data.joinDate : new Date().toISOString().split('T')[0]);
      const lastVisit = data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : (typeof data.lastVisit === 'string' ? data.lastVisit : new Date().toISOString().split('T')[0]);
      const pathologies = Array.isArray(data.pathologies) ? data.pathologies : (typeof data.pathologies === 'string' ? data.pathologies.split(',').map(p => p.trim()).filter(Boolean) : []);
      const allergies = Array.isArray(data.allergies) ? data.allergies : (typeof data.allergies === 'string' ? data.allergies.split(',').map(a => a.trim()).filter(Boolean) : []);


      return {
        id: docSnap.id,
        name: data.name || "N/A",
        age: data.age || 0,
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=P`,
        joinDate: joinDate,
        primaryNurse: data.primaryNurse || "N/A",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        address: data.address || "N/A",
        mobilityStatus: data.mobilityStatus || "N/A",
        pathologies: pathologies,
        allergies: allergies,
        lastVisit: lastVisit,
        condition: data.condition || "N/A",
        status: data.status || "N/A",
        hint: data.hint || 'person face',
        createdAt: data.createdAt, 
      } as PatientListItem;
    });
    console.log("[ACTION_LOG] fetchPatients: Firestore data mapping complete. Returning data.");
    return { data: patientsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchPatients: Error fetching patients from Firestore:", error.code, error.message, error);
    return { error: `Failed to fetch patients: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

export async function fetchNurses(): Promise<{ data?: NurseListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchNurses: Initiated from Firestore.");
  try {
    const nursesCollectionRef = collection(firestoreInstance, "nurses");
    const q = query(nursesCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchNurses: Created query. Attempting getDocs...");
    const nursesSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchNurses: Firestore getDocs successful. Found ${nursesSnapshot.docs.length} documents.`);

    const nursesList = nursesSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "N/A",
        specialty: data.specialty || "N/A",
        location: data.location || "N/A",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        avatar: data.avatar || `https://placehold.co/100x100.png?text=N`,
        status: data.status || "Available",
        hint: data.hint || 'nurse medical',
        createdAt: data.createdAt,
      } as NurseListItem;
    });
    console.log("[ACTION_LOG] fetchNurses: Firestore data mapping complete. Returning data.");
    return { data: nursesList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchNurses: Error fetching nurses from Firestore:", error.code, error.message, error);
    return { error: `Failed to fetch nurses: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

// New server action to fetch data from a specified collection for the Data Viewer
export async function fetchCollectionData(
  collectionName: string
): Promise<{ data?: any[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchCollectionData: Initiated for collection: ${collectionName}`);
  try {
    if (!["users", "patients", "nurses", "videoConsults"].includes(collectionName)) {
      console.error(`[ACTION_ERROR] fetchCollectionData: Invalid collection name: ${collectionName}`);
      return { error: "Invalid collection name provided." };
    }

    const collRef = collection(firestoreInstance, collectionName);

    let q;
    
    try {
       q = query(collRef, orderBy("createdAt", "desc"), limit(25));
       console.log(`[ACTION_LOG] fetchCollectionData: Querying ${collectionName} with orderBy createdAt.`);
    } catch (orderByError: any) {
      
      console.warn(`[ACTION_WARN] fetchCollectionData: orderBy('createdAt') failed for ${collectionName}, falling back to simple limit. Error: ${orderByError.message}`);
      q = query(collRef, limit(25));
    }


    console.log(`[ACTION_LOG] fetchCollectionData: Attempting to get documents from ${collectionName}.`);
    const snapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchCollectionData: Found ${snapshot.docs.length} documents in ${collectionName}.`);

    const documents = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      
      const processedData: { [key: string]: any } = { id: docSnap.id };
      for (const key in data) {
        if (data[key] instanceof Timestamp) {
          processedData[key] = data[key].toDate().toISOString();
        } else {
          processedData[key] = data[key];
        }
      }
      return processedData;
    });

    return { data: documents };
  } catch (error: any) {
    console.error(`[ACTION_ERROR] fetchCollectionData: Error fetching data from ${collectionName}:`, error.code, error.message, error);
    
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        return { error: `Query requires an index. Please create the required composite index in Firestore for collection '${collectionName}' ordered by 'createdAt desc'. Firestore error: ${error.message}` };
    }
    return { error: `Failed to fetch data from ${collectionName}: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

// --- Appointment Management ---
export type AppointmentListItem = {
  id: string;
  patientId: string;
  patientName: string;
  nurseId: string;
  nurseName: string;
  appointmentDate: string; // ISO string
  appointmentTime: string; // "HH:MM"
  appointmentType: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: string; // ISO string
};

// Server action to fetch appointments
export async function fetchAppointments(): Promise<{ data?: AppointmentListItem[]; error?: string }> {
  console.log("[ACTION_LOG] fetchAppointments: Initiated.");
  try {
    // For now, this will return an empty array as we don't have an 'appointments' collection
    // and videoConsults are handled separately.
    // In a real scenario, you'd query your 'appointments' collection here:
    // const appointmentsCollectionRef = collection(firestoreInstance, "appointments");
    // const q = query(appointmentsCollectionRef, orderBy("appointmentDate", "desc"));
    // const snapshot = await getDocs(q);
    // const appointmentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppointmentListItem));
    // For Timestamps: data.appointmentDate.toDate().toISOString()
    
    console.log("[ACTION_LOG] fetchAppointments: Returning empty array (mocked/placeholder).");
    return { data: [] }; // Replace with actual data fetching when ready
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchAppointments:", error.code, error.message, error);
    return { error: `Failed to fetch appointments: ${error.message}` };
  }
}


const AddAppointmentInputSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required."),
  nurseId: z.string().min(1, "Nurse ID is required."),
  appointmentDate: z.date(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  appointmentType: z.string().min(3, "Appointment type is required."),
});
export type AddAppointmentFormValues = z.infer<typeof AddAppointmentInputSchema>;

export async function addAppointment(values: AddAppointmentFormValues): Promise<{ success?: boolean; message: string; appointmentId?: string }> {
  console.log("[ACTION_LOG] addAppointment: Initiated with values:", values);
  try {
    const validatedValues = AddAppointmentInputSchema.parse(values);

    // Combine date and time
    const [hours, minutes] = validatedValues.appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(validatedValues.appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Fetch patient and nurse names (optional, but good for denormalization if needed)
    let patientName = "N/A";
    let nurseName = "N/A";
    const patientDoc = await getDoc(doc(firestoreInstance, "patients", validatedValues.patientId));
    if (patientDoc.exists()) patientName = patientDoc.data().name;
    const nurseDoc = await getDoc(doc(firestoreInstance, "nurses", validatedValues.nurseId));
    if (nurseDoc.exists()) nurseName = nurseDoc.data().name;


    const newAppointmentData = {
      patientId: validatedValues.patientId,
      patientName,
      nurseId: validatedValues.nurseId,
      nurseName,
      appointmentDate: Timestamp.fromDate(appointmentDateTime), // Store as Firestore Timestamp
      appointmentTime: validatedValues.appointmentTime, // Keep HH:MM for easy display if needed
      appointmentType: validatedValues.appointmentType,
      status: 'Scheduled' as const,
      createdAt: serverTimestamp(),
    };

    // In a real scenario, you'd add this to an 'appointments' collection:
    // const docRef = await addDoc(collection(firestoreInstance, "appointments"), newAppointmentData);
    // console.log("[ACTION_LOG] addAppointment: Appointment added to Firestore with ID:", docRef.id);
    // return { success: true, message: "Appointment scheduled successfully.", appointmentId: docRef.id };

    console.log("[ACTION_LOG] addAppointment: Simulated adding appointment. Data:", newAppointmentData);
    return { success: true, message: "Appointment scheduled successfully (simulated).", appointmentId: generateRandomString(10) };

  } catch (error: any) {
    console.error("[ACTION_ERROR] addAppointment:", error.code, error.message, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to schedule appointment: ${error.message}` };
  }
}


// --- Care Log Management ---
export type CareLogItem = {
  id: string;
  patientId: string;
  patientName: string; // Denormalized for display
  careDate: string; // ISO string
  careType: string;
  notes: string;
  loggedBy: string; // User ID or name of the nurse/staff
  createdAt: string; // ISO string
};

export async function fetchCareLogs(): Promise<{ data?: CareLogItem[]; error?: string }> {
  console.log("[ACTION_LOG] fetchCareLogs: Initiated.");
  try {
    // Simulate fetching care logs. Replace with actual Firestore query.
    // const careLogsCollectionRef = collection(firestoreInstance, "careLogs");
    // const q = query(careLogsCollectionRef, orderBy("careDate", "desc"));
    // const snapshot = await getDocs(q);
    // const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareLogItem));
    // For Timestamps: data.careDate.toDate().toISOString()
    console.log("[ACTION_LOG] fetchCareLogs: Returning empty array (mocked/placeholder).");
    return { data: [] };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchCareLogs:", error);
    return { error: `Failed to fetch care logs: ${error.message}` };
  }
}

const AddCareLogInputSchema = z.object({
  patientId: z.string().min(1, "Patient is required."),
  careType: z.string().min(1, "Type of care is required."),
  careDateTime: z.date(), // From datetime-local input
  notes: z.string().min(3, "Notes are required."),
  // loggedBy will likely come from the authenticated user context
});
export type AddCareLogFormValues = z.infer<typeof AddCareLogInputSchema>;

export async function addCareLog(values: AddCareLogFormValues, loggedByName: string): Promise<{ success?: boolean; message: string; logId?: string }> {
  console.log("[ACTION_LOG] addCareLog: Initiated with values:", values);
  try {
    const validatedValues = AddCareLogInputSchema.parse(values);
    
    let patientName = "N/A";
    const patientDoc = await getDoc(doc(firestoreInstance, "patients", validatedValues.patientId));
    if (patientDoc.exists()) patientName = patientDoc.data().name;

    const newCareLogData = {
      patientId: validatedValues.patientId,
      patientName,
      careDate: Timestamp.fromDate(validatedValues.careDateTime),
      careType: validatedValues.careType,
      notes: validatedValues.notes,
      loggedBy: loggedByName, // Assuming this comes from authenticated user
      createdAt: serverTimestamp(),
    };

    // In a real scenario, add to 'careLogs' collection
    // const docRef = await addDoc(collection(firestoreInstance, "careLogs"), newCareLogData);
    // console.log("[ACTION_LOG] addCareLog: Care log added to Firestore with ID:", docRef.id);
    // return { success: true, message: "Care log added successfully.", logId: docRef.id };
    
    console.log("[ACTION_LOG] addCareLog: Simulated adding care log. Data:", newCareLogData);
    return { success: true, message: "Care log added successfully (simulated).", logId: generateRandomString(10) };

  } catch (error: any) {
    console.error("[ACTION_ERROR] addCareLog:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add care log: ${error.message}` };
  }
}


// --- Medical File Management ---
export type MedicalFileItem = {
  id: string;
  patientId: string;
  patientName: string; // Denormalized
  fileName: string;
  fileType: string; // e.g., 'Lab Result', 'Imaging Report', 'PDF', 'JPEG'
  fileUrl: string; // URL from Firebase Storage
  uploadDate: string; // ISO string
  uploaderId: string; // User ID of uploader
  uploaderName: string; // Denormalized
  size: number; // in bytes
  createdAt: string; // ISO string
};

export async function fetchMedicalFiles(): Promise<{ data?: MedicalFileItem[]; error?: string }> {
  console.log("[ACTION_LOG] fetchMedicalFiles: Initiated.");
  try {
    // Simulate fetching medical files. Replace with actual Firestore query.
    // const filesCollectionRef = collection(firestoreInstance, "medicalFiles");
    // const q = query(filesCollectionRef, orderBy("uploadDate", "desc"));
    // const snapshot = await getDocs(q);
    // const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalFileItem));
    console.log("[ACTION_LOG] fetchMedicalFiles: Returning empty array (mocked/placeholder).");
    return { data: [] };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchMedicalFiles:", error);
    return { error: `Failed to fetch medical files: ${error.message}` };
  }
}

// Simulate upload; actual upload would involve Firebase Storage on client or server
export async function uploadMedicalFile(patientId: string, fileName: string, fileType: string, fileSize: number, uploaderId: string, uploaderName: string): Promise<{ success?: boolean; message: string; fileId?: string }> {
  console.log(`[ACTION_LOG] uploadMedicalFile: Simulating upload for patient ${patientId}, file ${fileName}`);
  // In a real app:
  // 1. Upload file to Firebase Storage.
  // 2. Get download URL.
  // 3. Save metadata (including URL) to 'medicalFiles' collection in Firestore.
  
  let patientName = "N/A";
  const patientDoc = await getDoc(doc(firestoreInstance, "patients", patientId));
  if (patientDoc.exists()) patientName = patientDoc.data().name;

  const newFileData = {
      patientId,
      patientName,
      fileName,
      fileType,
      fileUrl: `https://placehold.co/storage/${generateRandomString(10)}/${fileName}`, // Placeholder URL
      uploadDate: Timestamp.now(),
      uploaderId,
      uploaderName,
      size: fileSize,
      createdAt: serverTimestamp(),
  };
  // const docRef = await addDoc(collection(firestoreInstance, "medicalFiles"), newFileData);
  // return { success: true, message: "File uploaded successfully.", fileId: docRef.id };
  
  console.log("[ACTION_LOG] uploadMedicalFile: Simulated adding file. Data:", newFileData);
  return { success: true, message: "File uploaded successfully (simulated).", fileId: generateRandomString(10) };
}


// --- Notification Management ---
export type NotificationItem = {
  id: string;
  userId: string; // User this notification is for
  type: 'Reminder' | 'Alert' | 'Update' | string;
  message: string;
  time: string; // ISO string or relative time string
  read: boolean;
  link?: string; // Optional link to navigate to
  createdAt: string; // ISO string
};

export async function fetchNotifications(userId: string): Promise<{ data?: NotificationItem[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchNotifications: Initiated for user ${userId}.`);
  try {
    // Simulate fetching notifications for a user.
    // const notificationsRef = collection(firestoreInstance, "users", userId, "notifications");
    // const q = query(notificationsRef, orderBy("createdAt", "desc"));
    // const snapshot = await getDocs(q);
    // const notifications = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as NotificationItem));
    console.log("[ACTION_LOG] fetchNotifications: Returning empty array (mocked/placeholder).");
    return { data: [] };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchNotifications:", error);
    return { error: `Failed to fetch notifications: ${error.message}` };
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[ACTION_LOG] markNotificationAsRead: User ${userId}, Notification ${notificationId}`);
    try {
        // const notificationRef = doc(firestoreInstance, "users", userId, "notifications", notificationId);
        // await updateDoc(notificationRef, { read: true });
        return { success: true };
    } catch (error: any) {
        console.error("[ACTION_ERROR] markNotificationAsRead:", error);
        return { success: false, message: error.message };
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[ACTION_LOG] markAllNotificationsAsRead: User ${userId}`);
    // This would be more complex, querying unread notifications and batch updating them.
    // For simulation:
    return { success: true };
}


// --- User Management (for Admin Dashboard, etc.) ---
export type UserForAdminList = {
    id: string; // UID
    email: string | null;
    name: string;
    role: string | null;
    status: 'Active' | 'Suspended' | string; // Could be derived or stored
    joined: string; // ISO Date
    createdAt: string; // ISO Date
};

export async function fetchUsersForAdmin(): Promise<{ data?: UserForAdminList[]; error?: string }> {
    console.log("[ACTION_LOG] fetchUsersForAdmin: Initiated.");
    try {
        const usersCollectionRef = collection(firestoreInstance, "users");
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const usersList = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                email: data.email || null,
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || "N/A",
                role: data.role || 'User',
                status: 'Active', // Placeholder, would need to be managed
                joined: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserForAdminList;
        });
        return { data: usersList };
    } catch (error: any) {
        console.error("[ACTION_ERROR] fetchUsersForAdmin:", error);
        return { error: `Failed to fetch users: ${error.message}` };
    }
}
      
    
