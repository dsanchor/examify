import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi, testsApi } from '../services/api';
import type { Exam } from '../types';

export default function TestStart() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [testMode, setTestMode] = useState<'all-at-once' | 'one-by-one'>('all-at-once');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (examId) loadExam(examId);
  }, [examId]);

  const loadExam = async (id: string) => {
    try {
      setLoading(true);
      const data = await examsApi.getById(id);
      setExam(data);
      // If it's a dry run, preset the timer to 120 minutes
      if (data.isDryRun) {
        setTimeLimitMinutes(120);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!examId) return;

    try {
      setStarting(true);
      const session = await testsApi.start(examId, timeLimitMinutes);
      navigate(`/tests/${session.id}`, { state: { testMode } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="loading">Loading exam...</div>;
  if (!exam) return <div className="alert alert-error">Exam not found</div>;

  const mainQuestions = exam.isDryRun ? 120 : exam.questions.length;
  const reserveQuestions = exam.isDryRun ? exam.questions.length - 120 : 0;

  return (
    <div className="test-start-page">
      <h1>Start Test</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="exam-summary card">
        {exam.isDryRun && (
          <div className="dry-run-badge">
            <span className="badge badge-primary">🎯 Dry Run</span>
          </div>
        )}
        <h2>{exam.title}</h2>
        {exam.description && <p>{exam.description}</p>}
        <div className="card-meta">
          {exam.isDryRun ? (
            <>
              <span>❓ {mainQuestions} main questions + {reserveQuestions} reserve</span>
              <span>⏱ 120 minutes</span>
            </>
          ) : (
            <>
              <span>❓ {exam.questions.length} questions</span>
              <span>📅 Created {new Date(exam.createdAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleStart} className="form">
        <div className="form-group">
          <label htmlFor="timeLimit">Time Limit (minutes)</label>
          <input
            type="number"
            id="timeLimit"
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 1)}
            min={1}
            max={300}
            disabled={starting || exam.isDryRun}
            readOnly={exam.isDryRun}
          />
          {exam.isDryRun ? (
            <p className="hint">⏱ Fixed at 120 minutes for dry run exams</p>
          ) : (
            <p className="hint">
              Recommended: ~{Math.ceil(exam.questions.length * 1.5)} minutes
              ({exam.questions.length} questions × 1.5 min each)
            </p>
          )}
        </div>

        <div className="form-group">
          <label>Test Mode *</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="testMode"
                value="all-at-once"
                checked={testMode === 'all-at-once'}
                onChange={(e) => setTestMode(e.target.value as 'all-at-once')}
                disabled={starting}
              />
              <div className="radio-content">
                <strong>All at once</strong>
                <span className="radio-description">Answer all questions, see results at the end</span>
              </div>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="testMode"
                value="one-by-one"
                checked={testMode === 'one-by-one'}
                onChange={(e) => setTestMode(e.target.value as 'one-by-one')}
                disabled={starting}
              />
              <div className="radio-content">
                <strong>One by one</strong>
                <span className="radio-description">See the correct answer after each question</span>
              </div>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={starting}>
            {starting ? 'Starting...' : '🚀 Start Test'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/exams')}
            disabled={starting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
