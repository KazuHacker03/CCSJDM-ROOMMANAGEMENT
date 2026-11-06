import { pool } from '../lib/db.js';
import { CURRENT_SEMESTER, DAYS, toMinutes } from '../lib/constants.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const semester = req.query.semester || CURRENT_SEMESTER;
      const { rows } = await pool.query(`
        SELECT id, subject, section, instructor, program, day,
               start_text AS "startTime", end_text AS "endTime", room, semester
          FROM schedules
         WHERE semester = $1
         ORDER BY day, start_min`, [semester]);
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const f = {
        subject:    String(req.body?.subject || '').trim(),
        section:    String(req.body?.section || '').trim(),
        instructor: String(req.body?.instructor || '').trim(),
        program:    String(req.body?.program || '').trim(),
        day:        String(req.body?.day || ''),
        startTime:  String(req.body?.startTime || '').trim(),
        endTime:    String(req.body?.endTime || '').trim(),
        room:       String(req.body?.room || ''),
      };

      if (Object.values(f).some(v => !v)) {
        return res.status(400).json({ error: 'Punan ang lahat ng field.' });
      }
      if (!DAYS.includes(f.day)) return res.status(400).json({ error: 'Invalid day.' });

      const start = toMinutes(f.startTime), end = toMinutes(f.endTime);
      if (start === null || end === null || end <= start) {
        return res.status(400).json({ error: 'Invalid time. Use a format like 9:00 AM.' });
      }

      // Conflict check on the server (the source of truth)
      const conflict = await pool.query(
        `SELECT subject, section, instructor, start_text, end_text
           FROM schedules
          WHERE room = $1 AND day = $2 AND semester = $3
            AND start_min < $5 AND end_min > $4
          LIMIT 1`,
        [f.room, f.day, CURRENT_SEMESTER, start, end]
      );
      if (conflict.rows[0]) {
        const c = conflict.rows[0];
        return res.status(409).json({
          error: `${f.room} is already booked on ${f.day} ${c.start_text}-${c.end_text} (${c.section}).`,
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO schedules
           (subject, section, instructor, program, day, start_text, end_text,
            start_min, end_min, room, semester)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [f.subject, f.section, f.instructor, f.program, f.day,
         f.startTime, f.endTime, start, end, f.room, CURRENT_SEMESTER]
      );
      return res.status(201).json({ ok: true, id: rows[0].id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Room does not exist.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
}