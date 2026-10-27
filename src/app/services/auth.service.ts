import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, AuthSession } from '../models/user.model';
import { SafeStorage } from '../core/utils/storage.util';

const DEMO_USER: User = {
  id: 'usr_demo_882',
  name: 'Alejandro Morales',
  email: 'alejandro.morales@fintrack.io',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'user',
  totalMonthlyBudget: 2800,
  preferences: {
    theme: 'system',
    pushNotificationsEnabled: true,
    budgetAlertsEnabled: true,
    bankSyncFrequency: 'instant',
    currency: 'EUR',
  },
  createdAt: '2026-01-15T10:00:00.000Z',
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly SESSION_KEY = 'fintrack_auth_session';

  private initialSession = SafeStorage.getItem<AuthSession | null>(this.SESSION_KEY, {
    token: 'jwt_mock_token_773919_active',
    user: DEMO_USER,
    expiresAt: Date.now() + 86400000 * 30,
  });

  readonly session = signal<AuthSession | null>(this.initialSession);

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && !!s.token && s.expiresAt > Date.now();
  });

  login(email: string, pass: string): { success: boolean; error?: string } {
    if (!email || !pass) {
      return { success: false, error: 'Por favor, completa todos los campos requeridos.' };
    }

    if (pass.length < 5) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    // Match or create valid session
    const isDemo = email.toLowerCase() === DEMO_USER.email.toLowerCase();
    const userToSave: User = isDemo
      ? DEMO_USER
      : {
          id: `usr_${Date.now()}`,
          name: email.split('@')[0].replace('.', ' ').toUpperCase(),
          email: email.toLowerCase(),
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          role: 'user',
          totalMonthlyBudget: 2500,
          preferences: {
            theme: 'system',
            pushNotificationsEnabled: true,
            budgetAlertsEnabled: true,
            bankSyncFrequency: 'instant',
            currency: 'EUR',
          },
          createdAt: new Date().toISOString(),
        };

    const newSession: AuthSession = {
      token: `jwt_tok_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      user: userToSave,
      expiresAt: Date.now() + 86400000 * 14,
    };

    this.session.set(newSession);
    SafeStorage.setItem(this.SESSION_KEY, newSession);
    return { success: true };
  }

  register(name: string, email: string, pass: string, currency = 'EUR'): { success: boolean; error?: string } {
    if (!name || !email || !pass) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe contener al menos 6 caracteres.' };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      totalMonthlyBudget: 2400,
      preferences: {
        theme: 'system',
        pushNotificationsEnabled: true,
        budgetAlertsEnabled: true,
        bankSyncFrequency: 'instant',
        currency,
      },
      createdAt: new Date().toISOString(),
    };

    const newSession: AuthSession = {
      token: `jwt_tok_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      user: newUser,
      expiresAt: Date.now() + 86400000 * 14,
    };

    this.session.set(newSession);
    SafeStorage.setItem(this.SESSION_KEY, newSession);
    return { success: true };
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
    const currentSession = this.session();
    if (currentSession) {
      const updatedSession: AuthSession = {
        ...currentSession,
        user: updatedUser,
      };
      this.session.set(updatedSession);
      SafeStorage.setItem(this.SESSION_KEY, updatedSession);
    }
  }

  logout(): void {
    this.session.set(null);
    SafeStorage.removeItem(this.SESSION_KEY);
    this.router.navigate(['/auth/login']);
  }
}
