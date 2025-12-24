import { INITIAL_STATE } from '../constants';
import { AppState, SchoolGroup, User, UserRole } from '../types';
import { auth, db, googleProvider } from './firebaseConfig';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail, 
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

// --- CONFIGURATION ---
const USE_REAL_BACKEND = false; 
const API_URL = 'http://localhost:5000/api';

const STORAGE_PREFIX = 'neon_schedule_';
const KEY_USERS = `${STORAGE_PREFIX}users`;
const KEY_GROUPS = `${STORAGE_PREFIX}groups`;
const KEY_SESSION = `${STORAGE_PREFIX}session`;
const KEY_PERSONAL_DATA = `${STORAGE_PREFIX}personal_data`;

// --- Circuit Breaker for Firestore ---
// If the project is in Datastore mode, Firestore throws 'failed-precondition'.
// We catch this and disable cloud sync for the session to stop errors.
let isFirestoreAvailable = true;

const handleFirestoreError = (e: any) => {
  // Check for specific error codes indicating structural/connection issues
  if (e.code === 'failed-precondition' || e.message?.includes('Datastore Mode')) {
    console.warn("Cloud Firestore is configured in Datastore Mode (incompatible). Switching to Local-Only mode for this session.");
    isFirestoreAvailable = false;
  } else if (e.code === 'unavailable') {
    console.warn("Cloud Firestore unreachable. Proceeding in offline mode.");
  } else {
    console.warn("Cloud Error:", e);
  }
};

// --- Data Helpers ---

// MERGE UTILITY: Helps preserve existing data when State Schema updates
const mergeWithInitial = (loaded: any): AppState => {
    if (!loaded) return INITIAL_STATE;
    return {
        ...INITIAL_STATE,
        ...loaded,
        // Explicitly preserve keys that might be missing in old versions but exist in INITIAL_STATE
        // If loaded has them, use loaded. If not, use INITIAL_STATE's default.
        generatedSchedule: loaded.generatedSchedule !== undefined ? loaded.generatedSchedule : INITIAL_STATE.generatedSchedule,
        savedSchedules: loaded.savedSchedules || INITIAL_STATE.savedSchedules,
        globalSlots: loaded.globalSlots || INITIAL_STATE.globalSlots,
        dayConfigs: loaded.dayConfigs || INITIAL_STATE.dayConfigs
    };
};

export const loadState = async (contextId: string, userId?: string): Promise<AppState | null> => {
  // 1. Try Cloud First if user is logged in and DB is healthy
  if (userId && db && isFirestoreAvailable) {
     try {
       const docPath = contextId === 'personal' 
         ? `users/${userId}/data/schedule` 
         : `groups/${contextId}/data/schedule`;
       
       const snap = await getDoc(doc(db, docPath));
       
       if (snap.exists()) {
         const data = snap.data();
         const mergedState = mergeWithInitial(data);
         
         // Update local storage cache to match cloud
         const key = contextId === 'personal' ? KEY_PERSONAL_DATA : `${STORAGE_PREFIX}group_data_${contextId}`;
         localStorage.setItem(key, JSON.stringify(mergedState));
         return mergedState;
       }
     } catch (e: any) {
       handleFirestoreError(e);
     }
  }

  // 2. Fallback to LocalStorage
  try {
    const key = contextId === 'personal' ? KEY_PERSONAL_DATA : `${STORAGE_PREFIX}group_data_${contextId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      return mergeWithInitial(data);
    }
  } catch (e) {
    console.error("Failed to load local state", e);
  }
  
  // Return null so App.tsx can use INITIAL_STATE, but generally mergeWithInitial handles structure
  return null;
};

export const saveState = async (state: AppState, contextId: string, userId?: string): Promise<boolean> => {
  let cloudSuccess = false;
  
  // 1. Save to LocalStorage (Immediate / Offline Cache)
  try {
    const key = contextId === 'personal' ? KEY_PERSONAL_DATA : `${STORAGE_PREFIX}group_data_${contextId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save local state", e);
  }

  // 2. Save to Cloud (if authenticated and DB healthy)
  if (userId && db && isFirestoreAvailable) {
    try {
      const docPath = contextId === 'personal' 
        ? `users/${userId}/data/schedule` 
        : `groups/${contextId}/data/schedule`;
        
      await setDoc(doc(db, docPath), state);
      cloudSuccess = true;
    } catch (e: any) {
      handleFirestoreError(e);
      cloudSuccess = false;
    }
  } else {
    cloudSuccess = false;
  }
  
  return cloudSuccess;
};

// --- Auth Services ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  // 1. Firebase Authentication
  if (auth) {
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please login instead.');
      }
      throw new Error(error.message || 'Registration failed');
    }

    const fbUser = userCredential.user;

    // Update Auth Profile Display Name
    try {
      await updateProfile(fbUser, { displayName: name });
    } catch (e) {
      console.warn("Could not update display name in Auth", e);
    }

    const user: User = {
      id: fbUser.uid,
      name: name,
      email: email,
      provider: 'email'
    };

    // Save user details to Firestore (Best Effort)
    if (db && isFirestoreAvailable) {
      try {
        await setDoc(doc(db, 'users', user.id), {
          uid: user.id,
          name: user.name,
          email: user.email,
          provider: 'email',
          createdAt: serverTimestamp()
        });
      } catch (e: any) {
        handleFirestoreError(e);
      }
    }

    localStorage.setItem(KEY_SESSION, JSON.stringify(user));
    return user;
  }

  // Fallback: Local Mock DB
  await delay(800);
  const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  if (users.find(u => u.email === email)) {
    throw new Error('User already exists with this email');
  }
  
  const newUser: User = { 
    id: crypto.randomUUID(), 
    name, 
    email, 
    password,
    provider: 'email'
  };
  users.push(newUser);
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  localStorage.setItem(KEY_SESSION, JSON.stringify(newUser));
  return newUser;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  // 1. Firebase Authentication
  if (auth) {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password.');
      }
      throw new Error(error.message || 'Login failed');
    }

    const fbUser = userCredential.user;
    let name = fbUser.displayName || 'User';

    // Fetch user details from Firestore (Best Effort)
    if (db && isFirestoreAvailable) {
      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          name = userData.name || name;
        }
      } catch (e: any) {
        handleFirestoreError(e);
      }
    }

    const user: User = {
      id: fbUser.uid,
      name: name,
      email: email,
      provider: 'email'
    };

    localStorage.setItem(KEY_SESSION, JSON.stringify(user));
    return user;
  }

  // Fallback: Local Mock DB
  await delay(800);
  const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');
  
  localStorage.setItem(KEY_SESSION, JSON.stringify(user));
  return user;
};

export const loginWithGoogle = async (): Promise<User> => {
  if (!auth || !googleProvider) {
    throw new Error("Firebase Auth is not configured.");
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const user: User = {
      id: fbUser.uid,
      name: fbUser.displayName || 'Google User',
      email: fbUser.email || '',
      photoURL: fbUser.photoURL || undefined,
      provider: 'google'
    };

    // 1. Save/Update to Firestore (Best Effort)
    if (db && isFirestoreAvailable) {
      try {
        const userRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          await setDoc(userRef, {
            uid: user.id,
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            provider: 'google',
            createdAt: serverTimestamp()
          });
        } else {
          await setDoc(userRef, {
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      } catch (e: any) {
        handleFirestoreError(e);
      }
    }

    // 2. Local Sync
    const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(KEY_USERS, JSON.stringify(users));

    // 3. Set Session
    localStorage.setItem(KEY_SESSION, JSON.stringify(user));
    return user;

  } catch (error: any) {
    console.error("Google Sign-In Error", error);
    if (error.code === 'auth/unauthorized-domain') {
       throw new Error(`Domain not authorized. Go to Firebase Console > Authentication > Settings > Authorized Domains and add: ${window.location.hostname}`);
    }
    if (error.code === 'auth/popup-closed-by-user') {
       throw new Error('Sign-in cancelled.');
    }
    throw new Error(error.message || 'Google Sign-In failed');
  }
};

export const sendPasswordReset = async (email: string) => {
  if (!auth) throw new Error("Authentication service unavailable");
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    throw new Error(error.message || "Failed to send reset email");
  }
};

export const updateUserPassword = async (newPassword: string) => {
  if (!auth || !auth.currentUser) throw new Error("No user logged in via Firebase");
  try {
    await updatePassword(auth.currentUser, newPassword);
    return true;
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
       throw new Error("For security, please logout and login again before changing your password.");
    }
    throw new Error(error.message || "Failed to update password");
  }
};

export const loginAsGuest = (): User => {
  const guestUser: User = {
    id: 'guest_user',
    name: 'Guest User',
    email: 'guest@example.com',
    provider: 'guest'
  };
  localStorage.setItem(KEY_SESSION, JSON.stringify(guestUser));
  return guestUser;
};

export const getSession = (): User | null => {
  const session = localStorage.getItem(KEY_SESSION);
  return session ? JSON.parse(session) : null;
};

export const logout = () => {
  localStorage.removeItem(KEY_SESSION);
  if (auth) {
    auth.signOut().catch(e => console.error("Firebase signout error", e));
  }
};

// --- Group Services ---

const generateGroupId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createGroup = async (name: string, adminId: string): Promise<SchoolGroup> => {
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  const newGroup: SchoolGroup = {
    id: generateGroupId(),
    name,
    adminId,
    members: [{ userId: adminId, role: UserRole.PRINCIPAL, joinedAt: Date.now() }]
  };
  groups.push(newGroup);
  localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));
  
  // Cloud Sync: Save group metadata and initial schedule
  if (db && isFirestoreAvailable) {
     try {
       // Save group metadata with a memberIds array for easier querying
       const groupData = { ...newGroup, memberIds: [adminId] };
       await setDoc(doc(db, 'groups', newGroup.id), groupData);

       // Initialize schedule sub-collection
       const docPath = `groups/${newGroup.id}/data/schedule`;
       await setDoc(doc(db, docPath), INITIAL_STATE);
     } catch (e: any) {
       handleFirestoreError(e);
     }
  }
  
  saveState(INITIAL_STATE, newGroup.id, adminId);
  return newGroup;
};

export const deleteGroup = async (groupId: string, userId: string): Promise<void> => {
  // 1. Local Verification and Cleanup
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    // If not found, just return (maybe already deleted)
    return;
  }
  
  if (group.adminId !== userId) {
    throw new Error("Only the group administrator can delete this group.");
  }
  
  // Update local groups list
  const newGroups = groups.filter(g => g.id !== groupId);
  localStorage.setItem(KEY_GROUPS, JSON.stringify(newGroups));
  
  // CRITICAL: Force remove the specific data chunk for this group to prevent persistence issues
  localStorage.removeItem(`${STORAGE_PREFIX}group_data_${groupId}`);

  // 2. Cloud Delete (If Available)
  if (db && isFirestoreAvailable) {
    try {
      // We attempt to delete the sub-data first
      try {
        await deleteDoc(doc(db, `groups/${groupId}/data/schedule`));
      } catch (innerE) {
        console.warn("Sub-collection delete failed (might not exist yet):", innerE);
      }

      // Then delete the main group document
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (e: any) {
      handleFirestoreError(e);
      // We don't block the UI if cloud delete fails, as local is already updated
      console.error("Failed to delete group from cloud", e);
    }
  }
};

export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
  // 1. Get Group
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  let group = groups.find(g => g.id === groupId);
  if (!group) throw new Error("Group not found");

  // 2. Remove User
  const remainingMembers = group.members.filter(m => m.userId !== userId);
  
  // 3. Handle Empty Group (Delete)
  if (remainingMembers.length === 0) {
      await deleteGroup(groupId, userId);
      return;
  }

  // 4. Handle Admin Departure (Succession)
  if (group.adminId === userId) {
      // Find successor: Prioritize Supervisor, then oldest member
      let successor = remainingMembers.find(m => m.role === UserRole.SUPERVISOR);
      
      if (!successor) {
          // If no supervisor, pick the first member (usually the oldest joined besides admin)
          successor = remainingMembers[0];
      }

      // Promote
      successor.role = UserRole.PRINCIPAL;
      group.adminId = successor.userId;
  }
  
  // Apply member update
  group.members = remainingMembers;
  
  // 5. Save Changes (Local)
  const groupIndex = groups.findIndex(g => g.id === groupId);
  groups[groupIndex] = group;
  localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));

  // 6. Save Changes (Cloud)
  if (db && isFirestoreAvailable) {
      try {
          const ref = doc(db, 'groups', groupId);
          // Sync memberIds for querying
          const memberIds = group.members.map(m => m.userId);
          await setDoc(ref, { 
              members: group.members, 
              adminId: group.adminId, 
              memberIds 
          }, { merge: true });
      } catch (e) {
          handleFirestoreError(e);
      }
  }
};

export const joinGroup = async (groupId: string, userId: string): Promise<SchoolGroup> => {
  let groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  let group = groups.find(g => g.id === groupId);

  // 1. Try Local Update first (if exists locally)
  if (group) {
    if (!group.members.find(m => m.userId === userId)) {
        group.members.push({ userId, role: UserRole.TEACHER, joinedAt: Date.now() });
        localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));
        
        // Sync Update to Cloud
        if (db && isFirestoreAvailable) {
            try {
                const ref = doc(db, 'groups', groupId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const cloudData = snap.data();
                    const members = cloudData.members || [];
                    const memberIds = cloudData.memberIds || [];
                    
                    if (!members.find((m: any) => m.userId === userId)) {
                        members.push({ userId, role: UserRole.TEACHER, joinedAt: Date.now() });
                        memberIds.push(userId);
                        await setDoc(ref, { members, memberIds }, { merge: true });
                    }
                }
            } catch (e) {
                handleFirestoreError(e);
            }
        }
    }
    return group;
  }

  // 2. Try Fetching from Cloud (if not found locally)
  if (db && isFirestoreAvailable) {
    try {
        const ref = doc(db, 'groups', groupId);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            group = snap.data() as SchoolGroup;
            
            // Add user to members if not present
            if (!group.members.find(m => m.userId === userId)) {
                group.members.push({ userId, role: UserRole.TEACHER, joinedAt: Date.now() });
                
                // Update Cloud with new member
                const memberIds = (snap.data().memberIds || []).concat(userId);
                await setDoc(ref, { members: group.members, memberIds }, { merge: true });
            }
            
            // Save to Local Storage
            groups.push(group);
            localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));
            return group;
        }
    } catch (e) {
        handleFirestoreError(e);
    }
  }
  
  throw new Error('Group not found. Please check the ID and internet connection.');
};

export const syncUserGroups = async (userId: string) => {
    if (!db || !isFirestoreAvailable) return;
    
    try {
        // Query groups where this user is a member
        const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
        const querySnapshot = await getDocs(q);
        
        const localGroups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
        let updated = false;
        
        const cloudGroupIds = new Set<string>();

        querySnapshot.forEach((doc) => {
            const cloudGroup = doc.data() as SchoolGroup;
            cloudGroupIds.add(cloudGroup.id);
            const idx = localGroups.findIndex(g => g.id === cloudGroup.id);
            
            if (idx === -1) {
                // New group found in cloud, add to local
                localGroups.push(cloudGroup);
                updated = true;
            } else {
                // Check if cloud version has more members/updates
                // Simple check on member count or just overwrite for now
                if (localGroups[idx].members.length !== cloudGroup.members.length || localGroups[idx].adminId !== cloudGroup.adminId) {
                    localGroups[idx] = cloudGroup;
                    updated = true;
                }
            }
        });
        
        if (updated) {
            localStorage.setItem(KEY_GROUPS, JSON.stringify(localGroups));
        }
        return localGroups;
    } catch (e) {
        console.warn("Sync groups failed", e);
        // Fallback to local
    }
};

export const updateGroupMemberRole = async (groupId: string, targetUserId: string, newRole: UserRole, currentUserId: string): Promise<SchoolGroup> => {
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  const group = groups.find(g => g.id === groupId);

  if (!group) throw new Error("Group not found");
  if (group.adminId !== currentUserId) throw new Error("Only admin can change roles");

  // Local Update
  const member = group.members.find(m => m.userId === targetUserId);
  if (member) {
    member.role = newRole;
    localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));

    // Cloud Update
    if (db && isFirestoreAvailable) {
      try {
        const ref = doc(db, 'groups', groupId);
        await setDoc(ref, { members: group.members }, { merge: true });
      } catch (e) {
        handleFirestoreError(e);
      }
    }
  }
  return group;
};

export const getUserGroups = (userId: string): SchoolGroup[] => {
  if (userId === 'guest_user') return [];
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  return groups.filter(g => g.members.some(m => m.userId === userId));
};

export const getGroup = (groupId: string): SchoolGroup | undefined => {
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  return groups.find(g => g.id === groupId);
};

export const getUserRoleInGroup = (group: SchoolGroup, userId: string): UserRole => {
  const member = group.members.find(m => m.userId === userId);
  return member ? member.role : UserRole.TEACHER;
};

export const getGroupMembersDetails = (groupId: string): (User & { role: UserRole, joinedAt: number })[] => {
  const groups: SchoolGroup[] = JSON.parse(localStorage.getItem(KEY_GROUPS) || '[]');
  const group = groups.find(g => g.id === groupId);
  if (!group) return [];

  const users: User[] = JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
  
  return group.members.map(member => {
    const user = users.find(u => u.id === member.userId);
    return {
      id: member.userId,
      name: user ? user.name : 'Unknown User',
      email: user ? user.email : '',
      photoURL: user?.photoURL,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  });
};