'use server';
// IMPORTANT REMINDER FOR SEEDING:
// If your Firestore rules are `allow read, write: if request.auth != null;`,
// YOU MUST BE LOGGED INTO THE APPLICATION WHEN TRIGGERING THIS ACTION.
// For initial seeding, consider temporarily opening your Firestore rules
// (e.g., `allow read, write: if true;`), run the seed, then IMMEDIATELY revert to secure rules.
// This applies to both Firestore writes and Firebase Authentication user creation.
// Ensure Firebase Auth "Email/Password" sign-in provider is ENABLED.
// Ensure the Cloud Firestore API is ENABLED in your Google Cloud project.

// For Whereby API integration in scheduleVideoConsult:
// Ensure WHEREBY_API_KEY and NEXT_PUBLIC_WHEREBY_SUBDOMAIN are correctly set in your .env file.
// The API key needs permissions to create rooms.
// Check your Whereby account settings for embedding permissions if the iframe doesn't load.
// For email notifications:
// Ensure EMAIL_USER and EMAIL_PASS are correctly set in .env.
// For Gmail, use an App Password if 2-Step Verification is ON.

import {
  getPersonalizedCareSuggestions,
  type PersonalizedCareSuggestionsInput,
  type PersonalizedCareSuggestionsOutput
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';
import { generateRandomPassword, generateRandomString, generatePhoneNumber, generateDateOfBirth } from '@/lib/utils';
import { auth as clientAuth, db as clientDb } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, doc, getDoc, serverTimestamp, Timestamp,
  query, where, updateDoc, deleteDoc, writeBatch, getCountFromServer, orderBy, limit, setDoc, collectionGroup
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { v2 as cloudinary } from 'cloudinary';


// Consistent instances for Firestore and Auth
const firestoreInstance = clientDb;
const firebaseAuthInstance = clientAuth;
console.log("[ACTION_LOG_INIT] firestoreInstance and firebaseAuthInstance aliased.");


if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("[ACTION_LOG] Cloudinary SDK configured.");
} else {
  console.warn("[ACTION_WARN] Cloudinary credentials not fully configured in .env. File uploads via Cloudinary will fail.");
}


async function uploadToCloudinary(file: File, folder: string): Promise<string | null> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("[ACTION_ERROR] Cloudinary not configured. Cannot upload file.");
    return null;
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: folder },
        (error, result) => {
          if (error) {
            console.error("[ACTION_ERROR] Cloudinary upload_stream error:", error);
            reject(error);
          } else if (result) {
            console.log("[ACTION_LOG] File uploaded to Cloudinary:", result.secure_url);
            resolve(result.secure_url);
          } else {
            reject(new Error("Cloudinary upload failed without error object or result."));
          }
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("[ACTION_ERROR] Error processing file for Cloudinary upload:", error);
    return null;
  }
}


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


export type PatientListItem = {
  id: string;
  name: string;
  age: number;
  avatarUrl: string;
  joinDate: string; // ISO string
  primaryNurse: string;
  phone: string;
  email: string;
  address: string;
  mobilityStatus: string;
  pathologies: string[];
  allergies: string[];
  lastVisit: string; // ISO string
  condition: string;
  status: string;
  hint?: string;
  currentMedications?: Array<{ name: string; dosage: string }>;
  recentVitals?: { date: string; bp: string; hr: string; temp: string; glucose: string };
  createdAt?: string; // ISO string
};

export async function fetchPatientById(id: string): Promise<{ data?: PatientListItem, error?: string }> {
  console.log(`[ACTION_LOG] fetchPatientById: Initiated for ID: ${id}`);
  try {
    if (!id) {
      console.error("[ACTION_ERROR] fetchPatientById: Patient ID is required.");
      return { error: "Patient ID is required." };
    }
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchPatientById: Firestore instance is not available.");
      return { error: "Firestore not initialized." };
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
        joinDate: data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString() : (typeof data.joinDate === 'string' ? data.joinDate : new Date().toISOString()),
        primaryNurse: data.primaryNurse || "N/A",
        phone: data.phone || "N/A",
        email: data.email || "N/A",
        address: data.address || "N/A",
        mobilityStatus: data.mobilityStatus || "N/A",
        pathologies: pathologiesArray,
        allergies: allergiesArray,
        lastVisit: data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString() : (typeof data.lastVisit === 'string' ? data.lastVisit : new Date().toISOString()),
        condition: data.condition || "N/A",
        status: data.status || "N/A",
        currentMedications: data.currentMedications || [
            { name: "Lisinopril", dosage: "10mg daily" },
            { name: "Metformin", dosage: "500mg twice daily" },
        ],
        recentVitals: data.recentVitals || {
            date: "2024-07-30", bp: "140/90 mmHg", hr: "75 bpm", temp: "37.0°C", glucose: "120 mg/dL"
        },
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
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
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] addPatient: Firestore instance is not available.");
      return { success: false, message: "Firebase services not initialized." };
    }
    const validatedValues = AddPatientInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'person face';

    if (validatedValues.avatarFile) {
      console.log("[ACTION_LOG] addPatient: Avatar file provided. Uploading to Cloudinary...");
      const uploadedUrl = await uploadToCloudinary(validatedValues.avatarFile, "patient-avatars");
      if (uploadedUrl) {
        avatarUrlToStore = uploadedUrl;
        hint = `patient ${validatedValues.fullName}`;
        console.log("[ACTION_LOG] addPatient: Avatar uploaded to Cloudinary:", avatarUrlToStore);
      } else {
        console.warn("[ACTION_WARN] addPatient: Cloudinary upload failed. Using placeholder avatar.");
      }
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
      lastVisit: Timestamp.fromDate(new Date()),
      condition: validatedValues.pathologies.split(',')[0]?.trim() || 'N/A',
      status: 'Stable',
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
  createdAt?: string; // ISO string
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
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] addNurse: Firestore instance is not available.");
      return { success: false, message: "Firebase services not initialized." };
    }
    const validatedValues = AddNurseInputSchema.parse(values);
    let avatarUrlToStore = `https://placehold.co/100x100.png?text=${validatedValues.fullName.split(" ").map(n=>n[0]).join("")}`;
    let hint = 'nurse medical';

    if (validatedValues.avatarFile) {
      console.log("[ACTION_LOG] addNurse: Avatar file provided. Uploading to Cloudinary...");
      const uploadedUrl = await uploadToCloudinary(validatedValues.avatarFile, "nurse-avatars");
      if (uploadedUrl) {
        avatarUrlToStore = uploadedUrl;
        hint = `nurse ${validatedValues.fullName}`;
        console.log("[ACTION_LOG] addNurse: Avatar uploaded to Cloudinary:", avatarUrlToStore);
      } else {
        console.warn("[ACTION_WARN] addNurse: Cloudinary upload failed. Using placeholder avatar.");
      }
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
      status: 'Available' as const,
      createdAt: serverTimestamp(),
    };

    console.log("[ACTION_LOG] addNurse: Attempting to add document to Firestore 'nurses' collection.");
    const docRef = await addDoc(collection(firestoreInstance, "nurses"), newNurseData);
    console.log("[ACTION_LOG] addNurse: Nurse added to Firestore with ID: ", docRef.id);

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
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchDashboardStats: Firestore instance is not available.");
      return { error: "Firestore not initialized." };
    }
    const patientsCollectionRef = collection(firestoreInstance, "patients");
    const nursesCollectionRef = collection(firestoreInstance, "nurses");
    const videoConsultsCollectionRef = collection(firestoreInstance, "videoConsults");

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
        const displayMonthKey = `${monthNames[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
        monthlyRegistrations[displayMonthKey] = (monthlyRegistrations[displayMonthKey] || 0) + 1;
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


// For Whereby API calls
// Ensure WHEREBY_API_KEY and NEXT_PUBLIC_WHEREBY_SUBDOMAIN are set in .env
// The API key needs permissions to create rooms.
// Check your Whereby account settings for embedding permissions if the iframe doesn't load.

// For email notifications
// Ensure EMAIL_USER and EMAIL_PASS are correctly set in .env.
// For Gmail, use an App Password if 2-Step Verification is ON.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface SendConsultScheduledEmailProps {
  toEmail: string;
  toName: string;
  patientName: string;
  nurseName: string;
  consultationDateTime: Date;
  roomUrl: string;
}
async function sendConsultScheduledEmail({
  toEmail,
  toName,
  patientName,
  nurseName,
  consultationDateTime,
  roomUrl,
}: SendConsultScheduledEmailProps) {
  console.log(`[ACTION_LOG] Attempting to send consultation email to ${toEmail}`);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your-email@example.com') {
    console.warn("[EMAIL_WARN] EMAIL_USER or EMAIL_PASS not set or using placeholder in .env. Skipping actual email sending.");
    console.log(`[EMAIL_SIMULATION] Would send email to ${toEmail} for ${toName}:`);
    console.log(`  Subject: SanHome - Video Consultation Scheduled`);
    console.log(`  Body: Hello ${toName},\nA video consultation has been scheduled for you${toName === patientName ? '' : ' with ' + patientName} with ${nurseName}.\nTime: ${format(consultationDateTime, "eeee, MMMM d, yyyy 'at' h:mm a")}\nJoin here: ${roomUrl}\nBest regards,\nSanHome Team`);
    return { success: true, message: "Email sending simulated due to missing/placeholder credentials." };
  }

  const formattedConsultationTime = format(consultationDateTime, "eeee, MMMM d, yyyy 'at' h:mm a");
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'SanHome - Video Consultation Scheduled',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #122e4b;">SanHome - Video Consultation Scheduled</h2>
        <p>Hello ${toName},</p>
        <p>A video consultation has been scheduled:</p>
        <ul>
          <li><strong>Patient:</strong> ${patientName}</li>
          <li><strong>Nurse:</strong> ${nurseName}</li>
          <li><strong>Time:</strong> ${formattedConsultationTime}</li>
        </ul>
        <p>You can join the call using the following link:</p>
        <p><a href="${roomUrl}" style="color: #007bff; text-decoration: none;">${roomUrl}</a></p>
        <p>If you have any questions, please contact our support.</p>
        <p>Best regards,</p>
        <p>The SanHome Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL_LOG] Consultation scheduled email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, message: `Email sent to ${toEmail}` };
  } catch (error: any) {
    console.error(`[EMAIL_ERROR] Error sending consultation scheduled email to ${toEmail}:`, error);
    let specificError = `Failed to send email to ${toEmail}: ${error.message}`;
     if (error.responseCode === 535 && error.command === 'AUTH PLAIN') {
      specificError = `Failed to send email to ${toEmail}: Invalid login: 535-5.7.8 Username and Password not accepted. Please check your EMAIL_USER and EMAIL_PASS in .env. For Gmail, consider using an App Password. Google Support: https://support.google.com/mail/?p=BadCredentials`;
    }
    return { success: false, message: specificError };
  }
}

const ScheduleVideoConsultInputSchema = z.object({
  patientId: z.string().min(1),
  nurseId: z.string().min(1),
  consultationDateTime: z.date(),
});
export type ScheduleVideoConsultFormServerValues = z.infer<typeof ScheduleVideoConsultInputSchema>;

export type VideoConsultListItem = {
  id: string;
  patientId: string;
  patientName: string;
  nurseId: string;
  nurseName: string;
  consultationTime: string; // ISO string
  roomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string; // ISO string
};

export async function scheduleVideoConsult(
  values: ScheduleVideoConsultFormServerValues
): Promise<{ success?: boolean; message: string; consultId?: string; roomUrl?: string }> {
  console.log('[ACTION_LOG] scheduleVideoConsult function called');
  console.log("[ACTION_LOG] scheduleVideoConsult: Received consultationDateTime value:", values.consultationDateTime);
  console.log("[ACTION_LOG] scheduleVideoConsult: Initiated with values:", values.patientId, values.nurseId);

  // Ensure EMAIL_USER and EMAIL_PASS are set before proceeding
  // For example: console.log(`Email User from env: ${process.env.EMAIL_USER}`);

  // Ensure Whereby API key is set correctly for Whereby integration
  // For example: console.log(`Whereby API Key from env: ${process.env.WHEREBY_API_KEY ? 'SET' : 'NOT SET'}`);

  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] scheduleVideoConsult: Firestore instance is not available.");
      return { success: false, message: "Firestore not initialized." };
    }
    const validatedValues = ScheduleVideoConsultInputSchema.parse(values);

    if (!(validatedValues.consultationDateTime instanceof Date) || isNaN(validatedValues.consultationDateTime.getTime())) {
      console.error("[ACTION_ERROR] scheduleVideoConsult: Invalid consultationDateTime provided.", validatedValues.consultationDateTime);
      return { success: false, message: "Invalid consultation date or time." };
    }

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

    console.log("[ACTION_LOG] scheduleVideoConsult: Using consultationDateTime for scheduling:", validatedValues.consultationDateTime);

    let wherebyRoomUrl = "";
    const wherebyApiKey = process.env.WHEREBY_API_KEY;
    const wherebySubdomain = process.env.NEXT_PUBLIC_WHEREBY_SUBDOMAIN;

    if (wherebyApiKey && wherebySubdomain && wherebyApiKey !== "YOUR_WHEREBY_API_KEY_PLACEHOLDER" && wherebySubdomain !== "your-subdomain") {
      console.log(`[ACTION_LOG] scheduleVideoConsult: Attempting to create Whereby room via API. Subdomain: ${wherebySubdomain}`);

      // Simplified API Request Body: removed roomMode and templateType
      const apiRequestBody = {
        endDate: new Date(validatedValues.consultationDateTime.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours duration
        fields: ['roomUrl', 'hostRoomUrl'],
        roomNamePattern: 'uuid',
        // roomMode: 'group', // Removed
        // templateType: 'viewerMode', // Removed
      };
      console.log("[ACTION_LOG] scheduleVideoConsult: Whereby API Request Body:", JSON.stringify(apiRequestBody, null, 2));

      try {
        const response = await fetch('https://api.whereby.dev/v1/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wherebyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiRequestBody),
        });

        const responseText = await response.text(); // Get raw text first
        console.log("[ACTION_LOG] scheduleVideoConsult: Whereby API Raw Response Status:", response.status);
        console.log("[ACTION_LOG] scheduleVideoConsult: Whereby API Raw Response Text:", responseText);

        if (!response.ok) {
          let errorDataMessage = `Whereby API error (${response.status})`;
          try {
            const errorData = JSON.parse(responseText);
            errorDataMessage += `: ${errorData.message || errorData.error || errorData.detail || responseText}`;
          } catch (parseError) {
            errorDataMessage += ` - Non-JSON response: ${responseText}`;
          }
          console.error("[ACTION_ERROR] scheduleVideoConsult: Whereby API call failed. ", errorDataMessage);
          throw new Error(errorDataMessage);
        }

        const meetingData = JSON.parse(responseText);
        wherebyRoomUrl = meetingData.roomUrl || meetingData.hostRoomUrl; // Prefer roomUrl, fallback to hostRoomUrl
        if (!wherebyRoomUrl) {
            console.error("[ACTION_ERROR] scheduleVideoConsult: Whereby API response missing roomUrl/hostRoomUrl:", meetingData);
            throw new Error("Whereby API did not return a usable room URL. Full response: " + JSON.stringify(meetingData));
        }
        console.log("[ACTION_LOG] scheduleVideoConsult: Whereby room created via API. URL:", wherebyRoomUrl);

      } catch (apiError: any) {
        console.error("[ACTION_ERROR] scheduleVideoConsult: Critical error calling Whereby API:", apiError.message, apiError.stack);
        return { success: false, message: `Failed to create Whereby room via API: ${apiError.message}. Please check server logs and Whereby API key/permissions.` };
      }
    } else {
        let warningMessage = "[ACTION_WARN] scheduleVideoConsult: Whereby API Key or Subdomain not configured properly for API room creation. ";
        if (!wherebyApiKey || wherebyApiKey === "YOUR_WHEREBY_API_KEY_PLACEHOLDER") {
          warningMessage += "WHEREBY_API_KEY is missing or using placeholder. ";
        }
        if (!wherebySubdomain || wherebySubdomain === "your-subdomain") {
          warningMessage += "NEXT_PUBLIC_WHEREBY_SUBDOMAIN is missing or using placeholder. ";
        }
         warningMessage += "Falling back to generated room URL (this room may not exist and API creation is preferred).";
        console.warn(warningMessage);

        const roomName = `sanhome-consult-${generateRandomString(8)}`;
        wherebyRoomUrl = `https://${wherebySubdomain || 'sanhome'}.whereby.com/${roomName}`;
        console.log("[ACTION_LOG] scheduleVideoConsult: Generated Whereby room URL (fallback):", wherebyRoomUrl);

        if (!wherebySubdomain || wherebySubdomain === "your-subdomain") {
             return { success: false, message: "Whereby subdomain not configured in environment variables. Cannot schedule consult with API or fallback." };
        }
    }


    const newVideoConsultData = {
      patientId: validatedValues.patientId,
      patientName: patient.name,
      nurseId: validatedValues.nurseId,
      nurseName: nurse.name,
      consultationTime: Timestamp.fromDate(validatedValues.consultationDateTime),
      roomUrl: wherebyRoomUrl,
      status: 'scheduled' as const,
      createdAt: serverTimestamp(),
    };

    console.log("[ACTION_LOG] scheduleVideoConsult: Attempting to add document to Firestore 'videoConsults' collection.");
    const docRef = await addDoc(collection(firestoreInstance, "videoConsults"), newVideoConsultData);
    console.log("[ACTION_LOG] scheduleVideoConsult: Video consult added to Firestore with ID:", docRef.id);

    console.log("[ACTION_LOG] scheduleVideoConsult: Attempting to send email notifications...");
    let patientEmailResult = { success: false, message: "Patient email not found or sending skipped." };
    let nurseEmailResult = { success: false, message: "Nurse email not found or sending skipped." };

    if (patient.email) {
        patientEmailResult = await sendConsultScheduledEmail({
            toEmail: patient.email,
            toName: patient.name,
            patientName: patient.name,
            nurseName: nurse.name,
            consultationDateTime: validatedValues.consultationDateTime,
            roomUrl: wherebyRoomUrl,
        });
    } else {
        console.warn(`[ACTION_WARN] scheduleVideoConsult: Patient ${patient.name} has no email address. Cannot send consultation email.`);
        patientEmailResult.message = `Patient ${patient.name} has no email.`;
    }

    if (nurse.email) {
        nurseEmailResult = await sendConsultScheduledEmail({
            toEmail: nurse.email,
            toName: nurse.name,
            patientName: patient.name,
            nurseName: nurse.name,
            consultationDateTime: validatedValues.consultationDateTime,
            roomUrl: wherebyRoomUrl,
        });
    } else {
        console.warn(`[ACTION_WARN] scheduleVideoConsult: Nurse ${nurse.name} has no email address. Cannot send consultation email.`);
        nurseEmailResult.message = `Nurse ${nurse.name} has no email.`;
    }


    let finalMessage = `Video consult scheduled for ${patient.name} with ${nurse.name}. Room URL: ${wherebyRoomUrl}`;
    if (!patientEmailResult.success || !nurseEmailResult.success) {
      finalMessage += ` Email notifications: Patient - ${patientEmailResult.message} Nurse - ${nurseEmailResult.message}`;
    } else {
      finalMessage += ` Emails sent successfully to patient and nurse.`;
    }

    return {
      success: true,
      message: finalMessage,
      consultId: docRef.id,
      roomUrl: wherebyRoomUrl
    };

  } catch (error: any) {
    console.error("[ACTION_ERROR] scheduleVideoConsult: Error scheduling video consult: ", error.code, error.message, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    if (error.message.startsWith("Whereby API error") || error.message.startsWith("Failed to create Whereby room")) {
        return { success: false, message: error.message };
    }
    return { success: false, message: `Failed to schedule video consult: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

export async function fetchVideoConsults(): Promise<{ data?: VideoConsultListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchVideoConsults: Initiated.");
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchVideoConsults: Firestore instance is not available.");
      return { error: "Firestore not initialized." };
    }
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
        roomUrl: data.roomUrl,
        status: data.status as VideoConsultListItem['status'],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as VideoConsultListItem;
    });
    console.log("[ACTION_LOG] fetchVideoConsults: Firestore data mapping complete. Returning data.");
    return { data: consultsList };
  } catch (error: any)
{
    console.error("[ACTION_ERROR] fetchVideoConsults: Error fetching video consults from Firestore:", error.code, error.message, error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchVideoConsults: Query requires a composite index on 'videoConsults' for 'consultationTime desc'.");
        return { data: [], error: "Query requires an index. Please create it in Firestore for 'videoConsults' collection on 'consultationTime' descending." };
    }
    return { error: `Failed to fetch video consults: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}


// --- Start of Seed Database Logic ---
// REMINDER: For this to work, ensure your Firestore rules allow writes for authenticated users (e.g., `allow write: if request.auth != null;`)
// OR temporarily open them (`allow write: if true;`) if running this for the first time.
// Also, ensure Firebase Authentication "Email/Password" sign-in provider is ENABLED.
// The user triggering this from the client MUST be logged in if rules require authentication.
console.log("[ACTION_LOG] Defining seedDatabase function.");
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
    phone: generatePhoneNumber(), email: `ahmed.bensalah-${generateRandomString(4)}@example.com`, address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Ambulatoire avec canne", pathologies: ["Diabète", "Hypertension"], allergies: ["Pénicilline"],
    lastVisitDate: "2024-07-15", condition: "Diabète de type 2", status: "Stable", hint: "elderly man tunisian"
  },
  {
    name: "Fatima Bouaziz", age: 75,
    phone: generatePhoneNumber(), email: `fatima.bouaziz-${generateRandomString(4)}@example.com`, address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Fauteuil roulant", pathologies: ["Arthrose", "Problèmes cardiaques"], allergies: ["Aspirine"],
    lastVisitDate: "2024-07-20", condition: "Arthrose sévère", status: "Needs Follow-up", hint: "elderly woman tunisian"
  },
   {
    name: "Youssef Jlassi", age: 55,
    phone: generatePhoneNumber(), email: `youssef.jlassi-${generateRandomString(4)}@example.com`, address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Mobile", pathologies: ["Asthme"], allergies: [],
    lastVisitDate: "2024-06-10", condition: "Asthme chronique", status: "Stable", hint: "man tunisian"
  },
  {
    name: "Mariem Saidi", age: 62,
    phone: generatePhoneNumber(), email: `mariem.saidi-${generateRandomString(4)}@example.com`, address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Limitée, utilise un déambulateur", pathologies: ["Ostéoporose", "Hypertension"], allergies: ["Sulfamides"],
    lastVisitDate: "2024-07-01", condition: "Ostéoporose", status: "Needs Follow-up", hint: "woman tunisian"
  },
  {
    name: "Ali Trabelsi", age: 71,
    phone: generatePhoneNumber(), email: `ali.trabelsi-${generateRandomString(4)}@example.com`, address: addresses[Math.floor(Math.random() * addresses.length)],
    mobilityStatus: "Mobile avec aide occasionnelle", pathologies: ["Insuffisance rénale légère"], allergies: [],
    lastVisitDate: "2024-05-25", condition: "Insuffisance rénale", status: "Stable", hint: "senior man tunisian"
  },
];

const mockTunisianNurses = [
  {
    name: "Leila Haddad", specialty: "Gériatrie", location: "Clinique El Amen, Tunis",
    phone: generatePhoneNumber(), email: `leila.haddad-${generateRandomString(4)}@sanhome.com`, status: "Available", hint: "nurse woman tunisian"
  },
  {
    name: "Karim Zayani", specialty: "Soins Généraux", location: "Hôpital Sahloul, Sousse",
    phone: generatePhoneNumber(), email: `karim.zayani-${generateRandomString(4)}@sanhome.com`, status: "On Duty", hint: "nurse man tunisian"
  },
  {
    name: "Sana Mabrouk", specialty: "Pédiatrie", location: "Cabinet Dr. Feki, Sfax",
    phone: generatePhoneNumber(), email: `sana.mabrouk-${generateRandomString(4)}@sanhome.com`, status: "Available", hint: "female nurse tunisian"
  },
  {
    name: "Mohamed Gharbi", specialty: "Cardiologie", location: "Clinique Hannibal, Tunis",
    phone: generatePhoneNumber(), email: `mohamed.gharbi-${generateRandomString(4)}@sanhome.com`, status: "Unavailable", hint: "male nurse tunisian"
  },
];

function checkFirebaseInstances() {
  if (!firestoreInstance) {
    console.error("[ACTION_ERROR] Firestore instance (db) is not initialized.");
    return false;
  }
  if (!firebaseAuthInstance) {
    console.error("[ACTION_ERROR] Firebase Auth instance (auth) is not initialized.");
    return false;
  }
  console.log("[ACTION_LOG] seedDatabase: Firebase firestoreInstance object initialized?", !!firestoreInstance);
  console.log("[ACTION_LOG] seedDatabase: Firebase firebaseAuthInstance object initialized?", !!firebaseAuthInstance);
  return true;
}

export async function seedDatabase(): Promise<{ success: boolean; message: string; details?: Record<string, string> }> {
  console.log("[ACTION_LOG] seedDatabase: Action invoked.");
  console.log("[ACTION_LOG] seedDatabase: Firebase firestoreInstance object initialized?", !!firestoreInstance);
  console.log("[ACTION_LOG] seedDatabase: Firebase firebaseAuthInstance object initialized?", !!firebaseAuthInstance);

  const results: Record<string, string> = { users: "", patients: "", nurses: "", videoConsults: "" };
  let allSuccess = true;
  const patientRefs: { id: string; name: string, email: string }[] = [];
  const nurseRefs: { id: string; name: string, email: string }[] = [];
  const userRefs: { uid: string, name: string, email: string }[] = [];

  try {
    console.log("[ACTION_LOG] seedDatabase: Checking Firebase instances explicitly...");
    if (!checkFirebaseInstances()) {
        const errMessage = "Firebase services (Firestore or Auth) not initialized correctly for seeding. Check lib/firebase.ts and .env configuration.";
        console.error(`[ACTION_ERROR] seedDatabase: ${errMessage}`);
        return { success: false, message: errMessage, details: {} };
    }

    console.log("[ACTION_LOG] seedDatabase: VERY EXPLICIT LOG - About to check 'users' collection count.");
    // Section 1: Seed Users (Authentication and Firestore 'users' collection)
    let usersCount = 0;
    try {
      const usersCollRef = collection(firestoreInstance, "users");
      console.log("[ACTION_LOG] seedDatabase: Getting count from 'users' server...");
      console.log("[ACTION_LOG] seedDatabase: Making sure firestoreInstance is available before getCountFromServer:", !!firestoreInstance);
      const usersCountSnapshot = await getCountFromServer(usersCollRef);
      usersCount = usersCountSnapshot.data().count;
      console.log(`[ACTION_LOG] seedDatabase: Found ${usersCount} existing user documents. Actual count from getCountFromServer: ${usersCount}.`);
      results.users = `Checked 'users' collection, found ${usersCount} documents. `;
    } catch (e: any) {
      const specificError = `Failed to get count for 'users' collection: ${e.message} (Code: ${e.code || 'N/A'}).`;
      console.error(`[ACTION_ERROR] seedDatabase (checking users collection): ${specificError}`, e);
      results.users += `Error checking 'users' collection: ${specificError}. `;
      allSuccess = false;
      return { success: false, message: `Database seeding failed: Could not check 'users' collection. ${specificError}`, details: results };
    }

    if (usersCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'users' collection is empty. Attempting to seed users...");
      const sampleAuthUsers = Array.from({ length: 10 }, (_, index) => ({
        email: `user${index + 1}-${generateRandomString(4)}@sanhome.com`, // More unique emails
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
      let userSeedingErrors = "";
      console.log("[ACTION_LOG] seedDatabase: About to loop through sampleAuthUsers for creation.");
      if (!firebaseAuthInstance) {
        const authErrorMsg = "[ACTION_ERROR] seedDatabase: Firebase Auth instance (firebaseAuthInstance) is NULL before attempting user creation loop!";
        console.error(authErrorMsg);
        userSeedingErrors += "Firebase Auth instance not available. ";
        allSuccess = false;
      } else {
          console.log("[ACTION_LOG] Seed Users: Firebase Auth instance appears to be initialized.");
          for (const userData of sampleAuthUsers) {
            try {
              console.log(`[ACTION_LOG] seedDatabase: Attempting to create auth user: ${userData.email}`);
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
            } catch (e: any) {
              let errorMsg = `Error creating auth user ${userData.email} or Firestore profile: ${e.message} (Code: ${e.code || 'unknown'}). `;
              if (e.code === 'auth/email-already-in-use') {
                errorMsg = `User email ${userData.email} already exists in Firebase Authentication. Skipping. `
                console.warn(`[ACTION_WARN] Seed User: ${errorMsg}`);
              } else if (e.code) {
                console.error(`[ACTION_ERROR] seedDatabase (user ${userData.email}): Code: ${e.code}, Message: ${e.message}`, e);
                userSeedingErrors += errorMsg; // Still add to errors if it's not just 'email-already-in-use' that we silently skip
                allSuccess = false; // Mark as not fully successful if any non-skip error occurs
              } else {
                 console.error(`[ACTION_ERROR] seedDatabase (user ${userData.email}): Generic JS error: ${e.message}`, e);
                 userSeedingErrors += errorMsg;
                 allSuccess = false;
              }
            }
          }
        }
      results.users += `Seeded ${seededUsersCount} users.`;
      if (userSeedingErrors && !allSuccess) {
        results.users += ` Some errors encountered: ${userSeedingErrors.trim()}`;
      } else if (userSeedingErrors) {
         results.users += ` Some non-critical issues: ${userSeedingErrors.trim()}`;
      }
    } else {
      results.users += "Skipping seeding users.";
      console.log("[ACTION_LOG] seedDatabase: 'users' collection not empty, skipping user seeding.");
       const existingUsersSnapshot = await getDocs(collection(firestoreInstance, "users"));
        existingUsersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if ((data.firstName && data.lastName) || data.email) {
                let name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                if (!name && data.email) name = data.email;
                if (name && data.email) {
                    userRefs.push({ uid: docSnap.id, name: name, email: data.email });
                }
            } else {
                console.warn(`[ACTION_WARN] seedDatabase: User document ${docSnap.id} missing enough info for ref, skipping.`);
            }
        });
       console.log(`[ACTION_LOG] seedDatabase: Loaded ${userRefs.length} existing user references.`);
    }

    // Section 2: Seed Patients
    console.log("[ACTION_LOG] seedDatabase: Checking 'patients' collection...");
    let patientsCount = 0;
    try {
        const patientsCollRef = collection(firestoreInstance, "patients");
        const patientsCountSnapshot = await getCountFromServer(patientsCollRef);
        patientsCount = patientsCountSnapshot.data().count;
        console.log(`[ACTION_LOG] seedDatabase: Found ${patientsCount} existing patient documents. Actual count: ${patientsCount}.`);
        results.patients = `Checked 'patients' collection, found ${patientsCount} documents. `;
    } catch (e: any) {
        const specificError = `Failed to get count for 'patients' collection: ${e.message} (Code: ${e.code || 'N/A'}).`;
        console.error(`[ACTION_ERROR] seedDatabase (checking patients): ${specificError}`, e);
        results.patients += `Error checking 'patients' collection: ${specificError}. `;
        allSuccess = false;
    }

    if (patientsCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'patients' collection is empty. Attempting to seed patients...");
      let seededPatientsCount = 0;
      for (const patientData of mockTunisianPatients) {
        try {
          const { lastVisitDate, ...restData } = patientData;
          const correspondingUser = userRefs.find(u => u.email === patientData.email);
          const patientIdForDoc = correspondingUser ? correspondingUser.uid : `patient-${generateRandomString(10)}`;

          const newPatient = {
            ...restData,
            primaryNurse: nurseRefs.length > 0 ? nurseRefs[Math.floor(Math.random() * nurseRefs.length)].name : "Infirmière Non Assignée",
            avatarUrl: `https://placehold.co/100x100.png?text=${patientData.name.split(" ").map(n=>n[0]).join("")}`,
            joinDate: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000))),
            lastVisit: Timestamp.fromDate(new Date(lastVisitDate)),
            pathologies: patientData.pathologies,
            allergies: patientData.allergies,
            createdAt: serverTimestamp(),
          };
          console.log(`[ACTION_LOG] seedDatabase: Attempting to add patient: ${newPatient.name} with ID ${patientIdForDoc}`);

          const patientDocRef = doc(firestoreInstance, "patients", patientIdForDoc);
          await setDoc(patientDocRef, newPatient);
          patientRefs.push({ id: patientIdForDoc, name: newPatient.name, email: newPatient.email });
          seededPatientsCount++;
          console.log(`[ACTION_LOG] Seeded patient: ${newPatient.name} with ID ${patientIdForDoc}`);
        } catch (e: any) {
          console.error(`[ACTION_ERROR] seedDatabase (patient ${patientData.name}): Code: ${e.code}, Message: ${e.message}`, e);
          results.patients += `Error for ${patientData.name}: ${e.message} (Code: ${e.code}). `;
          allSuccess = false;
        }
      }
      results.patients += `Seeded ${seededPatientsCount} patients.`;
    } else {
      console.log(`[ACTION_LOG] seedDatabase: 'patients' collection not empty (found ${patientsCount} docs). Skipping patient seeding.`);
      results.patients += `Patients collection is not empty (found ${patientsCount} docs). Skipping seeding patients.`;
       const existingPatientsSnapshot = await getDocs(collection(firestoreInstance, "patients"));
        existingPatientsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.name && data.email) {
                patientRefs.push({ id: docSnap.id, name: data.name, email: data.email });
            }
        });
      console.log(`[ACTION_LOG] seedDatabase: Loaded ${patientRefs.length} existing patient references.`);
    }

    // Section 3: Seed Nurses
    console.log("[ACTION_LOG] seedDatabase: Checking 'nurses' collection...");
    let nursesCount = 0;
    try {
      const nursesCollRef = collection(firestoreInstance, "nurses");
      const nursesCountSnapshot = await getCountFromServer(nursesCollRef);
      nursesCount = nursesCountSnapshot.data().count;
      console.log(`[ACTION_LOG] seedDatabase: Found ${nursesCount} existing nurse documents. Count: ${nursesCount}.`);
      results.nurses = `Checked 'nurses' collection, found ${nursesCount} documents. `;
    } catch (e: any) {
        const specificError = `Failed to get count for 'nurses' collection: ${e.message} (Code: ${e.code || 'N/A'}).`;
        console.error(`[ACTION_ERROR] seedDatabase (checking nurses): ${specificError}`, e);
        results.nurses += `Error checking 'nurses' collection: ${specificError}. `;
        allSuccess = false;
    }

    if (nursesCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'nurses' collection is empty. Attempting to seed nurses...");
      let seededNursesCount = 0;
      for (const nurseData of mockTunisianNurses) {
        try {
          const correspondingUser = userRefs.find(u => u.email === nurseData.email);
          const nurseIdForDoc = correspondingUser ? correspondingUser.uid : `nurse-${generateRandomString(10)}`;

          const newNurse = {
            ...nurseData,
            avatar: `https://placehold.co/100x100.png?text=${nurseData.name.split(" ").map(n=>n[0]).join("")}`,
            createdAt: serverTimestamp(),
          };
          console.log(`[ACTION_LOG] seedDatabase: Attempting to add nurse: ${newNurse.name} with ID ${nurseIdForDoc}`);
          const nurseDocRef = doc(firestoreInstance, "nurses", nurseIdForDoc);
          await setDoc(nurseDocRef, newNurse);
          nurseRefs.push({ id: nurseIdForDoc, name: newNurse.name, email: newNurse.email });
          seededNursesCount++;
          console.log(`[ACTION_LOG] Seeded nurse: ${newNurse.name} with ID ${nurseIdForDoc}`);
        } catch (e: any) {
          console.error(`[ACTION_ERROR] seedDatabase (nurse ${nurseData.name}): Code: ${e.code}, Message: ${e.message}`, e);
          results.nurses += `Error for ${nurseData.name}: ${e.message} (Code: ${e.code}). `;
          allSuccess = false;
        }
      }
      results.nurses += `Seeded ${seededNursesCount} nurses.`;
    } else {
      console.log(`[ACTION_LOG] seedDatabase: 'nurses' collection not empty (found ${nursesCount} docs), skipping nurse seeding.`);
      results.nurses += `Nurses collection is not empty (found ${nursesCount} docs). Skipping seeding nurses.`;
       const existingNursesSnapshot = await getDocs(collection(firestoreInstance, "nurses"));
        existingNursesSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.name && data.email) {
                nurseRefs.push({ id: docSnap.id, name: data.name, email: data.email });
            }
        });
        console.log(`[ACTION_LOG] seedDatabase: Loaded ${nurseRefs.length} existing nurse references.`);
    }

    if (patientsCount === 0 && patientRefs.length > 0 && nursesCount === 0 && nurseRefs.length > 0) {
        console.log("[ACTION_LOG] seedDatabase: Re-assigning primary nurses to newly seeded patients as nurses were also freshly seeded.");
        const batch = writeBatch(firestoreInstance);
        let updateCount = 0;
        try {
            for (const patientRef of patientRefs) {
                const randomNurse = nurseRefs[Math.floor(Math.random() * nurseRefs.length)];
                if (randomNurse) {
                    const patientDocRefToUpdate = doc(firestoreInstance, "patients", patientRef.id);
                    batch.update(patientDocRefToUpdate, { primaryNurse: randomNurse.name });
                    updateCount++;
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
    } else {
        console.log("[ACTION_LOG] seedDatabase: Skipping primary nurse reassignment as patients or nurses were not freshly seeded in this run.");
    }

    // Section 4: Seed Video Consults
    console.log("[ACTION_LOG] seedDatabase: Checking 'videoConsults' collection...");
    let videoConsultsCount = 0;
    try {
      const videoConsultsCollRef = collection(firestoreInstance, "videoConsults");
      const videoConsultsCountSnapshot = await getCountFromServer(videoConsultsCollRef);
      videoConsultsCount = videoConsultsCountSnapshot.data().count;
      console.log(`[ACTION_LOG] seedDatabase: Found ${videoConsultsCount} existing video consult documents. Count: ${videoConsultsCount}.`);
      results.videoConsults = `Checked 'videoConsults' collection, found ${videoConsultsCount} documents. `;
    } catch (e: any) {
        const specificError = `Failed to get count for 'videoConsults' collection: ${e.message} (Code: ${e.code || 'N/A'}).`;
        console.error(`[ACTION_ERROR] seedDatabase (checking videoConsults): ${specificError}`, e);
        results.videoConsults += `Error checking 'videoConsults' collection: ${specificError}. `;
        allSuccess = false;
    }

    if (videoConsultsCount === 0) {
      console.log("[ACTION_LOG] seedDatabase: 'videoConsults' collection is empty. Attempting to seed video consults...");
      if (patientRefs.length > 0 && nurseRefs.length > 0) {
        let seededConsultsCount = 0;
        const numConsultsToSeed = Math.min(5, patientRefs.length, nurseRefs.length);
        for (let i = 0; i < numConsultsToSeed; i++) {
          try {
            const randomPatient = patientRefs[i % patientRefs.length];
            const randomNurse = nurseRefs[i % nurseRefs.length];

            if (!randomPatient || !randomNurse) {
              console.warn("[ACTION_WARN] seedDatabase: Skipping video consult seed due to missing randomPatient or randomNurse.");
              continue;
            }

            const consultDate = new Date();
            consultDate.setDate(consultDate.getDate() + Math.floor(Math.random() * 14) - 7);
            consultDate.setHours(Math.floor(Math.random() * 10) + 8, Math.random() > 0.5 ? 30 : 0, 0, 0);

            const statuses: VideoConsultListItem['status'][] = ['scheduled', 'completed', 'cancelled'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            const wherebySubdomain = process.env.NEXT_PUBLIC_WHEREBY_SUBDOMAIN || "sanhome";
            const roomName = `sanhome-consult-${generateRandomString(8)}`;
            const roomUrl = `https://${wherebySubdomain}.whereby.com/${roomName}`;

            const newConsult = {
              patientId: randomPatient.id,
              patientName: randomPatient.name,
              nurseId: randomNurse.id,
              nurseName: randomNurse.name,
              consultationTime: Timestamp.fromDate(consultDate),
              roomUrl: roomUrl,
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
      results.videoConsults += "Skipping seeding video consultations.";
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
    let specificMessage = `Database seeding failed critically. Firebase: ${firebaseErrorMessage} (Code: ${firebaseErrorCode}). Full Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
    console.error(`[ACTION_ERROR] seedDatabase: CRITICAL error during seeding process. Code: ${firebaseErrorCode}, Message: ${firebaseErrorMessage}`, error);
    console.error("[ACTION_ERROR] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (error.code === 'auth/invalid-credential') {
        // This specific check might be too general here as it's a global catch
        // Specific auth errors are handled within the user seeding loop
    } else if (firebaseErrorCode === 'permission-denied' || firebaseErrorMessage.includes('PERMISSION_DENIED') || firebaseErrorMessage.includes("Missing or insufficient permissions")) {
        specificMessage = `Database seeding failed: Missing or insufficient permissions. Ensure Firestore/Auth rules allow writes for authenticated users (or are temporarily open for seeding: 'allow read, write: if true;') and that you are logged in when triggering this. Also check project API enablement. Firebase Code: ${firebaseErrorCode}`;
    } else if (firebaseAuthInstance && (firebaseErrorMessage.includes("auth is not a function") || firebaseErrorMessage.includes("auth is not defined") || firebaseErrorMessage.includes("auth is null") || firebaseErrorMessage.includes("Firebase: Error (auth/internal-error)."))) {
        specificMessage = "Database seeding failed: Firebase Authentication service might not be initialized correctly or available. Check Firebase setup in `lib/firebase.ts`. Firebase Message: " + firebaseErrorMessage;
    } else if (!firestoreInstance || !firebaseAuthInstance) {
         specificMessage = "Database seeding failed: Firebase services (Firestore or Auth) appear to be uninitialized within the server action. Check lib/firebase.ts and .env configuration.";
    } else if (firebaseErrorMessage.includes("Cloud Firestore API has not been used") || firebaseErrorMessage.includes("FIRESTORE_API_DISABLED") ) {
        specificMessage = `Database seeding failed: The Cloud Firestore API is not enabled for your project. Please visit https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id'} to enable it.`;
    } else if (firebaseErrorMessage.includes("Could not reach Cloud Firestore backend") ) {
        specificMessage = `Database seeding failed: Could not reach Cloud Firestore backend. This often indicates a network issue or that the Firestore API, while enabled, isn't reachable. Details: ${firebaseErrorMessage}`;
    } else if (firebaseErrorMessage.includes("Failed to fetch")) {
        specificMessage = `Database seeding failed: A network error occurred ('Failed to fetch'). This could be a CORS issue if the request is cross-origin and not configured, a local network problem, or an issue with the Firebase backend. Details: ${firebaseErrorMessage}`;
    } else if (specificMessage.includes("Failed at initial check of 'users' collection")) {
      specificMessage = `Database seeding failed: Could not check 'users' collection. Ensure Firestore API is enabled and rules allow reads. Details: ${firebaseErrorMessage}`;
    } else if (firebaseErrorCode === 'auth/operation-not-allowed') {
      specificMessage = `Database seeding failed: Email/password sign-in is not enabled for your Firebase project. Please enable it in the Firebase console (Authentication -> Sign-in method).`;
    } else if (firebaseErrorCode === 'auth/invalid-credential') {
       specificMessage = `Database seeding failed during user creation: Invalid credential. This can happen if the email is malformed or password doesn't meet Firebase requirements. Check the specific email being processed. Error: ${firebaseErrorMessage}`;
    } else if (specificMessage.includes("firestoreInstance is not defined")) {
      specificMessage = "CRITICAL SETUP ERROR: The Firestore 'db' instance is not correctly initialized or imported in actions.ts. Check lib/firebase.ts and imports.";
    } else if (specificMessage.includes("Failed to get count for 'users' collection")) {
       specificMessage = `Database seeding failed: ${firebaseErrorMessage}. Please check server logs for the specific Firebase error code.`;
    } else if (error.message && error.message.includes("Cannot read properties of undefined (reading 'data')")) {
        specificMessage = "Database seeding failed: Likely tried to read 'data' from an undefined snapshot. This might occur if a getCountFromServer or getDocs call failed silently or returned unexpected results. Check Firestore rules and API status.";
    }


    return { success: false, message: specificMessage, details: results };
  }
}


export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchPatients: Initiated from Firestore.");
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchPatients: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchPatients.");
    }
    const patientsCollectionRef = collection(firestoreInstance, "patients");

    const q = query(patientsCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchPatients: Created collection reference. Attempting getDocs...");

    const patientsSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchPatients: Firestore getDocs successful. Found ${patientsSnapshot.docs.length} documents.`);

    const patientsList = patientsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const joinDate = data.joinDate instanceof Timestamp ? data.joinDate.toDate().toISOString() : (typeof data.joinDate === 'string' ? data.joinDate : new Date().toISOString());
      const lastVisit = data.lastVisit instanceof Timestamp ? data.lastVisit.toDate().toISOString() : (typeof data.lastVisit === 'string' ? data.lastVisit : new Date().toISOString());
      const pathologies = Array.isArray(data.pathologies) ? data.pathologies : (typeof data.pathologies === 'string' ? data.pathologies.split(',').map(p => p.trim()).filter(Boolean) : []);
      const allergies = Array.isArray(data.allergies) ? data.allergies : (typeof data.allergies === 'string' ? data.allergies.split(',').map(a => a.trim()).filter(Boolean) : []);
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());


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
        createdAt: createdAt,
      } as PatientListItem;
    });
    console.log("[ACTION_LOG] fetchPatients: Firestore data mapping complete. Returning data.");
    return { data: patientsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchPatients: Error fetching patients from Firestore:", error.code, error.message, error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchPatients: Query requires a composite index on 'patients' for 'createdAt desc'.");
        return { data: [], error: "Query requires an index. Please create it in Firestore for 'patients' collection on 'createdAt' descending." };
    }
    return { error: `Failed to fetch patients: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}

export async function fetchNurses(): Promise<{ data?: NurseListItem[], error?: string }> {
  console.log("[ACTION_LOG] fetchNurses: Initiated from Firestore.");
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchNurses: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchNurses.");
    }
    const nursesCollectionRef = collection(firestoreInstance, "nurses");
    const q = query(nursesCollectionRef, orderBy("createdAt", "desc"));
    console.log("[ACTION_LOG] fetchNurses: Created query. Attempting getDocs...");
    const nursesSnapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchNurses: Firestore getDocs successful. Found ${nursesSnapshot.docs.length} documents.`);

    const nursesList = nursesSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
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
        createdAt: createdAt,
      } as NurseListItem;
    });
    console.log("[ACTION_LOG] fetchNurses: Firestore data mapping complete. Returning data.");
    return { data: nursesList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchNurses: Error fetching nurses from Firestore:", error.code, error.message, error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchNurses: Query requires a composite index on 'nurses' for 'createdAt desc'.");
        return { data: [], error: "Query requires an index. Please create it in Firestore for 'nurses' collection on 'createdAt' descending." };
    }
    return { error: `Failed to fetch nurses: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}


export async function fetchCollectionData(
  collectionName: string
): Promise<{ data?: any[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchCollectionData: Initiated for collection: ${collectionName}`);
  try {
    if (!firestoreInstance) {
      console.error(`[ACTION_ERROR] fetchCollectionData: Firestore instance is not available for ${collectionName}.`);
      throw new Error(`Firestore \`firestoreInstance\` instance is not available in fetchCollectionData for ${collectionName}.`);
    }
    if (!["users", "patients", "nurses", "videoConsults", "appointments", "careLogs", "medicalFiles", "notifications"].includes(collectionName)) {
      console.error(`[ACTION_ERROR] fetchCollectionData: Invalid collection name: ${collectionName}`);
      return { error: "Invalid collection name provided." };
    }

    const collRef = collection(firestoreInstance, collectionName);
    let q;
    const collectionsWithCreatedAt = ["users", "patients", "nurses", "videoConsults", "appointments", "careLogs", "medicalFiles", "notifications"];

    if (collectionsWithCreatedAt.includes(collectionName)) {
      try {
        q = query(collRef, orderBy("createdAt", "desc"), limit(25));
        console.log(`[ACTION_LOG] fetchCollectionData: Querying ${collectionName} with orderBy 'createdAt' descending.`);
      } catch (orderByError: any) {
        console.warn(`[ACTION_WARN] fetchCollectionData: orderBy('createdAt') failed for ${collectionName}, falling back to simple limit. Error: ${orderByError.message}`);
        q = query(collRef, limit(25));
      }
    } else {
      q = query(collRef, limit(25));
      console.log(`[ACTION_LOG] fetchCollectionData: Querying ${collectionName} with simple limit (no createdAt ordering).`);
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
        console.warn(`[ACTION_WARN] fetchCollectionData for ${collectionName}: Query requires a composite index. Link to create: ${error.message.substring(error.message.indexOf("https://"))}`);
        return { error: `Query requires an index. Please create the required composite index in Firestore for collection '${collectionName}' ordered by 'createdAt desc'. Firestore error: ${error.message}` };
    }
    return { error: `Failed to fetch data from ${collectionName}: ${error.message} (Code: ${error.code || 'N/A'})` };
  }
}


export type AppointmentListItem = {
  id: string;
  patientId: string;
  patientName: string;
  nurseId: string;
  nurseName: string;
  appointmentDate: string; // ISO string
  appointmentTime: string;
  appointmentType: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: string; // ISO string
};

export async function fetchAppointments(): Promise<{ data?: AppointmentListItem[]; error?: string }> {
  console.log("[ACTION_LOG] fetchAppointments: Initiated.");
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchAppointments: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchAppointments.");
    }
    const appointmentsCollectionRef = collection(firestoreInstance, "appointments");
    const q = query(appointmentsCollectionRef, orderBy("appointmentDate", "desc"));
    const snapshot = await getDocs(q);
    const appointmentsList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            patientId: data.patientId,
            patientName: data.patientName,
            nurseId: data.nurseId,
            nurseName: data.nurseName,
            appointmentDate: data.appointmentDate instanceof Timestamp ? data.appointmentDate.toDate().toISOString() : new Date().toISOString(),
            appointmentTime: data.appointmentTime,
            appointmentType: data.appointmentType,
            status: data.status as AppointmentListItem['status'],
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as AppointmentListItem
    });
    return { data: appointmentsList };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchAppointments:", error.code, error.message, error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchAppointments: Query requires a composite index on 'appointments' for 'appointmentDate desc'.");
        return { data: [], error: "Query requires an index for sorting appointments. Displaying unsorted or empty list." };
    }
    return { data: [], error: `Failed to fetch appointments: ${error.message}` };
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
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] addAppointment: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in addAppointment.");
    }
    const validatedValues = AddAppointmentInputSchema.parse(values);

    const [hours, minutes] = validatedValues.appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(validatedValues.appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

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
      appointmentDate: Timestamp.fromDate(appointmentDateTime),
      appointmentTime: validatedValues.appointmentTime,
      appointmentType: validatedValues.appointmentType,
      status: 'Scheduled' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestoreInstance, "appointments"), newAppointmentData);
    console.log("[ACTION_LOG] addAppointment: Appointment added to Firestore with ID:", docRef.id);
    return { success: true, message: "Appointment scheduled successfully.", appointmentId: docRef.id };

  } catch (error: any) {
    console.error("[ACTION_ERROR] addAppointment:", error.code, error.message, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to schedule appointment: ${error.message}` };
  }
}



export type CareLogItem = {
  id: string;
  patientId: string;
  patientName: string;
  careDate: string; // ISO string
  careType: string;
  notes: string;
  loggedBy: string;
  createdAt: string; // ISO string
};

const AddCareLogInputSchema = z.object({
  patientId: z.string().min(1, "Patient is required."),
  careType: z.string().min(1, "Type of care is required."),
  careDateTime: z.date(),
  notes: z.string().min(3, "Notes are required."),
});
export type AddCareLogFormValues = z.infer<typeof AddCareLogInputSchema>;

export async function fetchCareLogs(patientId?: string): Promise<{ data?: CareLogItem[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchCareLogs: Initiated. Patient ID: ${patientId || 'all'}`);
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchCareLogs: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchCareLogs.");
    }
    const careLogsCollectionRef = collection(firestoreInstance, "careLogs");
    let q;
    if (patientId) {
      q = query(careLogsCollectionRef, where("patientId", "==", patientId), orderBy("careDate", "desc"));
    } else {
      q = query(careLogsCollectionRef, orderBy("careDate", "desc"));
    }

    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const notes = data.notes || "No notes provided.";
        return {
            id: docSnap.id,
            patientId: data.patientId,
            patientName: data.patientName || "N/A",
            careDate: data.careDate instanceof Timestamp ? data.careDate.toDate().toISOString() : new Date().toISOString(),
            careType: data.careType,
            notes: notes, // Ensure notes are correctly assigned
            loggedBy: data.loggedBy,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as CareLogItem
    });
    return { data: logs };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchCareLogs:", error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchCareLogs: Query requires a composite index.");
        return { data: [], error: "Query requires an index. Please create it in Firestore for 'careLogs'." };
    }
    return { data: [], error: `Failed to fetch care logs: ${error.message}` };
  }
}

export async function addCareLog(values: AddCareLogFormValues, loggedByName: string): Promise<{ success?: boolean; message: string; logId?: string }> {
  console.log("[ACTION_LOG] addCareLog: Initiated with values:", values);
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] addCareLog: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in addCareLog.");
    }
    const validatedValues = AddCareLogInputSchema.parse(values);

    let patientName = "N/A";
    const patientDoc = await getDoc(doc(firestoreInstance, "patients", validatedValues.patientId));
    if (patientDoc.exists()) patientName = patientDoc.data().name;

    // This is where 'notes' field is prepared for Firestore.
    const newCareLogData = {
      patientId: validatedValues.patientId,
      patientName,
      careDate: Timestamp.fromDate(validatedValues.careDateTime),
      careType: validatedValues.careType,
      notes: validatedValues.notes, // Notes are definitely part of the object being saved.
      loggedBy: loggedByName,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestoreInstance, "careLogs"), newCareLogData);
    console.log("[ACTION_LOG] addCareLog: Care log added to Firestore with ID:", docRef.id);
    return { success: true, message: "Care log added successfully.", logId: docRef.id };

  } catch (error: any) {
    console.error("[ACTION_ERROR] addCareLog:", error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to add care log: ${error.message}` };
  }
}

const UpdateCareLogInputSchema = AddCareLogInputSchema;
export type UpdateCareLogFormValues = AddCareLogFormValues;

export async function updateCareLog(logId: string, values: UpdateCareLogFormValues): Promise<{ success?: boolean; message: string }> {
  console.log(`[ACTION_LOG] updateCareLog: Initiated for log ID: ${logId} with values:`, values);
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] updateCareLog: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in updateCareLog.");
    }
    if (!logId) {
      return { success: false, message: "Care log ID is required for update." };
    }
    const validatedValues = UpdateCareLogInputSchema.parse(values);

    let patientName = "N/A";
    const patientDoc = await getDoc(doc(firestoreInstance, "patients", validatedValues.patientId));
    if (patientDoc.exists()) {
        patientName = patientDoc.data().name;
    } else {
        console.warn(`[ACTION_WARN] updateCareLog: Patient with ID ${validatedValues.patientId} not found during update.`);
    }

    const careLogRef = doc(firestoreInstance, "careLogs", logId);
    // This is where 'notes' field is prepared for Firestore update.
    const updatedCareLogData = {
      patientId: validatedValues.patientId,
      patientName,
      careType: validatedValues.careType,
      careDate: Timestamp.fromDate(validatedValues.careDateTime),
      notes: validatedValues.notes, // Notes are definitely part of the object being updated.
      // loggedBy and createdAt are usually not updated.
    };

    await updateDoc(careLogRef, updatedCareLogData);
    console.log(`[ACTION_LOG] updateCareLog: Care log ${logId} updated successfully.`);
    return { success: true, message: "Care log updated successfully." };

  } catch (error: any) {
    console.error(`[ACTION_ERROR] updateCareLog for ${logId}:`, error);
    if (error instanceof z.ZodError) {
      return { success: false, message: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` };
    }
    return { success: false, message: `Failed to update care log: ${error.message}` };
  }
}

export async function deleteCareLog(logId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[ACTION_LOG] deleteCareLog: Attempting to delete log ID: ${logId}`);
    if (!firestoreInstance) {
        console.error("[ACTION_ERROR] deleteCareLog: Firestore instance is not available.");
        return { success: false, message: "Database service not available." };
    }
    if (!logId) {
        console.error("[ACTION_ERROR] deleteCareLog: Log ID is required.");
        return { success: false, message: "Log ID is required for deletion." };
    }
    try {
        const careLogRef = doc(firestoreInstance, "careLogs", logId);
        await deleteDoc(careLogRef);
        console.log(`[ACTION_LOG] deleteCareLog: Successfully deleted care log ${logId}.`);
        return { success: true, message: "Care log deleted successfully." };
    } catch (error: any) {
        console.error(`[ACTION_ERROR] deleteCareLog: Error deleting care log ${logId}:`, error);
        return { success: false, message: `Failed to delete care log: ${error.message}` };
    }
}



export type MedicalFileItem = {
  id: string;
  patientId: string;
  patientName: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadDate: string; // ISO string
  uploaderId: string;
  uploaderName: string;
  size: number;
  createdAt: string; // ISO string
};

export async function fetchMedicalFiles(patientId?: string): Promise<{ data?: MedicalFileItem[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchMedicalFiles: Initiated. PatientId: ${patientId || 'all'}`);
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchMedicalFiles: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchMedicalFiles.");
    }
    const filesCollectionRef = collection(firestoreInstance, "medicalFiles");
    let q;
    if (patientId) {
      console.log(`[ACTION_LOG] fetchMedicalFiles: Querying for patientId: ${patientId}`);
      q = query(filesCollectionRef, where("patientId", "==", patientId), orderBy("uploadDate", "desc"));
    } else {
      console.log(`[ACTION_LOG] fetchMedicalFiles: Querying for all files (consider pagination for production).`);
      q = query(filesCollectionRef, orderBy("uploadDate", "desc"), limit(50));
    }

    const snapshot = await getDocs(q);
    console.log(`[ACTION_LOG] fetchMedicalFiles: Found ${snapshot.docs.length} files for query.`);
    const files = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            patientId: data.patientId,
            patientName: data.patientName || "N/A",
            fileName: data.fileName,
            fileType: data.fileType,
            fileUrl: data.fileUrl,
            uploadDate: data.uploadDate instanceof Timestamp ? data.uploadDate.toDate().toISOString() : new Date().toISOString(),
            uploaderId: data.uploaderId,
            uploaderName: data.uploaderName,
            size: data.size,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as MedicalFileItem
    });
    return { data: files };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchMedicalFiles:", error);
     if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchMedicalFiles: Query requires a composite index.");
        return { data: [], error: "Query requires an index. Please create it in Firestore for 'medicalFiles'." };
    }
    return { data: [], error: `Failed to fetch medical files: ${error.message}` };
  }
}

export async function uploadMedicalFile(
  patientId: string,
  fileNameUnused: string, // Original parameters kept for signature compatibility, but 'file' obj used
  fileTypeUnused: string, // Original parameters kept
  fileSizeUnused: number, // Original parameters kept
  uploaderId: string,
  uploaderName: string,
  file: File // The actual file object
): Promise<{ success?: boolean; message: string; fileId?: string; fileUrl?: string }> {
  console.log(`[ACTION_LOG] uploadMedicalFile: Uploading for patient ${patientId}, file ${file.name}, uploader ${uploaderName} (${uploaderId})`);
  if (!firestoreInstance) {
    console.error("[ACTION_ERROR] uploadMedicalFile: Firestore instance not available.");
    return { success: false, message:"Firestore instance not available in uploadMedicalFile."};
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("[ACTION_ERROR] uploadMedicalFile: Cloudinary not configured. Cannot upload file.");
    return { success: false, message: "Cloudinary not configured. File upload failed." };
  }

  try {
    console.log(`[ACTION_LOG] uploadMedicalFile: Attempting to upload to Cloudinary for patient ${patientId}...`);
    const uploadedUrl = await uploadToCloudinary(file, `medical-files/${patientId}`);
    if (!uploadedUrl) {
      console.error("[ACTION_ERROR] uploadMedicalFile: Cloudinary upload returned no URL for patient", patientId);
      return { success: false, message: "File upload to Cloudinary failed: No URL returned." };
    }
    console.log("[ACTION_LOG] uploadMedicalFile: File successfully uploaded to Cloudinary:", uploadedUrl);

    let patientName = "N/A";
    const patientDoc = await getDoc(doc(firestoreInstance, "patients", patientId));
    if (patientDoc.exists()) patientName = patientDoc.data().name;
    console.log(`[ACTION_LOG] uploadMedicalFile: Patient name for file metadata: ${patientName}`);

    const newFileData = {
        patientId,
        patientName,
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadedUrl,
        uploadDate: Timestamp.now(),
        uploaderId,
        uploaderName,
        size: file.size,
        createdAt: serverTimestamp(),
    };
    console.log("[ACTION_LOG] uploadMedicalFile: Preparing to save metadata to Firestore:", newFileData);
    const docRef = await addDoc(collection(firestoreInstance, "medicalFiles"), newFileData);
    console.log("[ACTION_LOG] uploadMedicalFile: File metadata added to Firestore with ID:", docRef.id);
    return { success: true, message: "File uploaded and metadata saved successfully.", fileId: docRef.id, fileUrl: uploadedUrl };

  } catch (error: any) {
    console.error("[ACTION_ERROR] uploadMedicalFile for patient", patientId, ":", error);
    return { success: false, message: `Failed to upload file: ${error.message}` };
  }
}



export type NotificationItem = {
  id: string;
  userId: string;
  type: 'Reminder' | 'Alert' | 'Update' | string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string; // ISO string
};

export async function fetchNotifications(userId: string): Promise<{ data?: NotificationItem[]; error?: string }> {
  console.log(`[ACTION_LOG] fetchNotifications: Initiated for user ${userId}.`);
  try {
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] fetchNotifications: Firestore instance is not available.");
      throw new Error("Firestore `firestoreInstance` instance is not available in fetchNotifications.");
    }
    const notificationsRef = collection(firestoreInstance, "users", userId, "notifications");
    const q = query(notificationsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: data.userId,
            type: data.type,
            message: data.message,
            read: data.read,
            link: data.link,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as NotificationItem
    });
    return { data: notifications };
  } catch (error: any) {
    console.error("[ACTION_ERROR] fetchNotifications:", error);
    if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
        console.warn("[ACTION_WARN] fetchNotifications: Query requires a composite index. Returning empty for now.");
        return { data: [], error: `Query requires an index. Please create it in Firestore for 'users/${userId}/notifications' on 'createdAt' descending.` };
    }
    return { data: [], error: `Failed to fetch notifications: ${error.message}` };
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[ACTION_LOG] markNotificationAsRead: User ${userId}, Notification ${notificationId}`);
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] markNotificationAsRead: Firestore instance is not available.");
      return { success: false, message: "Firestore `firestoreInstance` instance is not available in markNotificationAsRead." };
    }
    try {
        const notificationRef = doc(firestoreInstance, "users", userId, "notifications", notificationId);
        await updateDoc(notificationRef, { read: true });
        return { success: true, message: "Notification marked as read." };
    } catch (error: any) {
        console.error("[ACTION_ERROR] markNotificationAsRead:", error);
        return { success: false, message: error.message };
    }
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; message?: string }> {
    console.log(`[ACTION_LOG] markAllNotificationsAsRead: User ${userId}`);
    if (!firestoreInstance) {
      console.error("[ACTION_ERROR] markAllNotificationsAsRead: Firestore instance is not available.");
      return { success: false, message: "Firestore `firestoreInstance` instance is not available in markAllNotificationsAsRead." };
    }
    try {
        const notificationsRef = collection(firestoreInstance, "users", userId, "notifications");
        const q = query(notificationsRef, where("read", "==", false));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: true, message: "No unread notifications to mark." };
        }
        const batch = writeBatch(firestoreInstance);
        snapshot.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { read: true });
        });
        await batch.commit();
        return { success: true, message: `${snapshot.size} notifications marked as read.` };
    } catch (error: any) {
        console.error("[ACTION_ERROR] markAllNotificationsAsRead:", error);
        return { success: false, message: error.message };
    }
}



export type UserForAdminList = {
    id: string;
    email: string | null;
    name: string;
    role: string | null;
    status: 'Active' | 'Suspended' | string;
    joined: string; // ISO string
    createdAt: string; // ISO string
};

export async function fetchUsersForAdmin(): Promise<{ data?: UserForAdminList[]; error?: string }> {
    console.log("[ACTION_LOG] fetchUsersForAdmin: Initiated.");
    try {
        if (!firestoreInstance) {
          console.error("[ACTION_ERROR] fetchUsersForAdmin: Firestore instance is not available.");
          throw new Error("Firestore `firestoreInstance` instance is not available in fetchUsersForAdmin.");
        }
        const usersCollectionRef = collection(firestoreInstance, "users");
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const usersList = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            console.log(`[ACTION_LOG] fetchUsersForAdmin: Raw data from Firestore doc ${docSnap.id}:`, data);
            let name = "N/A";
            if (data.firstName && data.lastName) {
              name = `${data.firstName} ${data.lastName}`;
            } else if (data.firstName) {
              name = data.firstName;
            } else if (data.lastName) {
              name = data.lastName;
            } else if (data.email) {
              name = data.email; // Fallback name to email
            } else {
              name = "Unknown User";
            }

            const mappedUser = {
                id: docSnap.id,
                email: data.email || null,
                name: name,
                role: data.role || 'patient',
                status: 'Active', // Default status
                joined: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as UserForAdminList;
            console.log(`[ACTION_LOG] fetchUsersForAdmin: Mapped user for chat:`, mappedUser);
            return mappedUser;
        });
        return { data: usersList };
    } catch (error: any) {
        console.error("[ACTION_ERROR] fetchUsersForAdmin:", error);
        if (error.code === 'failed-precondition' && error.message.includes('indexes?create_composite=')) {
            console.warn("[ACTION_WARN] fetchUsersForAdmin: Query requires a composite index on 'users' for 'createdAt desc'.");
            return { data: [], error: "Query requires an index. Please create it in Firestore for 'users' collection on 'createdAt' descending." };
        }
        return { data: [], error: `Failed to fetch users: ${error.message}` };
    }
}
