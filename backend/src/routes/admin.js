import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.post('/subjects', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(2) });
    const { name } = schema.parse(req.body);
    const created = await query(
      'INSERT INTO subjects (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/subjects', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM subjects ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/exams', async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(3),
      subjectId: z.number(),
      durationMinutes: z.number().min(1),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      status: z.enum(['draft', 'published']).default('draft')
    });
    const data = schema.parse(req.body);
    const created = await query(
      `INSERT INTO exams (title, subject_id, duration_minutes, start_time, end_time, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.title,
        data.subjectId,
        data.durationMinutes,
        data.startTime,
        data.endTime,
        data.status,
        req.user.id
      ]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/exams', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.*, s.name as subject_name
       FROM exams e JOIN subjects s ON s.id = e.subject_id
       ORDER BY e.id DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/questions/bulk', async (req, res, next) => {
  try {
    const schema = z.object({
      examId: z.number(),
      questions: z
        .array(
          z.object({
            questionText: z.string().min(5),
            optionA: z.string(),
            optionB: z.string(),
            optionC: z.string(),
            optionD: z.string(),
            correctOption: z.enum(['A', 'B', 'C', 'D']),
            marks: z.number().min(1)
          })
        )
        .min(1)
    });

    const { examId, questions } = schema.parse(req.body);
    for (const q of questions) {
      await query(
        `INSERT INTO questions
        (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [examId, q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, q.marks]
      );
    }

    res.status(201).json({ message: `${questions.length} questions uploaded` });
  } catch (err) {
    next(err);
  }
});

router.get('/results/:examId', async (req, res, next) => {
  try {
    const examId = Number(req.params.examId);
    const { rows } = await query(
      `SELECT ea.id as attempt_id, u.full_name, u.matric_no, ea.start_time, ea.end_time, ea.score, ea.status
       FROM exam_attempts ea
       JOIN users u ON u.id = ea.student_id
       WHERE ea.exam_id = $1 AND ea.status <> 'in_progress'
       ORDER BY ea.score DESC, ea.end_time ASC`,
      [examId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/results/:examId/export', async (req, res, next) => {
  try {
    const examId = Number(req.params.examId);
    const { rows } = await query(
      `SELECT u.full_name, u.matric_no, ea.score, ea.status, ea.end_time
       FROM exam_attempts ea JOIN users u ON u.id=ea.student_id
       WHERE ea.exam_id=$1 AND ea.status <> 'in_progress' ORDER BY ea.score DESC`,
      [examId]
    );
    const header = 'Full Name,Matric No,Score,Status,End Time';
    const csv = [header, ...rows.map((r) => `${r.full_name},${r.matric_no},${r.score},${r.status},${r.end_time}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam-${examId}-results.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
