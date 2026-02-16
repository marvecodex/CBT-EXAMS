import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  enforceAttemptTimer,
  finalizeAttempt,
  getOrCreateAttempt,
  getPublishedExam,
  getShuffledQuestionsForAttempt
} from '../services/examService.js';

const router = Router();
router.use(authenticate, authorize('student'));

router.get('/exams/available', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.id, e.title, e.duration_minutes, e.start_time, e.end_time, s.name AS subject_name
       FROM exams e JOIN subjects s ON s.id=e.subject_id
       WHERE e.status='published' AND NOW() BETWEEN e.start_time AND e.end_time
       ORDER BY e.start_time ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/attempt/start', async (req, res, next) => {
  try {
    const schema = z.object({ examId: z.number(), sessionToken: z.string().min(8) });
    const { examId, sessionToken } = schema.parse(req.body);

    const exam = await getPublishedExam(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found/published' });

    const now = new Date();
    if (now < new Date(exam.start_time) || now > new Date(exam.end_time)) {
      return res.status(403).json({ message: 'Exam is outside active window' });
    }

    let attempt = await getOrCreateAttempt(examId, req.user.id, sessionToken);
    attempt = await enforceAttemptTimer(attempt);
    if (attempt.status !== 'in_progress') return res.status(409).json({ message: 'Attempt already submitted' });

    const questions = await getShuffledQuestionsForAttempt(examId, attempt.id);
    const answers = await query('SELECT question_id, selected_option FROM answers WHERE attempt_id = $1', [attempt.id]);

    res.json({
      attemptId: attempt.id,
      exam: {
        id: exam.id,
        title: exam.title,
        subjectName: exam.subject_name,
        durationMinutes: exam.duration_minutes,
        startTime: attempt.start_time
      },
      questions,
      answers: answers.rows
    });
  } catch (err) {
    next(err);
  }
});

router.post('/attempt/answer', async (req, res, next) => {
  try {
    const schema = z.object({
      attemptId: z.number(),
      questionId: z.number(),
      selectedOption: z.enum(['A', 'B', 'C', 'D'])
    });
    const { attemptId, questionId, selectedOption } = schema.parse(req.body);

    const atRes = await query('SELECT * FROM exam_attempts WHERE id=$1 AND student_id=$2', [attemptId, req.user.id]);
    let attempt = atRes.rows[0];
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    attempt = await enforceAttemptTimer(attempt);
    if (attempt.status !== 'in_progress') return res.status(409).json({ message: 'Attempt already closed' });

    const qRes = await query('SELECT correct_option FROM questions WHERE id = $1', [questionId]);
    if (!qRes.rows[0]) return res.status(404).json({ message: 'Question not found' });

    const isCorrect = qRes.rows[0].correct_option === selectedOption;

    await query(
      `INSERT INTO answers (attempt_id, question_id, selected_option, is_correct)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET selected_option = EXCLUDED.selected_option, is_correct=EXCLUDED.is_correct`,
      [attemptId, questionId, selectedOption, isCorrect]
    );

    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
});

router.post('/attempt/log', async (req, res, next) => {
  try {
    const schema = z.object({ attemptId: z.number(), eventType: z.string().min(3), detail: z.string().optional() });
    const { attemptId, eventType, detail } = schema.parse(req.body);
    await query(
      'INSERT INTO attempt_events (attempt_id, event_type, detail) VALUES ($1, $2, $3)',
      [attemptId, eventType, detail || null]
    );
    res.status(201).json({ message: 'Event logged' });
  } catch (err) {
    next(err);
  }
});

router.post('/attempt/submit', async (req, res, next) => {
  try {
    const schema = z.object({ attemptId: z.number() });
    const { attemptId } = schema.parse(req.body);

    const atRes = await query('SELECT * FROM exam_attempts WHERE id=$1 AND student_id=$2', [attemptId, req.user.id]);
    const attempt = atRes.rows[0];
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    if (attempt.status !== 'in_progress') return res.status(409).json({ message: 'Already submitted' });

    const finalized = await finalizeAttempt(attemptId, 'submitted');
    res.json(finalized);
  } catch (err) {
    next(err);
  }
});

router.get('/attempt/result', async (req, res, next) => {
  try {
    const attemptId = Number(req.query.attemptId);
    const { rows } = await query(
      `SELECT ea.id, ea.score, ea.status, ea.start_time, ea.end_time, e.title, e.duration_minutes,
        (SELECT COALESCE(SUM(marks),0) FROM questions WHERE exam_id=e.id) AS total_marks
       FROM exam_attempts ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.id = $1 AND ea.student_id = $2`,
      [attemptId, req.user.id]
    );
    const result = rows[0];
    if (!result) return res.status(404).json({ message: 'Result not found' });
    if (result.status === 'in_progress') return res.status(409).json({ message: 'Attempt still in progress' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
