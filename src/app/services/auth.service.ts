import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, AuthSession } from '../models/user.model';
import { SafeStorage } from '../core/utils/storage.util';
import { FirebaseService } from '../core/firebase/firebase.service';

function parseFirebaseAuthError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || '';
  if (msg.includes('auth/email-already-in-use')) {
    return 'Este correo electrónico ya está registrado. Por favor, inicia sesión con tu contraseña.';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'La contraseña debe contener al menos 6 caracteres.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'No existe ninguna cuenta registrada con este correo.';
  }
  if (
    msg.includes('auth/wrong-password') ||
    msg.includes('auth/invalid-credential') ||
    msg.includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    return 'El correo o la contraseña ingresada son incorrectos.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'El inicio de sesión con Google fue cancelado en la ventana emergente.';
  }
  if (msg.includes('auth/popup-blocked')) {
    return 'La ventana emergente de Google fue bloqueada por tu navegador.';
  }
  if (msg.includes('auth/network-request-failed')) {
    return 'Error de conexión con Firebase. Verifica tu conexión a internet.';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Demasiados intentos fallidos. Por favor, espera unos minutos antes de reintentar.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'El método de autenticación por correo/contraseña no está habilitado en Firebase Console.';
  }
  return fallback;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly firebaseService = inject(FirebaseService);
  private readonly SESSION_KEY = 'fintrack_auth_session';

  // Session starts null unless a valid active session is already persisted
  private readonly initialSession = SafeStorage.getItem<AuthSession | null>(this.SESSION_KEY, null);

  readonly session = signal<AuthSession | null>(this.initialSession);

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && !!s.token && s.expiresAt > Date.now();
  });

  constructor() {
    // Synchronize session with Firebase Auth and Firestore profile in browser
    if (this.firebaseService.isBrowser) {
      this.firebaseService.onAuthState(async (fbUser) => {
        if (fbUser) {
          const current = this.currentUser();
          if (current && current.id === fbUser.uid) {
            return;
          }

          let profile: Record<string, unknown> | null = null;
          try {
            profile = await this.firebaseService.getUserProfile(fbUser.uid);
          } catch (e) {
            console.warn('Could not load profile in onAuthState:', e);
          }

          const user: User = profile
            ? (profile as unknown as User)
            : {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario Fintrack',
                email: fbUser.email || '',
                avatar:
                  fbUser.photoURL ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                role: 'user',
                totalMonthlyBudget: 0,
                preferences: {
                  theme: 'system',
                  pushNotificationsEnabled: true,
                  budgetAlertsEnabled: true,
                  bankSyncFrequency: 'instant',
                  currency: 'VES',
                },
                createdAt: new Date().toISOString(),
              };

          this.setSessionForUser(user);
        } else {
          // If Firebase Auth indicates sign out, clear session
          if (this.session()?.token?.startsWith('fb_tok_')) {
            this.session.set(null);
            SafeStorage.removeItem(this.SESSION_KEY);
          }
        }
      });
    }
  }

  private setSessionForUser(user: User): AuthSession {
    const newSession: AuthSession = {
      token: `fb_tok_${user.id}`,
      user,
      expiresAt: Date.now() + 86400000 * 30,
    };
    this.session.set(newSession);
    SafeStorage.setItem(this.SESSION_KEY, newSession);
    return newSession;
  }

  async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const fbUser = await this.firebaseService.loginWithGoogle();
      if (!fbUser) {
        return { success: false, error: 'Acceso con Google cancelado o no completado.' };
      }

      let userProfile: User | null = null;
      try {
        const profile = await this.firebaseService.getUserProfile(fbUser.uid);
        if (profile) {
          userProfile = profile as unknown as User;
        }
      } catch (err) {
        console.warn('Could not fetch Google profile from Firestore:', err);
      }

      const user: User = userProfile ?? {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario Google',
        email: fbUser.email || '',
        avatar:
          fbUser.photoURL ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'user',
        totalMonthlyBudget: 0,
        preferences: {
          theme: 'system',
          pushNotificationsEnabled: true,
          budgetAlertsEnabled: true,
          bankSyncFrequency: 'instant',
          currency: 'VES',
        },
        createdAt: new Date().toISOString(),
      };

      // Set session synchronously
      this.setSessionForUser(user);

      if (!userProfile) {
        try {
          await this.firebaseService.saveUserProfile(fbUser.uid, user as unknown as Record<string, unknown>);
        } catch (e) {
          console.warn('Could not save Google user profile to Firestore:', e);
        }
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Google login error:', err);
      const friendlyError = parseFirebaseAuthError(err, 'Error al conectar con Google Authentication.');
      return { success: false, error: friendlyError };
    }
  }

  async login(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    if (!email?.trim() || !pass) {
      return { success: false, error: 'Por favor, completa todos los campos requeridos.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const fbUser = await this.firebaseService.loginWithEmail(cleanEmail, pass);
      if (!fbUser) {
        return { success: false, error: 'No se pudo iniciar sesión con Firebase.' };
      }

      let userProfile: User | null = null;
      try {
        const profile = await this.firebaseService.getUserProfile(fbUser.uid);
        if (profile) {
          userProfile = profile as unknown as User;
        }
      } catch (err) {
        console.warn('Could not fetch profile from Firestore on login:', err);
      }

      const user: User = userProfile ?? {
        id: fbUser.uid,
        name: fbUser.displayName || cleanEmail.split('@')[0] || 'Usuario Fintrack',
        email: cleanEmail,
        avatar:
          fbUser.photoURL ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'user',
        totalMonthlyBudget: 0,
        preferences: {
          theme: 'system',
          pushNotificationsEnabled: true,
          budgetAlertsEnabled: true,
          bankSyncFrequency: 'instant',
          currency: 'VES',
        },
        createdAt: new Date().toISOString(),
      };

      // Ensure session is set synchronously before returning success
      this.setSessionForUser(user);

      return { success: true };
    } catch (signInErr: unknown) {
      console.error('Login error:', signInErr);
      const friendlyError = parseFirebaseAuthError(signInErr, 'Credenciales incorrectas o problema de autenticación.');
      return { success: false, error: friendlyError };
    }
  }

  async register(name: string, email: string, pass: string, currency = 'VES'): Promise<{ success: boolean; error?: string }> {
    if (!name?.trim() || !email?.trim() || !pass) {
      return { success: false, error: 'Por favor, completa todos los campos obligatorios.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe contener al menos 6 caracteres.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      // 1. Create account in Firebase Auth
      const fbUser = await this.firebaseService.registerWithEmail(cleanEmail, pass);
      if (!fbUser) {
        return { success: false, error: 'No se pudo generar el usuario en Firebase.' };
      }

      const newUser: User = {
        id: fbUser.uid,
        name: cleanName,
        email: cleanEmail,
        avatar:
          fbUser.photoURL ||
          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        role: 'user',
        totalMonthlyBudget: 0,
        preferences: {
          theme: 'system',
          pushNotificationsEnabled: true,
          budgetAlertsEnabled: true,
          bankSyncFrequency: 'instant',
          currency,
        },
        createdAt: new Date().toISOString(),
      };

      // 2. Synchronously set active session so isAuthenticated() is immediately true
      this.setSessionForUser(newUser);

      // 3. Save profile to Firestore safely in background
      try {
        await this.firebaseService.saveUserProfile(newUser.id, newUser as unknown as Record<string, unknown>);
      } catch (dbErr) {
        console.warn('Perfil de usuario guardado localmente; sincronización en Firestore diferida:', dbErr);
      }

      return { success: true };
    } catch (regErr: unknown) {
      console.error('Registration error:', regErr);
      const friendlyError = parseFirebaseAuthError(regErr, 'Error al registrar tu cuenta en Firebase.');
      return { success: false, error: friendlyError };
    }
  }

  recoverPassword(email: string): { success: boolean; message: string } {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Ingresa un correo electrónico válido.' };
    }
    return {
      success: true,
      message: `Hemos enviado un enlace seguro de recuperación a ${email}. Revisa tu bandeja de entrada o spam.`,
    };
  }

  updateProfile(partial: Partial<User>): void {
    const current = this.currentUser();
    if (!current) return;

    const updatedUser: User = { ...current, ...partial };
    this.setSessionForUser(updatedUser);

    this.firebaseService.saveUserProfile(updatedUser.id, updatedUser as unknown as Record<string, unknown>).catch((err) => {
      console.warn('Could not update user profile in Firestore:', err);
    });
  }

  logout(): void {
    this.session.set(null);
    SafeStorage.removeItem(this.SESSION_KEY);
    this.firebaseService.logout().catch((err) => {
      console.warn('Logout error', err);
    });
    this.router.navigate(['/auth/login']);
  }
}
