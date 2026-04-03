import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sourcesApi, chaptersApi, questionsApi } from '../services/api';
import type { Source, Chapter } from '../types';

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

  // Chapter management state
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [chapterFilter, setChapterFilter] = useState<string>('all');

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

  // Chapter CRUD handlers
  const handleAddChapter = async () => {
    if (!id || !newChapterTitle.trim()) return;
    try {
      setAddingChapter(true);
      await chaptersApi.add(id, newChapterTitle.trim());
      setNewChapterTitle('');
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add chapter');
    } finally {
      setAddingChapter(false);
    }
  };

  const handleUpdateChapter = async (chapterId: string) => {
    if (!id || !editChapterTitle.trim()) return;
    try {
      await chaptersApi.update(id, chapterId, { title: editChapterTitle.trim() });
      setEditingChapterId(null);
      setEditChapterTitle('');
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!id || !window.confirm('Delete this chapter? Questions linked to it will become unassigned.')) return;
    try {
      await chaptersApi.delete(id, chapterId);
      if (chapterFilter === chapterId) setChapterFilter('all');
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chapter');
    }
  };

  const startEditChapter = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditChapterTitle(chapter.title);
  };

  const handleLinkChapter = async (questionId: string, chapterId: string | null) => {
    if (!id) return;
    try {
      await questionsApi.linkChapter(id, questionId, chapterId);
      await loadSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question chapter');
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

  const sortedChapters = [...source.chapters].sort((a, b) => a.order - b.order);

  // Filter questions based on chapter filter
  const filteredQuestions = source.questions.filter((q) => {
    if (chapterFilter === 'all') return true;
    if (chapterFilter === 'unassigned') return !q.chapterId;
    return q.chapterId === chapterFilter;
  });

  const getChapterTitle = (chapterId?: string | null) => {
    if (!chapterId) return null;
    return source.chapters.find((c) => c.id === chapterId)?.title ?? null;
  };

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
        <>
          {/* Chapter Management Section */}
          <div className="chapter-mgmt-section">
            <h2>📚 Chapters</h2>
            <div className="chapter-add-form">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="New chapter title..."
                className="chapter-add-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddChapter}
                disabled={addingChapter || !newChapterTitle.trim()}
              >
                {addingChapter ? 'Adding...' : '+ Add Chapter'}
              </button>
            </div>

            {sortedChapters.length === 0 ? (
              <p className="chapter-empty">No chapters yet. Add one above to organize your questions.</p>
            ) : (
              <div className="chapter-list">
                {sortedChapters.map((chapter) => {
                  const questionCount = source.questions.filter((q) => q.chapterId === chapter.id).length;
                  return (
                    <div key={chapter.id} className="chapter-mgmt-item">
                      {editingChapterId === chapter.id ? (
                        <div className="chapter-edit-row">
                          <input
                            type="text"
                            value={editChapterTitle}
                            onChange={(e) => setEditChapterTitle(e.target.value)}
                            className="chapter-edit-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateChapter(chapter.id);
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            autoFocus
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateChapter(chapter.id)}>Save</button>
                          <button className="btn btn-sm" onClick={() => setEditingChapterId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="chapter-display-row">
                          <span className="chapter-order">{chapter.order}.</span>
                          <span className="chapter-title">{chapter.title}</span>
                          <span className="badge badge-sm">{questionCount} Q</span>
                          <div className="chapter-actions">
                            <button className="btn btn-sm" onClick={() => startEditChapter(chapter)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteChapter(chapter.id)}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Questions Section */}
          <div className="chapters-section">
            <div className="questions-header">
              <h2>❓ Questions ({filteredQuestions.length})</h2>
              <div className="chapter-filter">
                <label htmlFor="chapter-filter">Filter by chapter:</label>
                <select
                  id="chapter-filter"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  className="chapter-filter-select"
                >
                  <option value="all">All chapters</option>
                  <option value="unassigned">No chapter</option>
                  {sortedChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Questions per Chapter */}
            {sortedChapters.length > 0 && (
              <div className="generate-questions-bar">
                {sortedChapters.map((ch) => (
                  <button
                    key={ch.id}
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleGenerateQuestions(ch.id)}
                    disabled={generatingQuestions}
                  >
                    {generatingQuestions ? '...' : `+ Questions for "${ch.title}"`}
                  </button>
                ))}
              </div>
            )}

            {filteredQuestions.length === 0 ? (
              <div className="empty-state">
                <p>No questions {chapterFilter !== 'all' ? 'in this filter' : 'yet'}.</p>
              </div>
            ) : (
              <div className="questions-list">
                {filteredQuestions.map((q, qi) => {
                  const chapterTitle = getChapterTitle(q.chapterId);
                  return (
                    <div key={q.id} className="question-item">
                      <div className="question-top-row">
                        <div className="question-text">
                          <strong>Q{qi + 1}:</strong> {q.text}
                        </div>
                        <div className="question-chapter-assign">
                          <select
                            value={q.chapterId || ''}
                            onChange={(e) => handleLinkChapter(q.id, e.target.value || null)}
                            className="chapter-select"
                            title="Assign to chapter"
                          >
                            <option value="">No chapter</option>
                            {sortedChapters.map((ch) => (
                              <option key={ch.id} value={ch.id}>{ch.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {chapterTitle && (
                        <span className="badge badge-sm question-chapter-badge">📚 {chapterTitle}</span>
                      )}
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
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
