import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api(`/student/attempt/result?attemptId=${attemptId}`)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [attemptId]);

  if (error) return <main className="center-screen error">{error}</main>;
  if (!result) return <main className="center-screen">Loading result...</main>;

  return (
    <main className="center-screen">
      <section className="card">
        <h1>Result</h1>
        <p>Exam: {result.title}</p>
        <p>Score: {result.score} / {result.total_marks}</p>
        <p>Status: {result.status}</p>
        <button onClick={() => navigate('/student')}>Back to Dashboard</button>
      </section>
    </main>
  );
}
