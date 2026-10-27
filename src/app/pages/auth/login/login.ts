import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-2">
            <mat-icon class="text-2xl">account_balance_wallet</mat-icon>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Iniciar Sesión
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Ingresa a tu cuenta de Fintrack Pro para gestionar tus finanzas
          </p>
        </div>

        <!-- 1-Click Demo Login Banner -->
        <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <mat-icon class="text-emerald-600 dark:text-emerald-400 text-lg">bolt</mat-icon>
            <div>
              <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Acceso Rápido de Prueba</p>
              <p class="text-[11px] text-emerald-700/80 dark:text-emerald-400">Entrar como usuario demo</p>
            </div>
          </div>
          <button
            type="button"
            (click)="quickDemoLogin()"
            class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Entrar ya
          </button>
        </div>

        @if (errorMessage()) {
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <mat-icon class="text-sm">error</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="login-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">mail</mat-icon>
              </span>
              <input
                id="login-email"
                type="email"
                formControlName="email"
                placeholder="tu@correo.com"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="login-password" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <a
                routerLink="/auth/recovery"
                class="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">lock</mat-icon>
              </span>
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                class="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Alternar visibilidad de contraseña"
              >
                <mat-icon class="text-base">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loginForm.invalid"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <mat-icon class="text-base">login</mat-icon>
            <span>Iniciar Sesión</span>
          </button>
        </form>

        <div class="text-center pt-2 border-t border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            ¿Aún no tienes cuenta?
            <a routerLink="/auth/register" class="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              Crear cuenta gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly loginForm = new FormGroup({
    email: new FormControl<string>('alejandro.morales@fintrack.io', [Validators.required, Validators.email]),
    password: new FormControl<string>('admin123', [Validators.required, Validators.minLength(5)]),
  });

  quickDemoLogin(): void {
    const res = this.authService.login('alejandro.morales@fintrack.io', 'admin123');
    if (res.success) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.getRawValue();
    const res = this.authService.login(email || '', password || '');
    if (res.success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(res.error || 'Error al iniciar sesión.');
    }
  }
}
