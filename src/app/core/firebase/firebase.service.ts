import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser: boolean = isPlatformBrowser(this.platformId);

  readonly app: FirebaseApp | null = null;
  readonly db: Firestore | null = null;
  readonly auth: Auth | null = null;

  constructor() {
    if (this.isBrowser) {
      try {
        const config: FirebaseAppConfig = environment.firebaseConfig;
        this.app = getApps().length === 0 ? initializeApp(config) : getApp();
        const dbId = config.firestoreDatabaseId;
        this.db = dbId && dbId !== '(default)' ? getFirestore(this.app, dbId) : getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.testConnection();
      } catch (err) {
        console.warn('Firebase initialization in browser deferred or failed:', err);
      }
    }
  }

  async testConnection(): Promise<void> {
    if (!this.db) return;
    try {
      await getDocFromServer(doc(this.db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  }

  handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: this.auth?.currentUser?.uid ?? null,
        email: this.auth?.currentUser?.email ?? null,
        emailVerified: this.auth?.currentUser?.emailVerified ?? null,
        isAnonymous: this.auth?.currentUser?.isAnonymous ?? null,
        tenantId: this.auth?.currentUser?.tenantId ?? null,
        providerInfo:
          this.auth?.currentUser?.providerData?.map((p) => ({
            providerId: p.providerId,
            email: p.email,
          })) || [],
      },
      operationType,
      path,
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Auth Operations
  async loginWithGoogle(): Promise<FirebaseUser | null> {
    if (!this.auth) return null;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(this.auth, provider);
    return result.user;
  }

  async loginWithEmail(email: string, pass: string): Promise<FirebaseUser | null> {
    if (!this.auth) return null;
    const result = await signInWithEmailAndPassword(this.auth, email, pass);
    return result.user;
  }

  async registerWithEmail(email: string, pass: string): Promise<FirebaseUser | null> {
    if (!this.auth) return null;
    const result = await createUserWithEmailAndPassword(this.auth, email, pass);
    return result.user;
  }

  async loginAnonymously(): Promise<FirebaseUser | null> {
    if (!this.auth) return null;
    const result = await signInAnonymously(this.auth);
    return result.user;
  }

  async logout(): Promise<void> {
    if (this.auth) {
      await signOut(this.auth);
    }
  }

  onAuthState(callback: (user: FirebaseUser | null) => void): Unsubscribe | null {
    if (!this.auth) return null;
    return onAuthStateChanged(this.auth, callback);
  }

  // Firestore Document & Collection Operations
  async getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    if (!this.db) return null;
    const p = `users/${userId}`;
    try {
      const snap = await getDoc(doc(this.db, 'users', userId));
      return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    } catch (err) {
      this.handleFirestoreError(err, OperationType.GET, p);
    }
  }

  async saveUserProfile(userId: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return;
    const p = `users/${userId}`;
    try {
      await setDoc(doc(this.db, 'users', userId), data, { merge: true });
    } catch (err) {
      this.handleFirestoreError(err, OperationType.WRITE, p);
    }
  }

  subscribeCollection<T>(
    subPath: string,
    callback: (items: T[]) => void
  ): Unsubscribe | null {
    if (!this.db || !this.isBrowser) return null;
    try {
      const colRef = collection(this.db, subPath);
      return onSnapshot(
        colRef,
        (snap) => {
          const items: T[] = [];
          snap.forEach((d) => items.push(d.data() as T));
          callback(items);
        },
        (err) => {
          this.handleFirestoreError(err, OperationType.GET, subPath);
        }
      );
    } catch (err) {
      this.handleFirestoreError(err, OperationType.GET, subPath);
    }
  }

  async getCollection<T>(colPath: string): Promise<T[]> {
    if (!this.db || !this.isBrowser) return [];
    try {
      const colRef = collection(this.db, colPath);
      const snap = await getDocs(colRef);
      const items: T[] = [];
      snap.forEach((d) => items.push(d.data() as T));
      return items;
    } catch (err) {
      this.handleFirestoreError(err, OperationType.GET, colPath);
    }
  }

  async setDoc(colPath: string, docId: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return;
    const p = `${colPath}/${docId}`;
    try {
      await setDoc(doc(this.db, colPath, docId), data, { merge: true });
    } catch (err) {
      this.handleFirestoreError(err, OperationType.WRITE, p);
    }
  }

  async setSubDoc(subPath: string, docId: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return;
    const p = `${subPath}/${docId}`;
    try {
      await setDoc(doc(this.db, subPath, docId), data, { merge: true });
    } catch (err) {
      this.handleFirestoreError(err, OperationType.WRITE, p);
    }
  }

  async updateSubDoc(subPath: string, docId: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return;
    const p = `${subPath}/${docId}`;
    try {
      await updateDoc(doc(this.db, subPath, docId), data);
    } catch (err) {
      this.handleFirestoreError(err, OperationType.UPDATE, p);
    }
  }

  async deleteSubDoc(subPath: string, docId: string): Promise<void> {
    if (!this.db) return;
    const p = `${subPath}/${docId}`;
    try {
      await deleteDoc(doc(this.db, subPath, docId));
    } catch (err) {
      this.handleFirestoreError(err, OperationType.DELETE, p);
    }
  }

  /**
   * Bootstraps a global catalog collection if it has not yet been populated in Firestore.
   */
  async seedCollectionIfEmpty<T extends { id: string }>(colPath: string, defaultItems: T[]): Promise<void> {
    if (!this.db || !this.isBrowser) return;
    try {
      const existing = await this.getCollection<T>(colPath);
      if (existing.length === 0) {
        for (const item of defaultItems) {
          await this.setDoc(colPath, item.id, item as unknown as Record<string, unknown>);
        }
      }
    } catch (err) {
      console.warn(`Could not seed collection ${colPath}:`, err);
    }
  }
}
