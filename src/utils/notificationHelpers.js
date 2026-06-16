import { db } from '../firebase';
import {
  collection,
  doc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
export function subscribeToNotifications(uid, callback) {
  if (!uid) return () => {};

  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(notifications);
  });
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(uid, notifId) {
  if (!uid || !notifId) return;
  try {
    const ref = doc(db, 'users', uid, 'notifications', notifId);
    await updateDoc(ref, { read: true });
  } catch (err) {
    console.error('[markAsRead] error:', err);
  }
}

/**
 * Mark ALL unread notifications as read using a batch write.
 */
export async function markAllAsRead(uid, notifications) {
  if (!uid || !notifications?.length) return;
  try {
    const batch  = writeBatch(db);
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    unread.forEach((n) => {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[markAllAsRead] error:', err);
  }
}

