import { pool } from '../../lib/db.js';
import { verifyPassword, hashPassword, needsUpgrade } from '../../lib/auth.js';
import { normalizeRole } from '../../lib/constants.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const id = String(req.body?.id || '').trim();
    const password = String(req.body?.password || '');
    if (!id || !password) return res.status(400).json({ error: 'Ilagay ang ID at password.' });

    const { rows } = await pool.query(
      `SELECT id, full_name, role, status, password_hash
         FROM users WHERE lower(id) = lower($1)`,
      [id]
    );
    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Maling ID o password.' });
    }
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your account was rejected.' });
    if (user.status === 'pending')  return res.status(403).json({ error: 'Waiting for Admin approval.' });

    // Upgrade legacy SHA-256 hash to scrypt after a successful login
    if (needsUpgrade(user.password_hash)) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashPassword(password), user.id]);
    }

    res.json({
      user: {
        id: user.id,
        fullName: user.full_name || user.id,
        role: normalizeRole(user.role),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login error. Please try again.' });
  }
}