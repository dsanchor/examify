import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsApi } from '../services/api';
import type { AvailableSource } from '../types';

export default function ExamCreate() {
  const navigate = useNavigate();
  const [sources, setSources] = useState<AvailableSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [answerCount, setAnswerCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingDryRun, setCreatingDryRun] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await examsApi.getAvailableSources();
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) => {
      const next = prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId];

      // Remove chapter selections from deselected sources
      if (!next.includes(sourceId)) {
        const source = sources.find((s) => s.id === sourceId);
        if (source) {
          const chapterIdsToRemove = source.chapters.map((c) => c.id);
          setSelectedChapterIds((prevCh) =>
            prevCh.filter((cid) => !chapterIdsToRemove.includes(cid))
          );
        }
      }
      return next;
    });
  };

  const toggleChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const filteredSources = sources.filter((s) =>
    s.title.toLowerCase().includes(sourceFilter.toLowerCase())
  );

  const selectAllVisibleSources = () => {
    const visibleIds = filteredSources.map((s) => s.id);
    setSelectedSourceIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const deselectAllVisibleSources = () => {
    const visibleIds = new Set(filteredSources.map((s) => s.id));
    setSelectedSourceIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    // Clean up chapter selections for deselected sources
    const chapterIdsToRemove = new Set(
      filteredSources.flatMap((s) => s.chapters.map((c) => c.id))
    );
    setSelectedChapterIds((prev) =>
      prev.filter((cid) => !chapterIdsToRemove.has(cid))
    );
  };

  const selectAllChapters = (source: AvailableSource) => {
    const chapterIds = source.chapters.map((c) => c.id);
    setSelectedChapterIds((prev) => [...new Set([...prev, ...chapterIds])]);
  };

  const deselectAllChapters = (source: AvailableSource) => {
    const chapterIds = new Set(source.chapters.map((c) => c.id));
    setSelectedChapterIds((prev) => prev.filter((cid) => !chapterIds.has(cid)));
  };

  const availableQuestionCount = (): number => {
    let count = 0;
    for (const source of sources) {
      if (!selectedSourceIds.includes(source.id)) continue;
      for (const q of source.questions) {
        if (selectedChapterIds.length === 0 || (q.chapterId && selectedChapterIds.includes(q.chapterId))) {
          count++;
        }
      }
    }
    return count;
  };

  const handleDryRun = async () => {
    try {
      setCreatingDryRun(true);
      setError('');
      const exam = await examsApi.createDryRun();
      navigate(`/tests/start/${exam.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dry run exam');
    } finally {
      setCreatingDryRun(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedSourceIds.length === 0) {
      setError('Please select at least one source');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const exam = await examsApi.create({
        title: title.trim(),
        description: description.trim(),
        sourceIds: selectedSourceIds,
        chapterIds: selectedChapterIds.length > 0 ? selectedChapterIds : undefined,
        questionCount,
        answerCount,
      });
      navigate(`/tests/start/${exam.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading available sources...</div>;

  const maxQuestions = availableQuestionCount();

  return (
    <div className="exam-create-page">
      <h1>Create Exam</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {sources.length > 0 && (
        <div className="dry-run-section">
          <div className="dry-run-card card">
            <div className="dry-run-header">
              <span className="dry-run-icon">🎯</span>
              <h2>Certification Dry Run</h2>
            </div>
            <p className="dry-run-description">
              Simulate a real certification exam: 120 questions + 9 reserve, 120 minute timer, 
              questions from all available sources.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg dry-run-button"
              onClick={handleDryRun}
              disabled={creatingDryRun}
            >
              {creatingDryRun ? 'Creating...' : '🚀 Start Dry Run'}
            </button>
          </div>
          <div className="section-divider">
            <span>— or create a custom exam —</span>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="empty-state">
          <p>No ready sources available. Upload and process PDFs first.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="title">Exam Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Practice Exam"
              maxLength={200}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Select Sources *</label>
            <div className="source-toolbar">
              <input
                type="text"
                className="source-filter-input"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                placeholder="🔍 Filter sources..."
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={selectAllVisibleSources}
                disabled={submitting || filteredSources.length === 0}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={deselectAllVisibleSources}
                disabled={submitting || filteredSources.length === 0}
              >
                Deselect All
              </button>
            </div>
            {sourceFilter && (
              <p className="source-filter-count">
                Showing {filteredSources.length} of {sources.length} sources
              </p>
            )}
            <div className="source-selection">
              {filteredSources.map((source) => (
                <div key={source.id} className="source-select-card">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(source.id)}
                      onChange={() => toggleSource(source.id)}
                      disabled={submitting}
                    />
                    <strong>{source.title}</strong>
                    <span className="badge">{source.questions.length} questions</span>
                  </label>

                  {selectedSourceIds.includes(source.id) && (
                    <div className="chapter-selection">
                      <div className="chapter-hint-row">
                        <p className="hint">Select specific chapters (or leave all unchecked for all):</p>
                        <span className="chapter-bulk-actions">
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => selectAllChapters(source)}
                            disabled={submitting}
                          >
                            Select All
                          </button>
                          <span className="btn-link-divider">|</span>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => deselectAllChapters(source)}
                            disabled={submitting}
                          >
                            Deselect All
                          </button>
                        </span>
                      </div>
                      {source.chapters.map((chapter) => (
                        <label key={chapter.id} className="checkbox-label chapter-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedChapterIds.includes(chapter.id)}
                            onChange={() => toggleChapter(chapter.id)}
                            disabled={submitting}
                          />
                          {chapter.title}
                          <span className="badge badge-sm">
                            {source.questions.filter((q) => q.chapterId === chapter.id).length} Q
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="questionCount">
              Number of Questions * (max available: {maxQuestions})
            </label>
            <input
              type="number"
              id="questionCount"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
              min={1}
              max={Math.max(maxQuestions, 1)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="answerCount">Number of Answer Options per Question *</label>
            <input
              type="number"
              id="answerCount"
              value={answerCount}
              onChange={(e) => setAnswerCount(parseInt(e.target.value) || 2)}
              min={2}
              max={6}
              disabled={submitting}
            />
            <p className="hint">Default: 4 options (A, B, C, D). Range: 2-6</p>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || selectedSourceIds.length === 0 || maxQuestions === 0}
            >
              {submitting ? 'Creating...' : 'Create Exam'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/exams')}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
