import { pool } from '../../lib/db.js';
import { hashPassword } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const fullName = String(req.body?.fullName || '').trim();
    const id = String(req.body?.id || '').trim();
    const program = String(req.body?.program || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!fullName || !id || !program || !password) {
      return res.status(400).json({ error: 'Punan ang lahat ng kinakailangang field.' });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Ilagay ang tamang email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Dapat at least 8 characters ang password.' });
    }

    await pool.query(
      `INSERT INTO users (id, full_name, email, program, role, status, password_hash)
       VALUES ($1, $2, $3, $4, 'professor', 'pending', $5)`,
      [id, fullName, email || null, program, hashPassword(password)]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Registered na ang Professor ID na ito.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error. Subukan ulit.' });
  }
}