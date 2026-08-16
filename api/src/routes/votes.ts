import { Router } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const router = Router();

function getDb() {
  try {
    return getFirestore();
  } catch (e) {
    return null;
  }
}

// GET votes for an article
router.get('/:articleId', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json([]);
    }
    const votesRef = db.collection('votes')
      .where('articleId', '==', req.params.articleId);

    const snapshot = await votesRef.get();
    const votes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new vote
router.post('/', async (req, res) => {
  try {
    const { articleId, userId, voteType } = req.body; // voteType: 'upvote' or 'downvote'

    if (!articleId || !userId || !voteType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDb();
    if (!db) {
      return res.status(201).json({ id: `vote-${Date.now()}`, articleId, userId, voteType });
    }

    // Check if user already voted on this article
    const existingVote = await db.collection('votes')
      .where('articleId', '==', articleId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingVote.empty) {
      // Update existing vote
      const voteDoc = existingVote.docs[0];
      await voteDoc.ref.update({
        voteType,
        updatedAt: FieldValue.serverTimestamp()
      });
      return res.json({ id: voteDoc.id, articleId, userId, voteType, updatedAt: FieldValue.serverTimestamp() });
    }

    // Create new vote
    const voteData = {
      articleId,
      userId,
      voteType,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('votes').add(voteData);
    res.status(201).json({ id: docRef.id, ...voteData });
  } catch (error) {
    console.error('Error creating vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a vote
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(204).send();
    }
    const voteRef = db.collection('votes').doc(req.params.id);
    const doc = await voteRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    await voteRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;