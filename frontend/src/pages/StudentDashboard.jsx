import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    api('/student/exams/available')
      .then(setExams)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h2>Welcome, {user?.fullName}</h2>
          <p>Read exam instructions and ensure stable network before starting.</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h3>Available Exams</h3>
        {exams.map((exam) => (
          <article key={exam.id} className="exam-item">
            <strong>{exam.title}</strong>
            <p>{exam.subject_name} • {exam.duration_minutes} minutes</p>
            <button onClick={() => navigate(`/exam/${exam.id}`)}>Start Exam</button>
          </article>
        ))}
      </section>
    </main>
  );
}
