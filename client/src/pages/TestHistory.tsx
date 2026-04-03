import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsApi } from '../services/api';
import type { TestSession } from '../types';

export default function TestHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const result = await testsApi.history();
      setSessions(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test history');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (session: TestSession): string => {
    if (!session.completedAt) return 'N/A';
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.completedAt).getTime();
    const seconds = Math.round((end - start) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getScore = (session: TestSession): string => {
    const correct = session.answers.filter((a, i) => {
      const q = session.questions[i];
      return q && a.selectedAnswerIndex === q.correctAnswerIndex;
    }).length;
    const total = session.questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return `${correct}/${total} (${pct}%)`;
  };

  if (loading) return <div className="loading">Loading test history...</div>;

  return (
    <div className="test-history-page">
      <div className="page-header">
        <h1>Test History</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No completed tests yet. Take an exam to see your results here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/exams')}>
            View Exams
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Score</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="clickable-row"
                  onClick={() => navigate(`/tests/${session.id}/result`)}
                >
                  <td>{session.examTitle}</td>
                  <td>{getScore(session)}</td>
                  <td>{formatDuration(session)}</td>
                  <td>
                    {session.completedAt
                      ? new Date(session.completedAt).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        session.status === 'completed'
                          ? 'badge-success'
                          : session.status === 'abandoned'
                          ? 'badge-error'
                          : 'badge-warning'
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
