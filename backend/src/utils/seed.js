import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

(async () => {
  try {
    const hash = await bcrypt.hash('Admin@123', 10);
    const admin = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, matric_no)
       VALUES ('System Admin', 'admin@cbt.local', $1, 'admin', 'ADM-001')
       ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name
       RETURNING id`,
      [hash]
    );

    const adminId = admin.rows[0].id;

    const subject = await pool.query(
      `INSERT INTO subjects (name, created_by)
       VALUES ('General Knowledge', $1)
       ON CONFLICT (name) DO UPDATE SET created_by=EXCLUDED.created_by
       RETURNING id`,
      [adminId]
    );

    const subjectId = subject.rows[0].id;

    const exam = await pool.query(
      `INSERT INTO exams (title, subject_id, duration_minutes, start_time, end_time, status, created_by)
       VALUES ('Sample CBT Entrance Test', $1, 20, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', 'published', $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [subjectId, adminId]
    );

    let examId = exam.rows[0]?.id;
    if (!examId) {
      const existing = await pool.query("SELECT id FROM exams WHERE title='Sample CBT Entrance Test' LIMIT 1");
      examId = existing.rows[0].id;
    }

    const count = await pool.query('SELECT COUNT(*)::int as n FROM questions WHERE exam_id=$1', [examId]);
    if (count.rows[0].n === 0) {
      await pool.query(
        `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
         VALUES
         ($1,'The capital city of Nigeria is?','Lagos','Abuja','Kano','Enugu','B',2),
         ($1,'2 + 2 equals?','3','4','5','6','B',2),
         ($1,'HTML stands for?','Hyper Text Markup Language','HighText Markdown Language','Home Tool Markup Language','Hyperlinks and Text Makeup Language','A',2),
         ($1,'Primary color not among these?','Red','Blue','Green','Yellow','C',2),
         ($1,'Planet known as Red Planet?','Earth','Mars','Jupiter','Venus','B',2)`,
        [examId]
      );
    }

    console.log('Seed completed. Admin login: admin@cbt.local / Admin@123');
  } finally {
    await pool.end();
  }
})();
