import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StepReinsuranceCertificate } from '../pages/wizard/steps/StepReinsuranceCertificate';
import * as uploadCertModule from '../lib/uploadCertificate';
import { supabase } from '../lib/supabase';

// Mock modules
vi.mock('../lib/uploadCertificate');
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('../context/SubmissionMeta', () => ({
  useSubmissionMeta: () => ({
    isReadOnly: false,
    classOfBusiness: 'Property',
    lineOfBusiness: 'Fire & Allied Perils',
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ submissionId: 'test-submission-id' }),
  };
});

describe('StepReinsuranceCertificate', () => {
  const mockUser = { id: 'test-user-id' };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
    (uploadCertModule.getCertificate as any).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Type Validation', () => {
    it('accepts PDF files', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: true,
        fileUrl: 'https://example.com/cert.pdf',
        certificateId: 1,
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(uploadCertModule.uploadCertificate).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'certificate.pdf', type: 'application/pdf' }),
          'test-submission-id',
          'test-user-id'
        );
      });
    });

    it('accepts DOC files', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: true,
        fileUrl: 'https://example.com/cert.doc',
        certificateId: 1,
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.doc', { type: 'application/msword' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(uploadCertModule.uploadCertificate).toHaveBeenCalled();
      });
    });

    it('accepts DOCX files', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: true,
        fileUrl: 'https://example.com/cert.docx',
        certificateId: 1,
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(uploadCertModule.uploadCertificate).toHaveBeenCalled();
      });
    });

    it('rejects invalid file types', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: false,
        error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.',
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Upload Functionality', () => {
    it('displays upload progress during upload', async () => {
      const user = userEvent.setup();
      
      // Simulate slow upload
      (uploadCertModule.uploadCertificate as any).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({ success: true, fileUrl: 'https://example.com/cert.pdf', certificateId: 1 }), 1000);
        })
      );

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      // Check for progress indicator
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('shows success message after successful upload', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: true,
        fileUrl: 'https://example.com/cert.pdf',
        certificateId: 1,
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument();
      });
    });

    it('displays error message on upload failure', async () => {
      const user = userEvent.setup();
      (uploadCertModule.uploadCertificate as any).mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Existing Certificate Display', () => {
    it('displays existing certificate if already uploaded', async () => {
      (uploadCertModule.getCertificate as any).mockResolvedValue({
        id: 1,
        submission_id: 'test-submission-id',
        user_id: 'test-user-id',
        file_name: 'existing-cert.pdf',
        file_url: 'https://example.com/existing-cert.pdf',
        file_size: 1024000,
        content_type: 'application/pdf',
        uploaded_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('existing-cert.pdf')).toBeInTheDocument();
      });
    });

    it('shows download button for existing certificate', async () => {
      (uploadCertModule.getCertificate as any).mockResolvedValue({
        id: 1,
        submission_id: 'test-submission-id',
        user_id: 'test-user-id',
        file_name: 'existing-cert.pdf',
        file_url: 'https://example.com/existing-cert.pdf',
        file_size: 1024000,
        content_type: 'application/pdf',
        uploaded_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/download/i)).toBeInTheDocument();
      });
    });

    it('shows replace and delete buttons for existing certificate', async () => {
      (uploadCertModule.getCertificate as any).mockResolvedValue({
        id: 1,
        submission_id: 'test-submission-id',
        user_id: 'test-user-id',
        file_name: 'existing-cert.pdf',
        file_url: 'https://example.com/existing-cert.pdf',
        file_size: 1024000,
        content_type: 'application/pdf',
        uploaded_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/replace/i)).toBeInTheDocument();
        expect(screen.getByText(/delete/i)).toBeInTheDocument();
      });
    });
  });

  describe('Autosave Integration', () => {
    it('autosaves file metadata to database on successful upload', async () => {
      const user = userEvent.setup();
      const mockUpload = vi.fn().mockResolvedValue({
        success: true,
        fileUrl: 'https://example.com/cert.pdf',
        certificateId: 1,
      });
      (uploadCertModule.uploadCertificate as any) = mockUpload;

      render(
        <BrowserRouter>
          <StepReinsuranceCertificate />
        </BrowserRouter>
      );

      const file = new File(['mock content'], 'certificate.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/browse files/i).closest('label')?.querySelector('input');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(
          expect.any(File),
          'test-submission-id',
          'test-user-id'
        );
      });
    });
  });
});
