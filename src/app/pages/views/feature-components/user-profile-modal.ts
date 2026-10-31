import { Component, inject, output, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

@Component({
  selector: 'app-user-profile-modal',
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      (click)="onBackdropClick($event)"
      (keydown.escape)="closeModal.emit()"
      tabindex="0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
        role="document"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <mat-icon>manage_accounts</mat-icon>
            </div>
            <div>
              <h2 id="profile-modal-title" class="text-base font-bold text-slate-900 dark:text-white">
                Editar Perfil de Usuario
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Actualiza tu nombre, foto de perfil y preferencias personales
              </p>
            </div>
          </div>

          <button
            (click)="closeModal.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 overflow-y-auto space-y-5 flex-1">
          <!-- Avatar Preview and Upload Section -->
          <div class="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <div class="relative group shrink-0">
              <img
                [src]="avatarPreview()"
                alt="Vista previa de perfil"
                referrerpolicy="no-referrer"
                class="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shadow-emerald-500/20"
              />
              <label
                for="avatar-file-upload"
                class="absolute inset-0 bg-slate-950/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Cambiar foto"
              >
                <mat-icon class="text-lg">photo_camera</mat-icon>
                <span class="text-[9px] font-bold">Cambiar</span>
              </label>
              <input
                id="avatar-file-upload"
                type="file"
                accept="image/*"
                (change)="onFileSelected($event)"
                class="hidden"
              />
            </div>

            <div class="flex-1 text-center sm:text-left space-y-1.5">
              <p class="text-xs font-bold text-slate-900 dark:text-white">Foto de Perfil</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Puedes subir una foto desde tu equipo o elegir uno de los avatares predeterminados.
              </p>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label
                  for="avatar-file-upload"
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                >
                  <mat-icon class="text-sm">upload</mat-icon>
                  <span>Subir archivo</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Preset Avatars Selector -->
          <div>
            <span class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              O elige un avatar rápido:
            </span>
            <div class="flex items-center gap-2.5 overflow-x-auto pb-1">
              @for (preset of presetAvatars; track preset) {
                <button
                  type="button"
                  (click)="setPresetAvatar(preset)"
                  class="relative rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer p-0.5"
                  [class.border-emerald-500]="form.controls.avatar.value === preset"
                  [class.ring-2]="form.controls.avatar.value === preset"
                  [class.ring-emerald-500/30]="form.controls.avatar.value === preset"
                  [class.border-transparent]="form.controls.avatar.value !== preset"
                >
                  <img
                    [src]="preset"
                    alt="Preset avatar"
                    referrerpolicy="no-referrer"
                    class="w-10 h-10 rounded-lg object-cover"
                  />
                </button>
              }
            </div>
          </div>

          <!-- Custom Avatar URL -->
          <div>
            <label for="profile-avatar-url" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Enlace / URL de la imagen (opcional)
            </label>
            <input
              id="profile-avatar-url"
              type="url"
              formControlName="avatar"
              (input)="updateAvatarFromInput()"
              placeholder="https://..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono transition-colors"
            />
          </div>

          <!-- Name Input -->
          <div>
            <label for="profile-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nombre Completo *
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">person</mat-icon>
              </span>
              <input
                id="profile-name"
                type="text"
                formControlName="name"
                placeholder="Tu nombre completo"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <p class="text-xs text-rose-500 mt-1">El nombre debe tener al menos 2 caracteres.</p>
            }
          </div>

          <!-- Email Input -->
          <div>
            <label for="profile-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Correo Electrónico *
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <mat-icon class="text-base">mail</mat-icon>
              </span>
              <input
                id="profile-email"
                type="email"
                formControlName="email"
                placeholder="tu@correo.com"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <!-- Currency & Monthly Target -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="profile-currency" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Moneda Predilecta
              </label>
              <select
                id="profile-currency"
                formControlName="currency"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              >
                <option value="VES">VES (Bs.) - Bolívares (Tasa Dólar BCV)</option>
                <option value="USD">USD ($) - Dólar Estadounidense</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="COP">COP ($) - Peso Colombiano</option>
              </select>
            </div>

            <div>
              <label for="profile-target" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Presupuesto Mensual Base (Bs. VES)
              </label>
              <input
                id="profile-target"
                type="number"
                step="100"
                formControlName="totalMonthlyBudget"
                placeholder="146860"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="closeModal.emit()"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <mat-icon class="text-sm">save</mat-icon>
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class UserProfileModal implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly closeModal = output<void>();

  readonly presetAvatars = PRESET_AVATARS;
  readonly avatarPreview = signal<string>(PRESET_AVATARS[0]);

  readonly form = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    avatar: new FormControl<string>('', { nonNullable: true }),
    currency: new FormControl<string>('VES', { nonNullable: true }),
    totalMonthlyBudget: new FormControl<number>(146860, [Validators.required, Validators.min(100)]),
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        currency: user.preferences?.currency || 'VES',
        totalMonthlyBudget: user.totalMonthlyBudget || 146860,
      });
      this.avatarPreview.set(user.avatar || PRESET_AVATARS[0]);
    }
  }

  setPresetAvatar(url: string): void {
    this.form.controls.avatar.setValue(url);
    this.avatarPreview.set(url);
  }

  updateAvatarFromInput(): void {
    const val = this.form.controls.avatar.value;
    if (val && (val.startsWith('http') || val.startsWith('data:image'))) {
      this.avatarPreview.set(val);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.form.controls.avatar.setValue(result);
        this.avatarPreview.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    const currentUser = this.authService.currentUser();

    this.authService.updateProfile({
      name: (val.name || '').trim(),
      email: (val.email || '').trim().toLowerCase(),
      avatar: val.avatar || this.avatarPreview(),
      totalMonthlyBudget: Number(val.totalMonthlyBudget) || 146860,
      preferences: {
        ...(currentUser?.preferences || {
          theme: 'system',
          pushNotificationsEnabled: true,
          budgetAlertsEnabled: true,
          bankSyncFrequency: 'instant',
          currency: 'VES',
        }),
        currency: val.currency || 'VES',
      },
    });

    this.notificationService.sendNotification(
      'Perfil Actualizado',
      'Tu nombre, foto y detalles de usuario han sido guardados correctamente.',
      'system',
      'account_circle'
    );

    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }
}
