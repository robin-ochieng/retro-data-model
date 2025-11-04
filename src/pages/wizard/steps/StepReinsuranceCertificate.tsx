import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { uploadCertificate, getCertificate, deleteCertificate, downloadCertificate } from '../../../lib/uploadCertificate';
import { useSubmissionMeta } from '../../../context/SubmissionMeta';
import { supabase } from '../../../lib/supabase';

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: boolean;
}

export function StepReinsuranceCertificate() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { isReadOnly } = useSubmissionMeta();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
    success: false,
  });
  const [certificate, setCertificate] = useState<{
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch existing certificate on mount
  useEffect(() => {
    async function loadCertificate() {
      if (!submissionId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cert = await getCertificate(submissionId, user.id);
      if (cert) {
        setCertificate({
          fileName: cert.file_name,
          fileUrl: cert.file_url,
          uploadedAt: cert.uploaded_at,
        });
      }
    }

    loadCertificate();
  }, [submissionId]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!submissionId || isReadOnly) return;

      // Reset states
      setUploadState({
        isUploading: true,
        uploadProgress: 0,
        error: null,
        success: false,
      });

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            error: 'User not authenticated',
          }));
          return;
        }

        // Simulate progress for UX (Supabase doesn't provide upload progress)
        const progressInterval = setInterval(() => {
          setUploadState(prev => ({
            ...prev,
            uploadProgress: Math.min(prev.uploadProgress + 10, 90),
          }));
        }, 200);

        const result = await uploadCertificate(file, submissionId, user.id);

        clearInterval(progressInterval);

        if (result.success && result.fileUrl) {
          setUploadState({
            isUploading: false,
            uploadProgress: 100,
            error: null,
            success: true,
          });

          setCertificate({
            fileName: file.name,
            fileUrl: result.fileUrl,
            uploadedAt: new Date().toISOString(),
          });

          // Clear success message after 3 seconds
          setTimeout(() => {
            setUploadState(prev => ({ ...prev, success: false }));
          }, 3000);
        } else {
          setUploadState({
            isUploading: false,
            uploadProgress: 0,
            error: result.error || 'Upload failed',
            success: false,
          });
        }
      } catch (error) {
        setUploadState({
          isUploading: false,
          uploadProgress: 0,
          error: error instanceof Error ? error.message : 'Unexpected error',
          success: false,
        });
      }
    },
    [submissionId, isReadOnly]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isReadOnly) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    if (!submissionId || !certificate) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const blob = await downloadCertificate(submissionId, user.id);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = certificate.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!submissionId || isReadOnly) return;

    const confirmed = window.confirm('Are you sure you want to delete this certificate?');
    if (!confirmed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const success = await deleteCertificate(submissionId, user.id);
      if (success) {
        setCertificate(null);
        setUploadState({
          isUploading: false,
          uploadProgress: 0,
          error: null,
          success: false,
        });
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Reinsurance Certificate</h2>
        <p className="text-gray-400">
          Upload your reinsurance certificate document (PDF, DOC, or DOCX format, max 10MB).
        </p>
      </div>

      {/* Upload Zone */}
      {!certificate && !isReadOnly && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
          } ${uploadState.isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-4">
            {/* File Icon */}
            <svg
              className="w-16 h-16 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>

            <div>
              <p className="text-gray-300 mb-2">
                Drag and drop your file here, or
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={uploadState.isUploading}
                />
                <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors">
                  Browse Files
                </span>
              </label>
            </div>

            <p className="text-sm text-gray-500">
              Supported formats: PDF, DOC, DOCX (Max 10MB)
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Uploading...</span>
            <span className="text-sm text-gray-400">{uploadState.uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadState.success && (
        <div className="mt-4 p-4 bg-green-600/20 border border-green-600 rounded-md">
          <p className="text-green-400">✓ Certificate uploaded successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="mt-4 p-4 bg-red-600/20 border border-red-600 rounded-md">
          <p className="text-red-400">✗ {uploadState.error}</p>
        </div>
      )}

      {/* Existing Certificate Display */}
      {certificate && (
        <div className="mt-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {/* File Icon */}
              <div className="flex-shrink-0">
                <svg
                  className="w-12 h-12 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* File Info */}
              <div>
                <h3 className="text-white font-medium">{certificate.fileName}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Uploaded {new Date(certificate.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                Download
              </button>
              {!isReadOnly && (
                <>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md cursor-pointer transition-colors inline-block">
                      Replace
                    </span>
                  </label>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Read-only message */}
      {isReadOnly && !certificate && (
        <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-md">
          <p className="text-gray-400">No certificate uploaded for this submission.</p>
        </div>
      )}
    </div>
  );
}
