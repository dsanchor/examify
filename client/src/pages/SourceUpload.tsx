import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { sourcesApi } from '../services/api';

export default function SourceUpload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const source = await sourcesApi.upload(file, title.trim(), description.trim());
      navigate(`/sources/${source.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload source');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        setError('File size must be under 50MB');
        return;
      }
      setFile(selected);
      setError('');
      if (!title) {
        setTitle(selected.name.replace(/\.pdf$/i, ''));
      }
    }
  };

  return (
    <div className="source-upload-page">
      <h1>Upload PDF Source</h1>
      <p className="page-subtitle">
        Upload a PDF document. AI will extract chapters and generate questions automatically.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="file">PDF File *</label>
          <input
            type="file"
            id="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="file-input"
          />
          {file && (
            <p className="file-info">
              Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this source"
            maxLength={200}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of the content"
            rows={3}
            maxLength={2000}
            disabled={loading}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || !file}>
            {loading ? 'Uploading & Processing...' : 'Upload & Process'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/sources')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
