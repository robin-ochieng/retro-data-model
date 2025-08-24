import React from 'react';
import { useParams } from 'react-router-dom';

export default function StepIntro() {
  const { lob, submissionId } = useParams();
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">{lob} Submission</h2>
      <p className="mb-2">Submission ID: <span className="font-mono">{submissionId}</span></p>
      <p className="text-gray-600 dark:text-gray-300">Welcome to the wizard. Please proceed through the steps.</p>
    </div>
  );
}
