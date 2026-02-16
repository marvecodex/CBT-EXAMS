import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

const sessionToken = (() => {
  const existing = sessionStorage.getItem('sessionToken');
  if (existing) return existing;
  const t = crypto.randomUUID();
  sessionStorage.setItem('sessionToken', t);
  return t;
})();

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [warning, setWarning] = useState('');

  const attemptId = payload?.attemptId;

  useEffect(() => {
    api('/student/attempt/start', {
      method: 'POST',
      body: JSON.stringify({ examId: Number(examId), sessionToken })
    })
      .then((data) => {
        setPayload(data);
        const map = {};
        data.answers.forEach((a) => {
          map[a.question_id] = a.selected_option;
        });
        setAnswers(map);
        const start = new Date(data.exam.startTime).getTime();
        const end = start + data.exam.durationMinutes * 60000;
        setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
      })
      .catch((err) => setWarning(err.message));
  }, [examId]);

  useEffect(() => {
    if (!payload) return;
    const timer = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          submitExam(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [payload]);

  useEffect(() => {
    if (!attemptId) return;
    const autosave = setInterval(() => {
      Object.entries(answers).forEach(([questionId, selectedOption]) => {
        api('/student/attempt/answer', {
          method: 'POST',
          body: JSON.stringify({ attemptId, questionId: Number(questionId), selectedOption })
        }).catch(() => {});
      });
    }, 5000);
    return () => clearInterval(autosave);
  }, [attemptId, answers]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && attemptId) {
        setWarning('Warning: Tab switching detected. Event logged.');
        api('/student/attempt/log', {
          method: 'POST',
          body: JSON.stringify({ attemptId, eventType: 'TAB_SWITCH', detail: 'Student changed tab' })
        }).catch(() => {});
      }
    };
    const onContext = (e) => e.preventDefault();
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contextmenu', onContext);
    document.documentElement.requestFullscreen?.().catch(() => {});

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContext);
    };
  }, [attemptId]);

  const submitExam = async (auto = false) => {
    if (!attemptId) return;
    try {
      const res = await api('/student/attempt/submit', {
        method: 'POST',
        body: JSON.stringify({ attemptId })
      });
      navigate(`/result/${res.id}`);
    } catch (err) {
      if (auto || err.message.includes('Already submitted')) navigate(`/result/${attemptId}`);
      else setWarning(err.message);
    }
  };

  const fmt = useMemo(() => {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [timeLeft]);

  if (!payload) return <main className="center-screen">{warning || 'Loading exam...'}</main>;

  return (
    <main className="page">
      <header className="topbar">
        <h2>{payload.exam.title}</h2>
        <h2>Time Left: {fmt}</h2>
      </header>
      {warning && <p className="error">{warning}</p>}
      <section className="card">
        {payload.questions.map((q, i) => (
          <div key={q.id} className="question-block">
            <p><strong>{i + 1}. {q.question_text}</strong></p>
            {['A', 'B', 'C', 'D'].map((op) => (
              <label key={op}>
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[q.id] === op}
                  onChange={() => setAnswers((v) => ({ ...v, [q.id]: op }))}
                />
                {op}. {q[`option_${op.toLowerCase()}`]}
              </label>
            ))}
          </div>
        ))}
      </section>
      <button onClick={() => submitExam(false)}>Submit Exam</button>
    </main>
  );
}
