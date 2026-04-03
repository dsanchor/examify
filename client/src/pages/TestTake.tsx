import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { testsApi } from '../services/api';
import { useTimer } from '../hooks/useTimer';
import type { TestSession, TestAnswer, TestResult } from '../types';

type TestMode = 'all-at-once' | 'one-by-one';

export default function TestTake() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const testMode: TestMode = (location.state as { testMode?: TestMode })?.testMode || 'all-at-once';
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [answers, setAnswers] = useState<Map<string, number | null>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // For one-by-one mode
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) loadSession(id);
  }, [id]);

  const loadSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const data = await testsApi.getSession(sessionId);
      if (data.status !== 'in_progress') {
        navigate(`/tests/${sessionId}/result`, { state: { alreadyCompleted: true } });
        return;
      }
      setSession(data);
      const answerMap = new Map<string, number | null>();
      data.answers.forEach((a) => answerMap.set(a.questionId, a.selectedAnswerIndex));
      setAnswers(answerMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test session');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, optionIndex);
      return next;
    });
  };

  // Auto-save every 30 seconds
  const autoSave = useCallback(async () => {
    if (!id || !session) return;
    const answerArray: TestAnswer[] = Array.from(answers.entries()).map(
      ([questionId, selectedAnswerIndex]) => ({ questionId, selectedAnswerIndex })
    );
    try {
      await testsApi.saveAnswers(id, answerArray);
    } catch {
      // Silent fail for auto-save
    }
  }, [id, session, answers]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  const handleSubmit = async () => {
    if (!id || !window.confirm('Are you sure you want to submit? You cannot change answers after submission.')) return;

    try {
      setSubmitting(true);
      const answerArray: TestAnswer[] = Array.from(answers.entries()).map(
        ([questionId, selectedAnswerIndex]) => ({ questionId, selectedAnswerIndex })
      );
      const result: TestResult = await testsApi.submit(id, answerArray);
      navigate(`/tests/${id}/result`, { state: { result } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbandon = async () => {
    if (!id || !window.confirm('Abandon this test? Your progress will be lost.')) return;
    try {
      await testsApi.abandon(id);
      navigate('/exams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon test');
    }
  };

  if (loading || !session) return <div className="loading">Loading test...</div>;

  if (testMode === 'all-at-once') {
    return (
      <AllAtOnceMode
        session={session}
        answers={answers}
        selectAnswer={selectAnswer}
        onSubmit={handleSubmit}
        onAbandon={handleAbandon}
        submitting={submitting}
        error={error}
      />
    );
  }

  return (
    <OneByOneMode
      session={session}
      answers={answers}
      currentIndex={currentIndex}
      setCurrentIndex={setCurrentIndex}
      selectAnswer={selectAnswer}
      checkedQuestions={checkedQuestions}
      setCheckedQuestions={setCheckedQuestions}
      onSubmit={handleSubmit}
      onAbandon={handleAbandon}
      submitting={submitting}
      error={error}
    />
  );
}

interface AllAtOnceModeProps {
  session: TestSession;
  answers: Map<string, number | null>;
  selectAnswer: (questionId: string, optionIndex: number) => void;
  onSubmit: () => void;
  onAbandon: () => void;
  submitting: boolean;
  error: string;
}

function AllAtOnceMode({
  session,
  answers,
  selectAnswer,
  onSubmit,
  onAbandon,
  submitting,
  error,
}: AllAtOnceModeProps) {
  const { formattedTime, isExpired } = useTimer(session.timeLimitMinutes, session.startedAt);
  const totalQuestions = session.questions.length;
  const answeredCount = Array.from(answers.values()).filter((v) => v !== null).length;
  const mainQuestionsCount = session.questions.filter(q => !q.isReserve).length;

  useEffect(() => {
    if (isExpired) {
      onSubmit();
    }
  }, [isExpired, onSubmit]);

  return (
    <div className="test-take-page">
      <div className="test-toolbar sticky">
        <div className="test-info">
          <h2>{session.examTitle}</h2>
          <span>Answered: {answeredCount}/{totalQuestions}</span>
        </div>
        <div className={`timer ${isExpired ? 'expired' : ''}`}>⏱ {formattedTime}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="all-questions-container">
        {session.questions.map((question, index) => {
          const isReserveSection = question.isReserve && index === mainQuestionsCount;
          
          return (
            <>
              {isReserveSection && (
                <div className="reserve-divider">
                  <span>Reserve Questions</span>
                </div>
              )}
              <div key={question.id} className="question-card" id={`question-${index}`}>
                <div className="question-number">
                  Question {index + 1}
                  {question.isReserve && <span className="reserve-label"> (Reserve)</span>}
                </div>
                <p className="question-text">{question.text}</p>

                <div className="options">
                  {question.options.map((option, oi) => (
                    <label
                      key={oi}
                      className={`option-label ${
                        answers.get(question.id) === oi ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        checked={answers.get(question.id) === oi}
                        onChange={() => selectAnswer(question.id, oi)}
                        disabled={submitting}
                      />
                      <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          );
        })}

        <div className="submit-section">
          <button
            className="btn btn-primary btn-lg"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '✓ Submit Test'}
          </button>
          <button
            className="btn btn-danger"
            onClick={onAbandon}
            disabled={submitting}
          >
            Abandon Test
          </button>
        </div>
      </div>
    </div>
  );
}

interface OneByOneModeProps {
  session: TestSession;
  answers: Map<string, number | null>;
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  selectAnswer: (questionId: string, optionIndex: number) => void;
  checkedQuestions: Set<string>;
  setCheckedQuestions: (fn: (prev: Set<string>) => Set<string>) => void;
  onSubmit: () => void;
  onAbandon: () => void;
  submitting: boolean;
  error: string;
}

function OneByOneMode({
  session,
  answers,
  currentIndex,
  setCurrentIndex,
  selectAnswer,
  checkedQuestions,
  setCheckedQuestions,
  onSubmit,
  onAbandon,
  submitting,
  error,
}: OneByOneModeProps) {
  const { formattedTime, isExpired } = useTimer(session.timeLimitMinutes, session.startedAt);
  const question = session.questions[currentIndex];
  const totalQuestions = session.questions.length;
  const answeredCount = Array.from(answers.values()).filter((v) => v !== null).length;
  const isChecked = checkedQuestions.has(question.id);
  const selectedAnswer = answers.get(question.id);
  const isCorrect = selectedAnswer === question.correctAnswerIndex;

  useEffect(() => {
    if (isExpired) {
      onSubmit();
    }
  }, [isExpired, onSubmit]);

  const handleCheck = () => {
    if (selectedAnswer === null || selectedAnswer === undefined) {
      alert('Please select an answer first');
      return;
    }
    setCheckedQuestions((prev) => new Set(prev).add(question.id));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onSubmit();
    }
  };

  return (
    <div className="test-take-page">
      <div className="test-toolbar sticky">
        <div className="test-info">
          <h2>{session.examTitle}</h2>
          <span>
            Question {currentIndex + 1} of {totalQuestions}
            {question.isReserve && <span className="reserve-label"> (Reserve)</span>}
          </span>
          <span>Answered: {answeredCount}/{totalQuestions}</span>
        </div>
        <div className={`timer ${isExpired ? 'expired' : ''}`}>⏱ {formattedTime}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="test-body">
        <div className="question-panel">
          <div className="question-number">
            Question {currentIndex + 1}
            {question.isReserve && <span className="reserve-label"> (Reserve)</span>}
          </div>
          <p className="question-text">{question.text}</p>

          <div className="options">
            {question.options.map((option, oi) => {
              let optionClass = '';
              if (isChecked) {
                if (oi === question.correctAnswerIndex) {
                  optionClass = 'correct-answer';
                } else if (oi === selectedAnswer && !isCorrect) {
                  optionClass = 'wrong-answer';
                }
              } else if (selectedAnswer === oi) {
                optionClass = 'selected';
              }

              return (
                <label
                  key={oi}
                  className={`option-label ${optionClass}`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={answers.get(question.id) === oi}
                    onChange={() => selectAnswer(question.id, oi)}
                    disabled={submitting || isChecked}
                  />
                  <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                  <span className="option-text">{option}</span>
                  {isChecked && oi === question.correctAnswerIndex && <span className="check-icon">✓</span>}
                  {isChecked && oi === selectedAnswer && !isCorrect && <span className="cross-icon">✗</span>}
                </label>
              );
            })}
          </div>

          {isChecked && (
            <div className={`feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
              <div className="feedback-header">
                {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </div>
              <p className="explanation">💡 {question.explanation}</p>
            </div>
          )}

          <div className="question-nav">
            <button
              className="btn"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            
            {!isChecked ? (
              <button
                className="btn btn-primary"
                onClick={handleCheck}
                disabled={selectedAnswer === null || selectedAnswer === undefined}
              >
                Check Answer
              </button>
            ) : currentIndex < totalQuestions - 1 ? (
              <button
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next Question →
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Finish Test'}
              </button>
            )}
          </div>
        </div>

        <div className="question-navigator">
          <h4>Questions</h4>
          <div className="nav-grid">
            {session.questions.map((q, i) => {
              const isAnswered = answers.get(q.id) !== null && answers.get(q.id) !== undefined;
              const isQChecked = checkedQuestions.has(q.id);
              
              return (
                <button
                  key={q.id}
                  className={`nav-btn ${i === currentIndex ? 'current' : ''} ${
                    isAnswered ? 'answered' : ''
                  } ${isQChecked ? 'checked' : ''}`}
                  onClick={() => setCurrentIndex(i)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="test-actions">
            <button
              className="btn btn-danger btn-sm"
              onClick={onAbandon}
              disabled={submitting}
            >
              Abandon Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
