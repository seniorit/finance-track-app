import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
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
            Crear Nueva Cuenta
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Comienza a controlar tus finanzas personales y presupuestos
          </p>
        </div>

        @if (errorMessage()) {
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <mat-icon class="text-sm">error</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="reg-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nombre Completo
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">person</mat-icon>
              </span>
              <input
                id="reg-name"
                type="text"
                formControlName="name"
                placeholder="Carlos Santana"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label for="reg-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">mail</mat-icon>
              </span>
              <input
                id="reg-email"
                type="email"
                formControlName="email"
                placeholder="carlos@correo.com"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="reg-pass" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                id="reg-pass"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label for="reg-currency" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Moneda Principal
              </label>
              <select
                id="reg-currency"
                formControlName="currency"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              >
                <option value="EUR">EUR (€) - Euro</option>
                <option value="USD">USD ($) - Dólar</option>
                <option value="GBP">GBP (£) - Libra</option>
                <option value="MXN">MXN ($) - Peso Mex</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="registerForm.invalid"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <mat-icon class="text-base">how_to_reg</mat-icon>
            <span>Crear Mi Cuenta</span>
          </button>
        </form>

        <div class="text-center pt-2 border-t border-slate-200 dark:border-slate-800">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            ¿Ya tienes una cuenta?
            <a routerLink="/auth/login" class="font-bold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              Iniciar Sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string>('');

  readonly registerForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
    currency: new FormControl<string>('EUR', { nonNullable: true }),
  });

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    const { name, email, password, currency } = this.registerForm.getRawValue();
    const res = this.authService.register(name || '', email || '', password || '', currency || 'EUR');
    if (res.success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(res.error || 'Error al registrar usuario.');
    }
  }
}
