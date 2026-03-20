// File: src/mockFirebase.ts
// This file now uses SUPABASE as the backend, but provides a Firebase-like API
// to maintain compatibility with the existing UI code.

import { supabase } from './lib/supabaseClient';

export const db = {};
export const auth = {
  get currentUser() {
    // We return a proxy or a real user if possible
    const { data } = (async () => await supabase.auth.getUser())() as any;
    return data?.user || null;
  }
};

// Helper to convert Firebase-like data to Postgres-friendly names
const toSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const toSnakeCase = (obj: any, table?: string) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key in obj) {
    let newKey = toSnake(key);
    // Special case: `uid` in UserProfile maps to `id` in `users` table
    if (table === 'users' && key === 'uid') newKey = 'id';
    // Special case: `userId` in RefundRequest maps to `user_id` (handled by toSnake)
    newObj[newKey] = obj[key];
  }
  return newObj;
};

const fromSnakeCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
    let value = obj[key];
    
    // Convert ISO date strings to Firebase-compatible Timestamp-like objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const date = new Date(value);
      const timestampObj = {
        toDate: () => date,
        toMillis: () => date.getTime(),
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1e6,
        toISOString: () => value,
        toString: () => value
      };
      // We keep the original string but add the methods if possible, 
      // but in JS strings are primitives. So we use an object that acts like both.
      value = Object.assign(new String(value), timestampObj);
    }
    
    newObj[camelKey] = value;
  }
  return newObj;
};

// AUTH MOCKS
export const signInWithEmailAndPassword = async (authIns: any, email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  
  const user = { ...data.user, uid: data.user.id } as any;
  localStorage.setItem('mockUser', JSON.stringify({ uid: user.uid, email: user.email }));
  return { user };
};

export const onAuthStateChanged = (authIns: any, callback: any) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ? { ...session.user, uid: session.user.id } : null;
    if (user) {
        localStorage.setItem('mockUser', JSON.stringify({ uid: user.uid, email: user.email }));
    } else {
        localStorage.removeItem('mockUser');
    }
    callback(user);
  });
  return () => subscription.unsubscribe();
};

export const signOut = async (authIns: any) => {
  await supabase.auth.signOut();
  localStorage.removeItem('mockUser');
  window.location.reload();
};

export const createUserWithEmailAndPassword = async (authIns: any, email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) throw error;
  const user = { ...data.user, uid: data.user?.id } as any;
  return { user };
};

export const updateProfile = async (user: any, profile: any) => {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: profile.displayName }
  });
  if (error) throw error;
};

export const adminUpdateUserAuth = async (uid: string, newEmail?: string, newPassword?: string) => {
  // In Supabase, admin actions require the Service Role Key which we shouldn't put in the frontend.
  // For now, we'll log this as a placeholder or use an edge function if available.
  console.log('Admin update user auth requested for:', uid);
};

// FIRESTORE MOCKS
export const serverTimestamp = () => new Date().toISOString();
export const Timestamp = {
  fromDate: (date: Date) => date.toISOString(),
  now: () => new Date().toISOString()
};

export const doc = (dbIns: any, path: string, ...segments: string[]) => {
  const parts = [path, ...segments];
  const id = parts.pop() || '';
  let table = toSnake(parts.join('_'));
  if (table === 'refund_requests') table = 'refund_requests';
  if (table === 'admin_audit_log') table = 'audit_logs';
  if (table === 'audit_log') table = 'audit_logs';
  if (table === 'audit_logs') table = 'audit_logs';
  return { id, table };
};

export const collection = (dbIns: any, path: string, ...segments: string[]) => {
  if (path === 'chats' && segments.length === 2 && segments[1] === 'messages') {
    return { table: 'messages', chatId: segments[0] };
  }
  let table = toSnake([path, ...segments].join('_'));
  if (table === 'refund_requests') table = 'refund_requests';
  if (table === 'admin_audit_log') table = 'audit_logs';
  if (table === 'audit_log') table = 'audit_logs';
  if (table === 'audit_logs') table = 'audit_logs';
  return { table };
};

export const getDoc = async (docRef: any) => {
  const { data, error } = await supabase
    .from(docRef.table)
    .select('*')
    .eq('id', docRef.id)
    .single();
    
  return {
    exists: () => !!data && !error,
    data: () => {
      const d = fromSnakeCase(data);
      // DB column is `id`; UserProfile expects `uid`
      if (docRef.table === 'users' && d && d.uid == null && d.id != null) {
        d.uid = d.id;
      }
      return d;
    },
    id: docRef.id
  };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const snakeData = toSnakeCase(data, docRef.table);
  const { error } = await supabase
    .from(docRef.table)
    .upsert({ ...snakeData, id: docRef.id });
  if (error) throw error;
};

export const updateDoc = async (docRef: any, data: any) => {
  const snakeData = toSnakeCase(data, docRef.table);
  const { error } = await supabase
    .from(docRef.table)
    .update(snakeData)
    .eq('id', docRef.id);
  if (error) throw error;
};

export const addDoc = async (colRef: any, data: any) => {
  const snakeData = toSnakeCase(data, colRef.table);
  const { data: inserted, error } = await supabase
    .from(colRef.table)
    .insert([snakeData])
    .select()
    .single();
    
  if (error) throw error;
  return { id: inserted.id };
};

export const deleteDoc = async (docRef: any) => {
  const { error } = await supabase
    .from(docRef.table)
    .delete()
    .eq('id', docRef.id);
  if (error) throw error;
};

export const query = (colRef: any, ...constraints: any[]) => {
  const finalConstraints = [...constraints];
  if (colRef.chatId) {
    finalConstraints.push(where('chatId', '==', colRef.chatId));
  }
  return { ...colRef, constraints: finalConstraints };
};

export const where = (field: string, op: string, value: any) => {
  return { type: 'where', field: toSnake(field), op, value };
};

export const orderBy = (field: string, dir: string) => {
  return { type: 'orderBy', field: toSnake(field), dir };
};

export const getDocs = async (q: any) => {
  let request: any = supabase.from(q.table).select('*');
  
  if (q.constraints) {
    for (const c of q.constraints) {
      if (c.type === 'where') {
        if (c.op === '==') request = request.eq(c.field, c.value);
        else if (c.op === '>') request = request.gt(c.field, c.value);
        else if (c.op === '<') request = request.lt(c.field, c.value);
      } else if (c.type === 'orderBy') {
        request = request.order(c.field, { ascending: c.dir === 'asc' });
      }
    }
  }

  const { data, error } = await request;
  if (error) throw error;
  
  return {
    docs: (data || []).map(item => ({
      id: item.id,
      data: () => {
        const d = fromSnakeCase(item);
        if (q.table === 'users' && d && d.uid == null && d.id != null) {
          d.uid = d.id;
        }
        return d;
      }
    })),
    empty: !data || data.length === 0,
    size: data?.length || 0
  };
};

export const onSnapshot = (q: any, callback: any) => {
  // Initial fetch
  getDocs(q).then(callback);
  
  // Real-time subscription
  const channel = supabase
    .channel(`public:${q.table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: q.table }, () => {
        getDocs(q).then(callback);
    })
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
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

export type FirebaseUser = any;
