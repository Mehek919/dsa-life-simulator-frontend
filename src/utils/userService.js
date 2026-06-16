import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

export async function createOrFetchUser(user) {
  try {
    const userRef  = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      console.log('✅ Existing user fetched:', userSnap.data());
      return userSnap.data();
    }

    const newUser = {
      uid:       user.uid,
      name:      user.displayName,
      email:     user.email,
      photoURL:  user.photoURL,
      credits:   100,
      xp:        0,
      level:     1,
      topic:     'Array',
      elo:           1000,
      country:       'Global',
      challengesCreated: 0,
      avgChallengeRating: 0,
      rank:          null,
      weeklyXp:      0,
      weeklyRank:    null,
      following: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, newUser);
    console.log('🆕 New user created:', newUser);
    return newUser;

  } catch (err) {
    console.error('❌ createOrFetchUser error:', err.message);
    return null;
  }
}

export async function followUser(currentUid, targetUid) {
  try {
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayUnion(targetUid),
    });
    console.log(`✅ ${currentUid} followed ${targetUid}`);
  } catch (err) {
    console.error('❌ followUser error:', err.message);
  }
}

export async function unfollowUser(currentUid, targetUid) {
  try {
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayRemove(targetUid),
    });
    console.log(`✅ ${currentUid} unfollowed ${targetUid}`);
  } catch (err) {
    console.error('❌ unfollowUser error:', err.message);
  }
}

