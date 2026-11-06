import { pool } from '../lib/db.js';
import { CURRENT_SEMESTER, toMinutes, DAYS } from '../lib/constants.js';

// GET /api/rooms                              -> all rooms
// GET /api/rooms?day=Monday&start=9:00 AM&end=10:30 AM -> rooms with a `free` flag
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { day, start, end, semester = CURRENT_SEMESTER } = req.query;

    if (!day && !start && !end) {
      const { rows } = await pool.query(
        'SELECT name, floor, capacity, kind FROM rooms ORDER BY floor, name');
      return res.json(rows);
    }

    const s = toMinutes(start), e = toMinutes(end);
    if (!DAYS.includes(day) || s === null || e === null || e <= s) {
      return res.status(400).json({ error: 'Invalid day or time. Use a format like 9:00 AM.' });
    }

    const { rows } = await pool.query(
      `SELECT r.name, r.floor, r.capacity, r.kind,
              NOT EXISTS (
                SELECT 1 FROM schedules sc
                 WHERE sc.room = r.name
                   AND sc.day = $1
                   AND sc.semester = $4
                   AND sc.start_min < $3
                   AND sc.end_min   > $2
              ) AS free
         FROM rooms r
        ORDER BY r.floor, r.name`,
      [day, s, e, semester]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}