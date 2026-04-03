import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sourcesApi } from '../services/api';
import type { Source } from '../types';

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  useEffect(() => {
    if (id) loadSource(id);
  }, [id]);

  const loadSource = async (sourceId: string) => {
    try {
      setLoading(true);
      const data = await sourcesApi.getById(sourceId);
      setSource(data);
      setEditTitle(data.title);
      setEditDescription(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      const updated = await sourcesApi.update(id, {
        title: editTitle,
        description: editDescription,
      });
      setSource(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    }
  };

  const handleGenerateQuestions = async (chapterId: string) => {
    if (!id) return;
    try {
      setGeneratingQuestions(true);
      await sourcesApi.addQuestions(id, chapterId, 5);
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!id || !window.confirm('Delete this question?')) return;
    try {
      await sourcesApi.deleteQuestion(id, questionId);
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  // Poll for processing status
  useEffect(() => {
    if (!source || source.status !== 'processing' || !id) return;
    const interval = setInterval(() => loadSource(id), 5000);
    return () => clearInterval(interval);
  }, [source?.status, id]);

  if (loading) return <div className="loading">Loading source...</div>;
  if (!source) return <div className="alert alert-error">Source not found</div>;

  return (
    <div className="source-detail-page">
      <button className="btn btn-back" onClick={() => navigate('/sources')}>
        ← Back to Sources
      </button>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="source-header">
        {editing ? (
          <div className="edit-form">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="edit-title-input"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
            />
            <div className="edit-actions">
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
              <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h1>{source.title}</h1>
            <p>{source.description}</p>
            <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>
          </>
        )}
        <div className="source-meta">
          <span className={`badge badge-${source.status === 'ready' ? 'success' : source.status === 'processing' ? 'warning' : 'error'}`}>
            {source.status}
          </span>
          <span>📄 {source.fileName}</span>
          <span>📚 {source.chapters.length} chapters</span>
          <span>❓ {source.questions.length} questions</span>
        </div>
      </div>

      {source.status === 'processing' && (
        <div className="alert alert-info">
          ⏳ Processing PDF... This page will refresh automatically.
        </div>
      )}

      {source.status === 'error' && (
        <div className="alert alert-error">
          Processing failed: {source.errorMessage}
        </div>
      )}

      {source.status === 'ready' && (
        <div className="chapters-section">
          <h2>Chapters & Questions</h2>
          {source.chapters.map((chapter) => {
            const chapterQuestions = source.questions.filter(
              (q) => q.chapterId === chapter.id
            );
            return (
              <div key={chapter.id} className="chapter-card">
                <div className="chapter-header">
                  <h3>
                    {chapter.order}. {chapter.title}
                  </h3>
                  <span className="badge">{chapterQuestions.length} questions</span>
                </div>
                <p className="chapter-preview">
                  {chapter.content.substring(0, 200)}
                  {chapter.content.length > 200 ? '...' : ''}
                </p>

                <div className="questions-list">
                  {chapterQuestions.map((q, qi) => (
                    <div key={q.id} className="question-item">
                      <div className="question-text">
                        <strong>Q{qi + 1}:</strong> {q.text}
                      </div>
                      <ul className="options-list">
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            className={oi === q.correctAnswerIndex ? 'correct' : ''}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                            {oi === q.correctAnswerIndex && ' ✓'}
                          </li>
                        ))}
                      </ul>
                      <p className="explanation">💡 {q.explanation}</p>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleGenerateQuestions(chapter.id)}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? 'Generating...' : '+ Generate More Questions'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
