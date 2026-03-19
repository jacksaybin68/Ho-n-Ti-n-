// File: src/mockFirebase.ts
// LocalStorage-based mock of Firebase API to remove Firebase completely.

export const db = {};
export const auth = { currentUser: null };
export const messaging = {};

export const BUILT_IN_ADMINS = [
  { uid: 'admin_123',        email: 'admin@aerorefund.com',            password: 'Matkhau1', displayName: 'Admin',           phoneNumber: '' },
  { uid: 'admin_0968686868', email: 'phone_0968686868@aerorefund.com', password: 'Admin123', displayName: 'Admin 0968686868', phoneNumber: '0968686868' },
];

// Cache để tránh đọc localStorage nhiều lần
let _cachedUsers: any[] | null = null;
const getCachedUsers = () => {
  if (_cachedUsers === null) {
    _cachedUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
  }
  return _cachedUsers;
};
const invalidateUserCache = () => { _cachedUsers = null; };

// Seed / upsert built-in admin accounts on every load
if (typeof localStorage !== 'undefined') {
  const users = getCachedUsers();
  for (const admin of BUILT_IN_ADMINS) {
    const idx = users.findIndex((u: any) => u.uid === admin.uid);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...admin };
    } else {
      users.push(admin);
    }
  }
  localStorage.setItem('mockUsers', JSON.stringify(users));
  _cachedUsers = users;
}

const findUserByEmailAndPassword = (email: string, pass: string) => {
  const stored = getCachedUsers().find((u: any) => u.email === email && u.password === pass);
  if (stored) return stored;
  return BUILT_IN_ADMINS.find((u: any) => u.email === email && u.password === pass) || null;
};

const isAdminEmail = (email: string) => {
  return BUILT_IN_ADMINS.some(a => a.email === email);
};

export const signInWithEmailAndPassword = async (authIns: any, email: string, pass: string) => {
  const user = findUserByEmailAndPassword(email, pass);

  if (!user) {
    const err: any = new Error('Not found');
    err.code = 'auth/user-not-found';
    throw err;
  }

  // Tự động seed Firestore profile cho mock user nếu chưa có
  const profilePath = 'users/' + user.uid;
  const mockFirestore = (window as any).__mockFirestore = (window as any).__mockFirestore || {};
  const existingProfile = mockFirestore[profilePath];
  if (!existingProfile) {
    const isAdmin = isAdminEmail(email);
    mockFirestore[profilePath] = {
      uid: user.uid,
      email: email,
      phoneNumber: user.phoneNumber || '',
      displayName: user.displayName || email.split('@')[0],
      role: isAdmin ? 'admin' : 'user',
      status: 'active',
    };
    // Ghi vào localStorage
    localStorage.setItem('col_users', JSON.stringify(
      Object.values(mockFirestore).filter((v: any) => v.uid)
    ));
  }

  const mockUser = { uid: user.uid, email, phoneNumber: user.phoneNumber, displayName: user.displayName };
  localStorage.setItem('mockUser', JSON.stringify(dehydrateData(mockUser)));
  return { user: mockUser };
};

export const onAuthStateChanged = (authIns: any, callback: any) => {
  const userStr = localStorage.getItem('mockUser');
  const user = userStr ? processData(JSON.parse(userStr)) : null;
  authIns.currentUser = user;
  // Gọi callback ngay lập tức (không dùng setTimeout)
  callback(user);
  return () => {};
};

export const signOut = async (authIns: any) => {
  localStorage.removeItem('mockUser');
  window.location.reload();
};

export const createUserWithEmailAndPassword = async (authIns: any, email: string, pass: string) => {
  const users = getCachedUsers();
  if (users.find((u: any) => u.email === email)) {
    const err: any = new Error('Exists');
    err.code = 'auth/email-already-in-use';
    throw err;
  }
  const mockUser = { uid: 'user_' + Date.now(), email, password: pass };
  users.push(mockUser);
  localStorage.setItem('mockUsers', JSON.stringify(dehydrateData(users)));
  localStorage.setItem('mockUser', JSON.stringify(dehydrateData(mockUser)));
  invalidateUserCache();
  return { user: mockUser };
};

export const updateProfile = async (user: any, profile: any) => {
  Object.assign(user, profile);
  localStorage.setItem('mockUser', JSON.stringify(dehydrateData(user)));
  
  const users = getCachedUsers();
  const index = users.findIndex((u: any) => u.uid === user.uid);
  if (index >= 0) {
    users[index] = { ...users[index], ...profile };
    localStorage.setItem('mockUsers', JSON.stringify(dehydrateData(users)));
    invalidateUserCache();
  }
};

export const adminUpdateUserAuth = async (uid: string, newEmail?: string, newPassword?: string) => {
  const users = getCachedUsers();
  const index = users.findIndex((u: any) => u.uid === uid);
  if (index >= 0) {
    if (newEmail) users[index].email = newEmail;
    if (newPassword) users[index].password = newPassword;
    localStorage.setItem('mockUsers', JSON.stringify(dehydrateData(users)));
    invalidateUserCache();
  }
};

export type FirebaseUser = any;

// MESSAGING MOCKS
export const getToken = async (...args: any[]) => 'mock-token';

// FIRESTORE MOCKS
const listeners: any[] = [];
const emitChange = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('col_')) {
      emitChange();
    }
  });
}

const wrapTimestamp = (val: any) => {
  if (val && typeof val === 'object' && val.toDate) return val;
  const date = (typeof val === 'number') ? new Date(val) : (val instanceof Date ? val : new Date());
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6
  };
};

const processData = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(processData);
  if (typeof data === 'object') {
    const newData = { ...data };
    const timestampFields = ['createdAt', 'updatedAt', 'timestamp', 'processingTime', 'lastReadAt'];
    for (const key of Object.keys(newData)) {
      if (timestampFields.includes(key) && newData[key] !== null && newData[key] !== undefined) {
        newData[key] = wrapTimestamp(newData[key]);
      } else if (typeof newData[key] === 'object') {
        newData[key] = processData(newData[key]);
      }
    }
    return newData;
  }
  return data;
};

export const serverTimestamp = () => wrapTimestamp(Date.now());
export const Timestamp = {
  fromDate: (date: Date) => wrapTimestamp(date),
  now: () => wrapTimestamp(Date.now())
};

export const doc = (dbIns: any, path: string, ...segments: string[]) => {
  let docId = segments[segments.length - 1];
  let colPath = path;
  if (segments.length > 0) {
    colPath = path;
    docId = segments.join('/');
  }
  if (!docId && path.includes('/')) {
      const parts = path.split('/');
      docId = parts.pop() || '';
      colPath = parts.join('/');
  }
  return { id: docId, path: colPath };
};

export const collection = (dbIns: any, path: string) => {
  return { path };
};

const getStorageCol = (path: string) => JSON.parse(localStorage.getItem('col_' + path) || '[]');
const dehydrateData = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(dehydrateData);
  if (typeof data === 'object') {
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toMillis ? data.toMillis() : new Date(data.toDate()).getTime();
    }
    const newData: any = {};
    for (const key of Object.keys(data)) {
      newData[key] = dehydrateData(data[key]);
    }
    return newData;
  }
  return data;
};

const setStorageCol = (path: string, data: any[]) => {
  localStorage.setItem('col_' + path, JSON.stringify(dehydrateData(data)));
  emitChange();
};

export const getDoc = async (docRef: any) => {
  const col = getStorageCol(docRef.path);
  const data = col.find((item: any) => item.id === docRef.id);
  return {
    exists: () => !!data,
    data: () => processData(data),
    id: docRef.id
  };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const col = getStorageCol(docRef.path);
  const index = col.findIndex((item: any) => item.id === docRef.id);
  if (index >= 0) {
    col[index] = options?.merge ? { ...col[index], ...data } : { ...data, id: docRef.id };
  } else {
    col.push({ ...data, id: docRef.id });
  }
  setStorageCol(docRef.path, col);
};

export const updateDoc = async (docRef: any, data: any) => {
  await setDoc(docRef, data, { merge: true });
};

export const addDoc = async (colRef: any, data: any) => {
  const col = getStorageCol(colRef.path);
  const id = 'doc_' + Date.now() + Math.random().toString(36).substr(2, 5);
  col.push({ ...data, id });
  setStorageCol(colRef.path, col);
  return { id };
};

export const deleteDoc = async (docRef: any) => {
  const col = getStorageCol(docRef.path);
  setStorageCol(docRef.path, col.filter((item: any) => item.id !== docRef.id));
};

export const query = (colRef: any, ...constraints: any[]) => {
  return { ...colRef, constraints };
};

export const where = (field: string, op: string, value: any) => {
  return { type: 'where', field, op, value };
};

export const orderBy = (field: string, dir: string) => {
  return { type: 'orderBy', field, dir };
};

export const getDocs = (q: any) => {
  let col = getStorageCol(q.path);
  
  if (q.constraints) {
    for (const c of q.constraints) {
      if (c.type === 'where') {
        if (c.op === '==') col = col.filter((item: any) => item[c.field] === c.value);
        if (c.op === '>') col = col.filter((item: any) => item[c.field] > c.value);
        if (c.op === '<') col = col.filter((item: any) => item[c.field] < c.value);
      } else if (c.type === 'orderBy') {
        col = col.sort((a: any, b: any) => {
          if (a[c.field] < b[c.field]) return c.dir === 'asc' ? -1 : 1;
          if (a[c.field] > b[c.field]) return c.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
  }

  return {
    docs: col.map((item: any) => ({
      id: item.id,
      data: () => processData(item)
    })),
    empty: col.length === 0,
    size: col.length
  };
};

export const onSnapshot = (q: any, callback: any) => {
  const handler = () => {
    const result = getDocs(q);
    callback(result);
  };
  
  // Tránh đăng ký trùng lặp cùng 1 query + callback
  const existingIdx = listeners.findIndex(l => l._queryPath === q.path && l._callback === callback);
  if (existingIdx >= 0) {
    return () => {
      const idx = listeners.indexOf(listeners[existingIdx]);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }
  
  Object.defineProperty(handler, '_queryPath', { value: q.path, writable: false });
  Object.defineProperty(handler, '_callback', { value: callback, writable: false });
  
  listeners.push(handler);
  handler();
  
  return () => {
    const idx = listeners.indexOf(handler);
    if (idx >= 0) listeners.splice(idx, 1);
  };
};

export const writeBatch = (dbIns: any) => {
  const ops: any[] = [];
  return {
    update: (docRef: any, data: any) => ops.push(() => updateDoc(docRef, data)),
    delete: (docRef: any) => ops.push(() => deleteDoc(docRef)),
    set: (docRef: any, data: any) => ops.push(() => setDoc(docRef, data)),
    commit: async () => {
      for (const op of ops) await op();
    }
  };
};
