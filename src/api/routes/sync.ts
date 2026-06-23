import { Router } from 'express';
import {
  getSnapshotStatus,
  triggerSnapshotRefresh,
} from '../services/dataSnapshot';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    res.json(await getSnapshotStatus());
  } catch (error) {
    console.error('[sync] status error:', error);
    res.status(500).json({ error: 'Failed to read data sync status' });
  }
});

router.post('/refresh', async (_req, res) => {
  try {
    res.json(await triggerSnapshotRefresh());
  } catch (error) {
    console.error('[sync] refresh error:', error);
    res.status(502).json({
      error: 'Source refresh failed. The latest local data is still available.',
    });
  }
});

export default router;
