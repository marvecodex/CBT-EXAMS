import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import ExamPage from './pages/ExamPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import { useAuth } from './contexts/AuthContext.jsx';

const Protected = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/student"
        element={
          <Protected role="student">
            <StudentDashboard />
          </Protected>
        }
      />
      <Route
        path="/exam/:examId"
        element={
          <Protected role="student">
            <ExamPage />
          </Protected>
        }
      />
      <Route
        path="/result/:attemptId"
        element={
          <Protected role="student">
            <ResultPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
