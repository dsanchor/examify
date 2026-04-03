import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sourcesApi } from '../services/api';
import type { Source } from '../types';

export default function SourcesList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const result = await sourcesApi.list();
      setSources(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this source?')) return;
    try {
      await sourcesApi.delete(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusBadge = (status: Source['status']) => {
    const classes: Record<string, string> = {
      ready: 'badge badge-success',
      processing: 'badge badge-warning',
      error: 'badge badge-error',
    };
    return <span className={classes[status] || 'badge'}>{status}</span>;
  };

  if (loading) return <div className="loading">Loading sources...</div>;

  return (
    <div className="sources-list-page">
      <div className="page-header">
        <h1>Sources</h1>
        <Link to="/sources/upload" className="btn btn-primary">
          + Upload PDF
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {sources.length === 0 ? (
        <div className="empty-state">
          <p>No sources yet. Upload a PDF to get started.</p>
          <Link to="/sources/upload" className="btn btn-primary">
            Upload Your First PDF
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {sources.map((source) => (
            <div key={source.id} className="card">
              <div className="card-header">
                <h3>{source.title}</h3>
                {statusBadge(source.status)}
              </div>
              <p className="card-description">{source.description || 'No description'}</p>
              <div className="card-meta">
                <span>📄 {source.fileName}</span>
                <span>💾 {formatFileSize(source.fileSize)}</span>
                <span>📚 {source.chapters.length} chapters</span>
                <span>❓ {source.questions.length} questions</span>
              </div>
              <div className="card-actions">
                <Link to={`/sources/${source.id}`} className="btn btn-sm">
                  View Details
                </Link>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(source.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
