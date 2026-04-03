import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Welcome to Examify</h1>
        <p className="hero-subtitle">
          Generate exams from your PDF study materials using AI. Upload documents, review
          auto-generated questions, create exams, and test your knowledge.
        </p>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📄</div>
          <h3>Upload Sources</h3>
          <p>Upload PDF documents. AI extracts chapters and generates multiple-choice questions automatically.</p>
          <Link to="/sources" className="btn btn-primary">
            Manage Sources
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3>Create Exams</h3>
          <p>Select sources and chapters, choose question count, and generate randomized exams.</p>
          <Link to="/exams" className="btn btn-primary">
            View Exams
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h3>Take Tests</h3>
          <p>Take timed tests, get instant scoring, and review detailed results with explanations.</p>
          <Link to="/history" className="btn btn-primary">
            Test History
          </Link>
        </div>
      </section>
    </div>
  );
}
