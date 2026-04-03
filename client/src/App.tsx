import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SourcesList from './pages/SourcesList';
import SourceUpload from './pages/SourceUpload';
import SourceDetail from './pages/SourceDetail';
import ExamsList from './pages/ExamsList';
import ExamCreate from './pages/ExamCreate';
import TestStart from './pages/TestStart';
import TestTake from './pages/TestTake';
import TestResult from './pages/TestResult';
import TestHistory from './pages/TestHistory';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sources" element={<SourcesList />} />
          <Route path="/sources/upload" element={<SourceUpload />} />
          <Route path="/sources/:id" element={<SourceDetail />} />
          <Route path="/exams" element={<ExamsList />} />
          <Route path="/exams/create" element={<ExamCreate />} />
          <Route path="/tests/start/:examId" element={<TestStart />} />
          <Route path="/tests/:id" element={<TestTake />} />
          <Route path="/tests/:id/result" element={<TestResult />} />
          <Route path="/history" element={<TestHistory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
