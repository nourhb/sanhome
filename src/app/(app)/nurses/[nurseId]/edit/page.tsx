import React from 'react';

interface EditNurseProfilePageProps{
  params: {
    nurseId: string;
  };
}

const EditNurseProfilePage: React.FC<EditNurseProfilePageProps> = ({ params }) => {
  const { nurseId } = params;

  return (
    <div>
      <h1>Edit Nurse Profile</h1>
      <p>Editing nurse with ID: {nurseId}</p>
      {/* You will add the edit form and logic here */}
    </div>
  );
};

export default EditNurseProfilePage;