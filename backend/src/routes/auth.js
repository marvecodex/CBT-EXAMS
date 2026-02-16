import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, fullName: user.full_name }, env.jwtSecret, {
      expiresIn: '12h'
    });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
        matricNo: user.matric_no
      }
    });
  } catch (err) {
    next(err);
  }
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  matricNo: z.string().min(2)
});

router.post('/register-student', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const created = await query(
      `INSERT INTO users (full_name, email, password_hash, role, matric_no)
       VALUES ($1, $2, $3, 'student', $4)
       RETURNING id, full_name, email, role, matric_no, created_at`,
      [data.fullName, data.email, hash, data.matricNo]
    );

    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email or matric no already exists' });
    next(err);
  }
});

export default router;
