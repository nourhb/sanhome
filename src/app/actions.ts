
'use server';

import { 
  getPersonalizedCareSuggestions, 
  type PersonalizedCareSuggestionsInput, 
  type PersonalizedCareSuggestionsOutput 
} from '@/ai/flows/personalized-care-suggestions';
import { z } from 'zod';

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

// Mock data for patient list - in a real app, this would come from a database
const mockPatients = [
  { id: '1', name: 'Alice Wonderland', age: 34, lastVisit: '2024-07-15', condition: 'Diabetes Type 1', status: 'Stable' },
  { id: '2', name: 'Bob The Builder', age: 52, lastVisit: '2024-07-20', condition: 'Hypertension', status: 'Needs Follow-up' },
  { id: '3', name: 'Charlie Chaplin', age: 78, lastVisit: '2024-07-01', condition: 'Arthritis', status: 'Stable' },
  { id: '4', name: 'Diana Prince', age: 45, lastVisit: '2024-06-25', condition: 'Post-surgery Recovery', status: 'Improving' },
  { id: '5', name: 'Eleanor Vance', age: 62, lastVisit: '2024-07-22', condition: 'COPD', status: 'Stable' },
];

export type PatientListItem = typeof mockPatients[number];

export async function fetchPatients(): Promise<{ data?: PatientListItem[], error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, you'd fetch this from your database (e.g., Firestore)
  // To simulate an error, uncomment the next line:
  // return { error: "Failed to connect to the database." };
  return { data: mockPatients };
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
