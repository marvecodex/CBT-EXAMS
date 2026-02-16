import { query } from '../config/db.js';

export const getPublishedExam = async (examId) => {
  const { rows } = await query(
    `SELECT e.*, s.name as subject_name
     FROM exams e
     JOIN subjects s ON s.id = e.subject_id
     WHERE e.id = $1 AND e.status = 'published'`,
    [examId]
  );
  return rows[0];
};

export const getOrCreateAttempt = async (examId, studentId, sessionToken) => {
  const existing = await query(
    `SELECT * FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 ORDER BY id DESC LIMIT 1`,
    [examId, studentId]
  );

  if (existing.rows[0]) {
    const attempt = existing.rows[0];
    if (attempt.status !== 'in_progress') return attempt;
    if (attempt.session_token !== sessionToken) {
      const err = new Error('Attempt locked to another session');
      err.status = 409;
      throw err;
    }
    return attempt;
  }

  const created = await query(
    `INSERT INTO exam_attempts (exam_id, student_id, start_time, status, session_token)
     VALUES ($1, $2, NOW(), 'in_progress', $3)
     RETURNING *`,
    [examId, studentId, sessionToken]
  );
  return created.rows[0];
};

export const getShuffledQuestionsForAttempt = async (examId, attemptId) => {
  const stored = await query(
    `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks
     FROM attempt_question_order aq
     JOIN questions q ON q.id = aq.question_id
     WHERE aq.attempt_id = $1
     ORDER BY aq.position ASC`,
    [attemptId]
  );

  if (stored.rowCount > 0) return stored.rows;

  const fetched = await query(
    `SELECT id, question_text, option_a, option_b, option_c, option_d, marks
     FROM questions WHERE exam_id = $1 ORDER BY RANDOM()`,
    [examId]
  );

  for (let i = 0; i < fetched.rows.length; i += 1) {
    await query(
      `INSERT INTO attempt_question_order (attempt_id, question_id, position) VALUES ($1, $2, $3)`,
      [attemptId, fetched.rows[i].id, i]
    );
  }

  return fetched.rows;
};

export const finalizeAttempt = async (attemptId, status = 'submitted') => {
  const scoreRes = await query(
    `SELECT COALESCE(SUM(CASE WHEN a.is_correct THEN q.marks ELSE 0 END), 0) AS score
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.attempt_id = $1`,
    [attemptId]
  );

  const score = Number(scoreRes.rows[0].score || 0);

  const updated = await query(
    `UPDATE exam_attempts
     SET end_time = NOW(), score = $2, status = $3
     WHERE id = $1
     RETURNING *`,
    [attemptId, score, status]
  );

  return updated.rows[0];
};

export const enforceAttemptTimer = async (attempt) => {
  if (attempt.status !== 'in_progress') return attempt;
  const examRes = await query('SELECT duration_minutes FROM exams WHERE id = $1', [attempt.exam_id]);
  const duration = Number(examRes.rows[0].duration_minutes);
  const expiresAt = new Date(new Date(attempt.start_time).getTime() + duration * 60000);
  if (new Date() > expiresAt) {
    return finalizeAttempt(attempt.id, 'auto_submitted');
  }
  return attempt;
};
