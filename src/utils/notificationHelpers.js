
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

/**
 * Subscribe to real-time notifications for a user.
 * Returns the unsubscribe function.
 */
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
 * Mark ALL notifications as read for a user.
 */
export async function markAllAsRead(uid, notifications) {
  if (!uid || !notifications?.length) return;
  try {
    const batch    = writeBatch(db);
    const unread   = notifications.filter((n) => !n.read);
    unread.forEach((n) => {
      const ref = doc(db, 'users', uid, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[markAllAsRead] error:', err);
  }
}
