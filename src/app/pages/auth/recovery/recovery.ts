import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recovery',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-2">
            <mat-icon class="text-2xl">lock_reset</mat-icon>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Recuperar Contraseña
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Ingresa tu correo para recibir instrucciones de acceso
          </p>
        </div>

        @if (feedbackMessage()) {
          <div
            class="p-3.5 rounded-2xl border text-xs flex items-start gap-2.5"
            [class.bg-emerald-50]="isSuccess()"
            [class.border-emerald-200]="isSuccess()"
            [class.text-emerald-800]="isSuccess()"
            [class.dark:bg-emerald-950/40]="isSuccess()"
            [class.dark:border-emerald-900]="isSuccess()"
            [class.bg-rose-50]="!isSuccess()"
            [class.border-rose-200]="!isSuccess()"
            [class.text-rose-800]="!isSuccess()"
          >
            <mat-icon class="text-base shrink-0">{{ isSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            <p>{{ feedbackMessage() }}</p>
          </div>
        }

        <!-- Form -->
        <form [formGroup]="recoveryForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="recovery-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">mail</mat-icon>
              </span>
              <input
                id="recovery-email"
                type="email"
                formControlName="email"
                placeholder="tu@correo.com"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="recoveryForm.invalid"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <mat-icon class="text-base">send</mat-icon>
            <span>Enviar Enlace de Recuperación</span>
          </button>
        </form>

        <div class="text-center pt-2 border-t border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            ¿Recordaste tu contraseña?
            <a routerLink="/auth/login" class="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              Volver a iniciar sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class Recovery {
  private readonly authService = inject(AuthService);

  readonly feedbackMessage = signal<string>('');
  readonly isSuccess = signal<boolean>(false);

  readonly recoveryForm = new FormGroup({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
  });

  onSubmit(): void {
    if (this.recoveryForm.invalid) return;
    const { email } = this.recoveryForm.getRawValue();
    const res = this.authService.recoverPassword(email || '');
    this.isSuccess.set(res.success);
    this.feedbackMessage.set(res.message);
  }
}
