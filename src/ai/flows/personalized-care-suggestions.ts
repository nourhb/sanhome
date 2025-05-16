// src/ai/flows/personalized-care-suggestions.ts
'use server';

/**
 * @fileOverview Provides AI-driven personalized care suggestions based on patient data.
 *
 * - getPersonalizedCareSuggestions - A function that generates personalized care suggestions for a patient.
 * - PersonalizedCareSuggestionsInput - The input type for the getPersonalizedCareSuggestions function.
 * - PersonalizedCareSuggestionsOutput - The return type for the getPersonalizedCareSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedCareSuggestionsInputSchema = z.object({
  mobilityStatus: z
    .string()
    .describe('The patient\'s mobility status (e.g., fully mobile, limited mobility, bedridden).'),
  pathologies: z.string().describe('A comma-separated list of the patient\'s pathologies.'),
  patientName: z.string().describe('The name of the patient.'),
});
export type PersonalizedCareSuggestionsInput = z.infer<typeof PersonalizedCareSuggestionsInputSchema>;

const PersonalizedCareSuggestionsOutputSchema = z.object({
  careSuggestions: z.string().describe('AI-driven personalized care suggestions for the patient.'),
});
export type PersonalizedCareSuggestionsOutput = z.infer<typeof PersonalizedCareSuggestionsOutputSchema>;

export async function getPersonalizedCareSuggestions(input: PersonalizedCareSuggestionsInput): Promise<PersonalizedCareSuggestionsOutput> {
  return personalizedCareSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedCareSuggestionsPrompt',
  input: {schema: PersonalizedCareSuggestionsInputSchema},
  output: {schema: PersonalizedCareSuggestionsOutputSchema},
  prompt: `You are an AI assistant that provides personalized care suggestions for nurses based on patient data.

  Patient Name: {{{patientName}}}
  Mobility Status: {{{mobilityStatus}}}
  Pathologies: {{{pathologies}}}

  Based on the patient's mobility status and pathologies, provide personalized care suggestions. Consider factors
  such as medication reminders, physical therapy exercises, dietary recommendations, and emotional support.
  Provide the suggestions in a concise and actionable format.
  Do not make any assumptions about the pathologies, and only take the pathologies mentioned above into consideration.
  Focus on how the nurse can provide tailored care based on this patients situation.
  `,
});

const personalizedCareSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizedCareSuggestionsFlow',
    inputSchema: PersonalizedCareSuggestionsInputSchema,
    outputSchema: PersonalizedCareSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
