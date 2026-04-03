import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examsApi } from '../services/api';
import type { Exam } from '../types';

export default function ExamsList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const result = await examsApi.list();
      setExams(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examsApi.delete(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exam');
    }
  };

  if (loading) return <div className="loading">Loading exams...</div>;

  return (
    <div className="exams-list-page">
      <div className="page-header">
        <h1>Exams</h1>
        <Link to="/exams/create" className="btn btn-primary">
          + Create Exam
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams yet. Create one from your uploaded sources.</p>
          <Link to="/exams/create" className="btn btn-primary">
            Create Your First Exam
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {exams.map((exam) => (
            <div key={exam.id} className="card">
              <div className="card-header">
                <h3>{exam.title}</h3>
              </div>
              <p className="card-description">{exam.description || 'No description'}</p>
              <div className="card-meta">
                <span>❓ {exam.questions.length} questions</span>
                <span>📚 {exam.sourceIds.length} source(s)</span>
                <span>📅 {new Date(exam.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="card-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => navigate(`/tests/start/${exam.id}`)}
                >
                  Take Test
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(exam.id)}
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
