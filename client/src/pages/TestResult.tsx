import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { TestResult as TestResultType } from '../types';

export default function TestResult() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const result = (location.state as { result?: TestResultType })?.result;

  if (!result) {
    return (
      <div className="test-result-page">
        <div className="alert alert-info">
          <p>Test session {id} — no result data available.</p>
          <p>This may happen if you revisited this page. Check your test history.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>
          View Test History
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const scoreClass =
    result.score >= 80 ? 'score-high' : result.score >= 60 ? 'score-mid' : 'score-low';

  return (
    <div className="test-result-page">
      <h1>Test Results</h1>

      <div className="result-summary card">
        <h2>{result.examTitle}</h2>
        <div className={`score-display ${scoreClass}`}>
          <span className="score-value">{result.score}%</span>
          <span className="score-label">
            {result.correctAnswers} / {result.totalQuestions} correct
          </span>
        </div>
        <div className="result-meta">
          <span>⏱ Time taken: {formatTime(result.timeTakenSeconds)}</span>
          <span>📅 {new Date(result.completedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="result-details">
        <h2>Question Review</h2>
        {result.questionResults.map((qr, i) => (
          <div
            key={qr.questionId}
            className={`result-question ${qr.isCorrect ? 'correct' : 'incorrect'}`}
          >
            <div className="result-question-header">
              <span className="question-number">Q{i + 1}</span>
              <span className={`result-badge ${qr.isCorrect ? 'badge-success' : 'badge-error'}`}>
                {qr.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </span>
            </div>
            <p className="question-text">{qr.questionText}</p>
            <ul className="result-options">
              {qr.options.map((opt, oi) => {
                let className = '';
                if (oi === qr.correctAnswerIndex) className = 'correct-answer';
                if (oi === qr.selectedAnswerIndex && !qr.isCorrect) className = 'wrong-answer';
                return (
                  <li key={oi} className={className}>
                    {String.fromCharCode(65 + oi)}. {opt}
                    {oi === qr.correctAnswerIndex && ' ✓'}
                    {oi === qr.selectedAnswerIndex && oi !== qr.correctAnswerIndex && ' ✗'}
                  </li>
                );
              })}
              {qr.selectedAnswerIndex === null && (
                <li className="not-answered">⚠ Not answered</li>
              )}
            </ul>
            <p className="explanation">💡 {qr.explanation}</p>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <button className="btn btn-primary" onClick={() => navigate('/exams')}>
          Back to Exams
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/history')}>
          View History
        </button>
      </div>
    </div>
  );
}
