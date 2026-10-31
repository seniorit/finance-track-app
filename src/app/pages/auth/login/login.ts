import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden">
      <!-- Background subtle decorative glow circles -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Main Login Card -->
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 relative z-10">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-1 transition-transform hover:scale-105">
            <mat-icon class="text-2xl">account_balance_wallet</mat-icon>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Iniciar Sesión
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Ingresa a tu cuenta de Fintrack Pro para gestionar tus finanzas
          </p>
        </div>

        <!-- Google Auth Option -->
        <div class="space-y-3">
          <button
            type="button"
            (click)="loginWithGoogle()"
            [disabled]="isLoading()"
            class="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer disabled:opacity-50 hover:border-slate-300 dark:hover:border-slate-600"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div class="relative flex py-1 items-center">
            <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span class="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">o con email</span>
            <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <mat-icon class="text-base shrink-0 mt-0.5">error_outline</mat-icon>
            <span class="leading-relaxed">{{ errorMessage() }}</span>
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
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                class="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
            [disabled]="loginForm.invalid || isLoading()"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            @if (isLoading()) {
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loadingMessage() }}</span>
            } @else {
              <mat-icon class="text-base">login</mat-icon>
              <span>Iniciar Sesión</span>
            }
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

      <!-- Animated Modal / Overlay Loader while authenticating -->
      @if (isLoading()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
            <!-- Pulsing Icon Ring -->
            <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border-4 border-emerald-500/20 dark:border-emerald-500/10"></div>
              <div class="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <mat-icon class="text-2xl animate-pulse">lock</mat-icon>
              </div>
            </div>

            <div class="space-y-1.5">
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Iniciando Sesión
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 min-h-[20px] transition-all">
                {{ loadingMessage() }}
              </p>
            </div>

            <!-- Progress bar -->
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" [style.width.%]="progressPercent()"></div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly loadingMessage = signal<string>('Iniciando sesión...');
  readonly progressPercent = signal<number>(25);

  readonly loginForm = new FormGroup({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
  });

  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loadingMessage.set('Conectando con Google...');
    this.progressPercent.set(35);

    try {
      const res = await this.authService.loginWithGoogle();
      if (res.success) {
        this.progressPercent.set(90);
        this.loadingMessage.set('¡Autenticado con éxito! Entrando al panel...');
        await new Promise((r) => setTimeout(r, 400));
        await this.router.navigate(['/dashboard']);
      } else if (res.error) {
        this.errorMessage.set(res.error);
      }
    } catch (err: unknown) {
      console.error('Login with Google error:', err);
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al conectar con Google.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loadingMessage.set('Verificando credenciales...');
    this.progressPercent.set(30);

    try {
      const { email, password } = this.loginForm.getRawValue();

      this.loadingMessage.set('Autenticando en Firebase...');
      this.progressPercent.set(60);

      const res = await this.authService.login(email || '', password || '');

      if (res.success) {
        this.loadingMessage.set('Cargando tu información financiera...');
        this.progressPercent.set(85);

        await new Promise((r) => setTimeout(r, 350));
        this.loadingMessage.set('¡Bienvenido! Entrando al panel...');
        this.progressPercent.set(100);

        await new Promise((r) => setTimeout(r, 300));
        const navigated = await this.router.navigate(['/dashboard']);
        if (!navigated) {
          window.location.href = '/dashboard';
        }
      } else {
        this.errorMessage.set(res.error || 'Error al iniciar sesión.');
        this.isLoading.set(false);
      }
    } catch (err: unknown) {
      console.error('Login submit error:', err);
      this.errorMessage.set(err instanceof Error ? err.message : 'Error inesperado al iniciar sesión.');
      this.isLoading.set(false);
    }
  }
}
