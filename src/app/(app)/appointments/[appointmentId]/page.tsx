"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;

  // State to hold appointment details
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function fetchAppointmentDetails() {
      if (!appointmentId) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch appointment details');
        }
        const data = await response.json();
        setAppointment(data);

        // // Placeholder data for now - REMOVE AFTER IMPLEMENTING FETCH
        // setAppointment({
        //     id: appointmentId,
            time: "Loading...",
            type: "Loading...",
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppointmentDetails();
  }, [appointmentId]);


  if (isLoading) {
    return <div>Loading appointment details...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading appointment details: {error}</div>;
  }

  if (!appointment) {
    return <div>Appointment not found.</div>;
  }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Appointment Details</h1>
      <p>Appointment ID: {appointmentId}</p>

      {/* Display placeholder appointment details */}
      <div className="mt-6 space-y-4">
          <p><strong>Patient:</strong> {appointment.patientName}</p>
          <p><strong>Nurse:</strong> {appointment.nurseName}</p>
          <p><strong>Date:</strong> {appointment.date}</p>
          <p><strong>Time:</strong> {appointment.time}</p>
          <p><strong>Type:</strong> {appointment.type}</p>
      </div>


      <div className="mt-8 space-x-4">
        {/* TODO: Implement Edit action */}
        <button className="px-4 py-2 bg-blue-500 text-white rounded">Edit Appointment</button>
        {/* TODO: Implement Delete action */}
        <button className="px-4 py-2 bg-red-500 text-white rounded">Delete Appointment</button>
      </div>
    </div>
  );
}