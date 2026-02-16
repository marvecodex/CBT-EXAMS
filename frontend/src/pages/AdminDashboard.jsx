import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState('');
  const [examForm, setExamForm] = useState({
    title: '',
    subjectId: '',
    durationMinutes: 60,
    startTime: '',
    endTime: '',
    status: 'draft'
  });

  const load = async () => {
    const [subjectData, examData] = await Promise.all([api('/admin/subjects'), api('/admin/exams')]);
    setSubjects(subjectData);
    setExams(examData);
  };

  useEffect(() => {
    load();
  }, []);

  const createSubject = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    await api('/admin/subjects', { method: 'POST', body: JSON.stringify({ name }) });
    e.target.reset();
    load();
  };

  const createExam = async (e) => {
    e.preventDefault();
    await api('/admin/exams', {
      method: 'POST',
      body: JSON.stringify({
        ...examForm,
        subjectId: Number(examForm.subjectId),
        durationMinutes: Number(examForm.durationMinutes),
        startTime: new Date(examForm.startTime).toISOString(),
        endTime: new Date(examForm.endTime).toISOString()
      })
    });
    setMsg('Exam created');
    load();
  };

  const uploadQuestions = async (examId) => {
    const sample = [
      {
        questionText: 'Sample question?',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
        marks: 2
      }
    ];
    await api('/admin/questions/bulk', { method: 'POST', body: JSON.stringify({ examId, questions: sample }) });
    setMsg('Sample question uploaded');
  };

  const fetchResults = async (examId) => {
    const data = await api(`/admin/results/${examId}`);
    setResults(data);
  };

  return (
    <main className="page">
      <header className="topbar">
        <h2>Admin Dashboard</h2>
        <button onClick={logout}>Logout</button>
      </header>
      {msg && <p>{msg}</p>}
      <section className="grid">
        <form className="card" onSubmit={createSubject}>
          <h3>Create Subject</h3>
          <input name="name" placeholder="Subject name" required />
          <button>Create</button>
        </form>

        <form className="card" onSubmit={createExam}>
          <h3>Create Exam Wizard</h3>
          <input placeholder="Exam title" onChange={(e) => setExamForm((v) => ({ ...v, title: e.target.value }))} required />
          <select onChange={(e) => setExamForm((v) => ({ ...v, subjectId: e.target.value }))} required>
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input type="number" min="1" placeholder="Duration (minutes)" onChange={(e) => setExamForm((v) => ({ ...v, durationMinutes: e.target.value }))} />
          <input type="datetime-local" onChange={(e) => setExamForm((v) => ({ ...v, startTime: e.target.value }))} required />
          <input type="datetime-local" onChange={(e) => setExamForm((v) => ({ ...v, endTime: e.target.value }))} required />
          <select onChange={(e) => setExamForm((v) => ({ ...v, status: e.target.value }))}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button>Create Exam</button>
        </form>
      </section>

      <section className="card">
        <h3>Exams</h3>
        <table>
          <thead>
            <tr>
              <th>Title</th><th>Subject</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id}>
                <td>{exam.title}</td>
                <td>{exam.subject_name}</td>
                <td>{exam.status}</td>
                <td>
                  <button onClick={() => uploadQuestions(exam.id)}>Upload Sample Question</button>
                  <button onClick={() => fetchResults(exam.id)}>View Results</button>
                  <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/results/${exam.id}/export`} target="_blank">Export CSV</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Results Table</h3>
        <table>
          <thead><tr><th>Name</th><th>Matric</th><th>Score</th><th>Status</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.attempt_id}><td>{r.full_name}</td><td>{r.matric_no}</td><td>{r.score}</td><td>{r.status}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
