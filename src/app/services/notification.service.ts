import { Injectable, signal, computed } from '@angular/core';
import { PushNotificationItem, NotificationType } from '../models/notification.model';
import { SafeStorage } from '../core/utils/storage.util';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly STORAGE_KEY = 'fintrack_notifications';

  readonly notifications = signal<PushNotificationItem[]>(
    SafeStorage.getItem<PushNotificationItem[]>(this.STORAGE_KEY, [
      {
        id: 'notif_welcome',
        title: '¡Bienvenido a Fintrack Pro!',
        body: 'Tu cuenta y sincronización bancaria están activas. Disfruta del control total de tus finanzas.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'system',
        icon: 'verified',
      },
      {
        id: 'notif_sample_budget',
        title: 'Alerta de Presupuesto',
        body: 'Has alcanzado el 82% del presupuesto en Alimentación este mes.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        read: false,
        type: 'budget_alert',
        icon: 'warning',
      },
    ])
  );

  readonly hasPushPermission = signal<boolean>(false);
  readonly pushSupported = signal<boolean>(typeof window !== 'undefined' && 'Notification' in window);

  readonly unreadCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  constructor() {
    this.checkPermission();
  }

  private checkPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPushPermission.set(Notification.permission === 'granted');
    }
  }

  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.sendNotification(
        'Notificaciones en App Activadas',
        'Las alertas en tiempo real se mostrarán en la aplicación.',
        'system',
        'notifications_active'
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.hasPushPermission.set(granted);

      if (granted) {
        this.sendNotification(
          '¡Notificaciones Push Activadas!',
          'Recibirás alertas instantáneas cuando superes presupuestos o se sincronicen tus bancos.',
          'system',
          'notifications_active'
        );
      }
      return granted;
    } catch {
      return false;
    }
  }

  sendNotification(
    title: string,
    body: string,
    type: NotificationType = 'system',
    iconName = 'notifications'
  ): void {
    const newNotif: PushNotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
      type,
      icon: iconName,
    };

    // Update in-app state
    this.notifications.update((list) => {
      const updated = [newNotif, ...list];
      SafeStorage.setItem(this.STORAGE_KEY, updated.slice(0, 50));
      return updated;
    });

    // Play subtle audio chime if user enabled sound
    this.playNotificationSound();

    // Trigger native browser notification if granted
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: newNotif.id,
        });
      } catch (err) {
        console.warn('Native push notification error', err);
      }
    }
  }

  markAsRead(id: string): void {
    this.notifications.update((list) => {
      const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });
  }

  markAllAsRead(): void {
    this.notifications.update((list) => {
      const updated = list.map((n) => ({ ...n, read: true }));
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });
  }

  deleteNotification(id: string): void {
    this.notifications.update((list) => {
      const updated = list.filter((n) => n.id !== id);
      SafeStorage.setItem(this.STORAGE_KEY, updated);
      return updated;
    });
  }

  clearAll(): void {
    this.notifications.set([]);
    SafeStorage.setItem(this.STORAGE_KEY, []);
  }

  private playNotificationSound(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio playback silently skipped if prohibited by browser policy
    }
  }
}
