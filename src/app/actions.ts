
'use server';

import {
  getPersonalizedCareSuggestions,
  type PersonalizedCareSuggestionsInput,
  type PersonalizedCareSuggestionsOutput
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp,
  query, where, updateDoc, deleteDoc, writeBatch, getCountFromServer, orderBy, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format } from 'date-fns';

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
  console.log("[ACTION_LOG] fetchPatients: Initiated.");
  try {
    const patientsCollectionRef = collection(db, "patients");
    const q = query(patientsCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchPatients: Created collection reference. Attempting getDocs...");

    const patientsSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchPatients: getDocs successful. Found ${patientsSnapshot.docs.length} documents.`);

    const patientsList = patientsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "N/A",
        age: data.age || 0,
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=P`,
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate || new Date().toISOString().split('T')[0],
        primaryNurse: data.primaryNurse || "N/A",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        address: data.address || "N/A",
        mobilityStatus: data.mobilityStatus || "N/A",
        pathologies: Array.isArray(data.pathologies) ? data.pathologies : [],
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit || new Date().toISOString().split('T')[0],
        condition: data.condition || "N/A",
        status: data.status || "N/A",
        hint: data.hint || 'person face',
        createdAt: data.createdAt,
      } as PatientListItem;
    });
    console.log("[ACTION_LOG] fetchPatients: Data mapping complete. Returning data.");
    return { data: patientsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchPatients: Error fetching patients from Firestore:", error.code, error.message, error);
    return { error: `Failed to fetch patients: ${error.message}` };
  }
}

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  console.log(`[ACTION_LOG] fetchPatientById: Initiated for ID: ${id}`);
  try {
    if (!id) {
      console.error("[ACTION_ERROR] fetchPatientById: Patient ID is required.");
      return { error: "Patient ID is required." };
    }
    const patientDocRef = doc(db, "patients", id);
    console.log("[ACTION_LOG] fetchPatientById: Created document reference. Attempting getDoc...");
    const patientDoc = await getDoc(patientDocRef);

    if (patientDoc.exists()) {
      const data = patientDoc.data();
      console.log("[ACTION_LOG] fetchPatientById: Document exists. Mapping data.");
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
      const storageRef = ref(storage, `patient-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `patient ${validatedValues.fullName}`;
      console.log("[ACTION_LOG] addPatient: Avatar uploaded to:", avatarUrlToStore);
    } else {
      console.log("[ACTION_LOG] addPatient: No avatar file provided. Using placeholder.");
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

    console.log("[ACTION_LOG] addPatient: Attempting to add document to Firestore.");
    const docRef = await addDoc(collection(db, "patients"), newPatientData);
    console.log("[ACTION_LOG] addPatient: Patient added to Firestore with ID: ", docRef.id);

    console.log(`[ACTION_LOG] addPatient: Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`[ACTION_LOG] addPatient: Admin_Notification: New patient ${validatedValues.fullName} added with ID ${docRef.id}.`);

    return { success: true, message: `Patient ${validatedValues.fullName} added successfully.`, patientId: docRef.id };
  } catch (error: any) {
    console.error("[ACTION_ERROR] addPatient: Error adding patient to Firestore: ", error.code, error.message, error);
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
  console.log("[ACTION_LOG] fetchNurses: Initiated.");
  try {
    const nursesCollectionRef = collection(db, "nurses");
    const q = query(nursesCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchNurses: Created query. Attempting getDocs...");
    const nursesSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchNurses: getDocs successful. Found ${nursesSnapshot.docs.length} documents.`);

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
    console.log("[ACTION_LOG] fetchNurses: Data mapping complete. Returning data.");
    return { data: nursesList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchNurses: Error fetching nurses from Firestore:", error.code, error.message, error);
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
  console.log("[ACTION_LOG] addNurse: Initiated with values:", values.fullName);
   try {
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      console.log("[ACTION_LOG] addNurse: Avatar file provided. Uploading...");
      const storageRef = ref(storage, `nurse-avatars/${Date.now()}-${validatedValues.avatarFile.name}`);
      await uploadBytes(storageRef, validatedValues.avatarFile);
      avatarUrlToStore = await getDownloadURL(storageRef);
      hint = `nurse ${validatedValues.fullName}`;
      console.log("[ACTION_LOG] addNurse: Avatar uploaded to:", avatarUrlToStore);
    } else {
      console.log("[ACTION_LOG] addNurse: No avatar file provided. Using placeholder.");
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

    console.log("[ACTION_LOG] addNurse: Attempting to add document to Firestore.");
    const docRef = await addDoc(collection(db, "nurses"), newNurseData);
    console.log("[ACTION_LOG] addNurse: Nurse added to Firestore with ID: ", docRef.id);

    console.log(`[ACTION_LOG] addNurse: Simulating email to ${validatedValues.email} with password: ${randomPassword}`);
    console.log(`[ACTION_LOG] addNurse: Admin_Notification: New nurse ${validatedValues.fullName} added with ID ${docRef.id}.`);

    return { success: true, message: `Nurse ${validatedValues.fullName} added successfully.`, nurseId: docRef.id };
  } catch (error: any)
{
    console.error("[ACTION_ERROR] addNurse: Error adding nurse to Firestore: ", error.code, error.message, error);
     if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add nurse: ${error.message}` };
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
    const patientsCollectionRef = collection(db, "patients");
    const nursesCollectionRef = collection(db, "nurses");
    const videoConsultsCollectionRef = collection(db, "videoConsults");

    console.log("[ACTION_LOG] fetchDashboardStats: Getting counts for patients, nurses, consults.");
    const [
      patientCountSnapshot,
      nursesSnapshot,
      videoConsultsSnapshot
    ] = await Promise.all([
      getCountFromServer(patientsCollectionRef),
      getDocs(query(nursesCollectionRef)),
      getDocs(query(videoConsultsCollectionRef))
    ]);
    console.log("[ACTION_LOG] fetchDashboardStats: Counts received.");

    const activePatients = patientCountSnapshot.data().count;

    const availableNurses = nursesSnapshot.docs.filter(doc => doc.data().status === 'Available').length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = Timestamp.fromDate(todayStart);

    let upcomingAppointments = 0;
    let upcomingAppointmentsTodayCount = 0;
    const statusCounts: { [key: string]: number } = { scheduled: 0, completed: 0, cancelled: 0 };
    const nursePerformance: { [nurseName: string]: number } = {};

    videoConsultsSnapshot.docs.forEach(doc => {
      const consultData = doc.data();
      const consultTime = consultData.consultationTime as Timestamp;

      if (consultData.status === 'scheduled' && consultTime.toDate() >= todayStart) {
        upcomingAppointments++;
        if (consultTime.toDate().toDateString() === todayStart.toDateString()) {
          upcomingAppointmentsTodayCount++;
        }
      }

      const status = consultData.status as string;
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts[status] = 1; // Initialize if status not seen before
      }


      const nurseName = consultData.nurseName as string;
      if (nurseName) {
        nursePerformance[nurseName] = (nursePerformance[nurseName] || 0) + 1;
      }
    });
    console.log("[ACTION_LOG] fetchDashboardStats: Consults processed.");

    const activePatientsChange = activePatients > 0 ? `+${Math.floor(Math.random()*5 + 1)} since last week` : "N/A";
    const availableNursesOnline = availableNurses > 0 ? `Online: ${Math.floor(Math.random()*availableNurses + 1)}` : "Online: 0";
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
        // Format: "MMM 'YY" (e.g., "Jul '24") to ensure uniqueness across years
        const displayMonth = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
        monthlyRegistrations[displayMonth] = (monthlyRegistrations[displayMonth] || 0) + 1;
      }
    });

    const patientRegistrationsData: PatientRegistrationDataPoint[] = [];
    const currentJsDate = new Date();
    for (let i = 5; i >= 0; i--) { // Last 6 months including current
        const d = new Date(currentJsDate.getFullYear(), currentJsDate.getMonth() - i, 1);
        const displayMonthKey = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
        patientRegistrationsData.push({
            month: monthNames[d.getMonth()], // Keep it short for X-axis label
            newPatients: monthlyRegistrations[displayMonthKey] || 0,
        });
    }
    console.log("[ACTION_LOG] fetchDashboardStats: Patient registrations processed.");

    const appointmentStatusData: AppointmentStatusDataPoint[] = [
      { status: "Completed", count: statusCounts.completed || 0, fill: "var(--color-completed)" },
      { status: "Scheduled", count: statusCounts.scheduled || 0, fill: "var(--color-scheduled)" },
      { status: "Cancelled", count: statusCounts.cancelled || 0, fill: "var(--color-cancelled)" },
    ];

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
      error: `Could not load dashboard statistics: ${error.message}`,
      data: {
        activePatients: 0, activePatientsChange: "N/A",
        upcomingAppointments: 0, upcomingAppointmentsToday: "N/A",
        availableNurses: 0, availableNursesOnline: "N/A",
        careQualityScore: "N/A", careQualityScoreTrend: "N/A",
        patientRegistrationsData: [],
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
  consultationTime: string;
  dailyRoomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
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

    const patientDocRef = doc(db, "patients", validatedValues.patientId);
    const nurseDocRef = doc(db, "nurses", validatedValues.nurseId);

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
        console.warn("[ACTION_WARN] scheduleVideoConsult: NEXT_PUBLIC_DAILY_CO_BASE_URL is not set correctly. Using fallback.");
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

    console.log("[ACTION_LOG] scheduleVideoConsult: Attempting to add document to Firestore.");
    const docRef = await addDoc(collection(db, "videoConsults"), newVideoConsultData);
    console.log("[ACTION_LOG] scheduleVideoConsult: Video consult added to Firestore with ID:", docRef.id);

    console.log(`[ACTION_LOG] scheduleVideoConsult: Simulating email to Patient ${patient.name}: Video consult at ${validatedValues.consultationDateTime.toLocaleString()}. Link: ${dailyRoomUrl}`);
    console.log(`[ACTION_LOG] scheduleVideoConsult: Simulating email to Nurse ${nurse.name}: Video consult with ${patient.name} at ${validatedValues.consultationDateTime.toLocaleString()}. Link: ${dailyRoomUrl}`);

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
    return { success: false, message: `Failed to schedule video consult: ${error.message}` };
  }
}

export async function fetchVideoConsults(): Promise<{ data?: VideoConsultListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchVideoConsults: Initiated.");
  try {
    const consultsCollectionRef = collection(db, "videoConsults");
    const q = query(consultsCollectionRef, orderBy("consultationTime", "desc"));
    console.log("[ACTION_LOG] fetchVideoConsults: Created query. Attempting getDocs...");
    const consultsSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchVideoConsults: getDocs successful. Found ${consultsSnapshot.docs.length} documents.`);

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
    console.log("[ACTION_LOG] fetchVideoConsults: Data mapping complete. Returning data.");
    return { data: consultsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchVideoConsults: Error fetching video consults from Firestore:", error.code, error.message, error);
    return { error: `Failed to fetch video consults: ${error.message}` };
  }
}

// --- Database Seeding ---
const mockTunisianPatients = [
  {
    name: "Ahmed Ben Salah", age: 68, primaryNurse: "Leila Haddad",
    phone: "+216 22 123 456", email: "ahmed.bensalah@example.com", address: "15 Rue de la Kasbah, Tunis",
    mobilityStatus: "Ambulatoire avec canne", pathologies: ["Diabète", "Hypertension"], allergies: ["Pénicilline"],
    lastVisitDate: "2024-07-15", condition: "Diabète de type 2", status: "Stable", hint: "elderly man tunisian"
  },
  {
    name: "Fatima Bouaziz", age: 75, primaryNurse: "Karim Zayani",
    phone: "+216 98 765 432", email: "fatima.bouaziz@example.com", address: "Avenue Habib Bourguiba, Sousse",
    mobilityStatus: "Fauteuil roulant", pathologies: ["Arthrose", "Problèmes cardiaques"], allergies: ["Aspirine"],
    lastVisitDate: "2024-07-20", condition: "Arthrose sévère", status: "Nécessite suivi", hint: "elderly woman tunisian"
  },
  {
    name: "Mohamed Cherif", age: 55, primaryNurse: "Rania Chebbi",
    phone: "+216 55 555 555", email: "mohamed.cherif@example.com", address: "Cité El Ghazela, Ariana",
    mobilityStatus: "Ambulatoire", pathologies: ["Asthme"], allergies: [],
    lastVisitDate: "2024-07-01", condition: "Asthme chronique", status: "En amélioration", hint: "man tunisian"
  },
  {
    name: "Aisha Khelifi", age: 62, primaryNurse: "Hassen Marzouk",
    phone: "+216 23 456 789", email: "aisha.khelifi@example.com", address: "Route de Gremda, Sfax",
    mobilityStatus: "Mobilité réduite", pathologies: ["Hypertension"], allergies: ["Fruits de mer"],
    lastVisitDate: "2024-06-25", condition: "Hypertension", status: "Stable", hint: "woman tunisian"
  },
  {
    name: "Youssef Trabelsi", age: 70, primaryNurse: "Sami Ben Ammar",
    phone: "+216 99 888 777", email: "youssef.trabelsi@example.com", address: "La Marsa, Tunis",
    mobilityStatus: "Alité", pathologies: ["Problèmes cardiaques", "Diabète"], allergies: [],
    lastVisitDate: "2024-07-22", condition: "Insuffisance cardiaque", status: "Nécessite suivi", hint: "elderly man tunisian"
  }
];

const mockTunisianNurses = [
  {
    name: "Leila Haddad", specialty: "Gériatrie", location: "Clinique El Amen, Tunis",
    phone: "+216 71 111 222", email: "leila.haddad@sanhome.com", status: "Available", hint: "nurse woman tunisian"
  },
  {
    name: "Karim Zayani", specialty: "Soins généraux", location: "Hôpital Sahloul, Sousse",
    phone: "+216 73 333 444", email: "karim.zayani@sanhome.com", status: "On Duty", hint: "nurse man tunisian"
  },
  {
    name: "Rania Chebbi", specialty: "Pédiatrie", location: "Clinique Ezzahra, Sfax",
    phone: "+216 74 555 666", email: "rania.chebbi@sanhome.com", status: "Available", hint: "nurse woman tunisian"
  },
  {
    name: "Hassen Marzouk", specialty: "Cardiologie", location: "Hôpital Fattouma Bourguiba, Monastir",
    phone: "+216 73 777 888", email: "hassen.marzouk@sanhome.com", status: "Unavailable", hint: "nurse man tunisian"
  },
  {
    name: "Sami Ben Ammar", specialty: "Soins à domicile", location: "Service Mobile, Grand Tunis",
    phone: "+216 71 999 000", email: "sami.benammar@sanhome.com", status: "Available", hint: "nurse man tunisian"
  }
];

export async function seedDatabase(): Promise<{ success: boolean; message: string; details?: Record<string, string> }> {
  console.log("[ACTION_LOG] seedDatabase: Initiated.");
  const results: Record<string, string> = {};
  const patientRefs: { id: string; name: string }[] = [];
  const nurseRefs: { id: string; name: string }[] = [];

  try {
    // Seed Patients
    const patientsCollectionRef = collection(db, "patients");
    const currentPatientsSnapshot = await getDocs(query(patientsCollectionRef, limit(1)));
    if (currentPatientsSnapshot.empty) {
      for (const patientData of mockTunisianPatients) {
        const { lastVisitDate, ...restData } = patientData; // Separate lastVisitDate
        const newPatient = {
          ...restData,
          avatarUrl: `https://placehold.co/100x100.png?text=${patientData.name.split(" ").map(n=>n[0]).join("")}`,
          joinDate: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000))), // Random join date in the last year
          lastVisit: Timestamp.fromDate(new Date(lastVisitDate)),
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(patientsCollectionRef, newPatient);
        patientRefs.push({ id: docRef.id, name: newPatient.name });
        console.log(`[ACTION_LOG] Seeded patient: ${newPatient.name} with ID ${docRef.id}`);
      }
      results.patients = `Seeded ${mockTunisianPatients.length} patients.`;
    } else {
      results.patients = "Patients collection is not empty. Skipping seeding patients.";
      // Fetch existing patients if we need them for consults and didn't seed
      const existingPatients = await getDocs(patientsCollectionRef);
      existingPatients.forEach(doc => patientRefs.push({ id: doc.id, name: doc.data().name }));
    }

    // Seed Nurses
    const nursesCollectionRef = collection(db, "nurses");
    const currentNursesSnapshot = await getDocs(query(nursesCollectionRef, limit(1)));
    if (currentNursesSnapshot.empty) {
      for (const nurseData of mockTunisianNurses) {
        const newNurse = {
          ...nurseData,
          avatar: `https://placehold.co/100x100.png?text=${nurseData.name.split(" ").map(n=>n[0]).join("")}`,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(nursesCollectionRef, newNurse);
        nurseRefs.push({ id: docRef.id, name: newNurse.name });
        console.log(`[ACTION_LOG] Seeded nurse: ${newNurse.name} with ID ${docRef.id}`);
      }
      results.nurses = `Seeded ${mockTunisianNurses.length} nurses.`;
    } else {
      results.nurses = "Nurses collection is not empty. Skipping seeding nurses.";
      // Fetch existing nurses
      const existingNurses = await getDocs(nursesCollectionRef);
      existingNurses.forEach(doc => nurseRefs.push({ id: doc.id, name: doc.data().name }));
    }

    // Seed Video Consultations (only if we have patients and nurses)
    if (patientRefs.length > 0 && nurseRefs.length > 0) {
      const videoConsultsCollectionRef = collection(db, "videoConsults");
      const currentConsultsSnapshot = await getDocs(query(videoConsultsCollectionRef, limit(1)));
      let seededConsultsCount = 0;
      if (currentConsultsSnapshot.empty) {
        for (let i = 0; i < 5; i++) { // Create 5 mock consults
          const randomPatient = patientRefs[Math.floor(Math.random() * patientRefs.length)];
          const randomNurse = nurseRefs[Math.floor(Math.random() * nurseRefs.length)];
          const consultDate = new Date();
          consultDate.setDate(consultDate.getDate() + Math.floor(Math.random() * 30) - 15); // +/- 15 days
          consultDate.setHours(Math.floor(Math.random() * 10) + 8, Math.random() > 0.5 ? 30 : 0, 0, 0); // 8 AM to 5:30 PM

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
          await addDoc(videoConsultsCollectionRef, newConsult);
          seededConsultsCount++;
        }
        results.videoConsults = `Seeded ${seededConsultsCount} video consultations.`;
        console.log(`[ACTION_LOG] Seeded ${seededConsultsCount} video consultations.`);
      } else {
        results.videoConsults = "VideoConsults collection is not empty. Skipping seeding video consultations.";
      }
    } else {
        results.videoConsults = "Skipped seeding video consultations as patients or nurses were not available/seeded.";
    }

    console.log("[ACTION_LOG] seedDatabase: Seeding process completed.");
    return { success: true, message: "Database seeding process finished.", details: results };

  } catch (error: any) {
    console.error("[ACTION_ERROR] seedDatabase: Error during seeding:", error);
    return { success: false, message: `Database seeding failed: ${error.message}`, details: results };
  }
}
    

      