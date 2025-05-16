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
  return { data: mockPatients };
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