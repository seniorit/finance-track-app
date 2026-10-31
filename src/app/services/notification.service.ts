import { Injectable, signal, computed, inject } from '@angular/core';
import { PushNotificationItem, NotificationType } from '../models/notification.model';
import { SafeStorage } from '../core/utils/storage.util';
import { FirebaseService } from '../core/firebase/firebase.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly firebaseService = inject(FirebaseService);
  private getStorageKey(): string {
    const uid = this.firebaseService.auth?.currentUser?.uid;
    return uid ? `fintrack_${uid}_notifications` : 'fintrack_notifications';
  }

  readonly notifications = signal<PushNotificationItem[]>(
    SafeStorage.getItem<PushNotificationItem[]>(this.getStorageKey(), [
      {
        id: 'notif_welcome',
        title: '¡Bienvenido a Fintrack Pro!',
        body: 'Tu cuenta ha sido creada exitosamente. Comienza vinculando tu primera cuenta bancaria o registrando tus movimientos.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'system',
        icon: 'verified',
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

    const uid = this.firebaseService.auth?.currentUser?.uid;
    if (uid) {
      newNotif.userId = uid;
      if (this.firebaseService.isBrowser) {
        this.firebaseService.setSubDoc(
          `users/${uid}/notifications`,
          newNotif.id,
          newNotif as unknown as Record<string, unknown>
        );
      }
    }

    // Update in-app state
    this.notifications.update((list) => {
      const updated = [newNotif, ...list];
      SafeStorage.setItem(this.getStorageKey(), updated.slice(0, 50));
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
    const uid = this.firebaseService.auth?.currentUser?.uid;
    if (uid && this.firebaseService.isBrowser) {
      this.firebaseService.updateSubDoc(`users/${uid}/notifications`, id, {
        id,
        userId: uid,
        read: true,
      });
    }

    this.notifications.update((list) => {
      const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      SafeStorage.setItem(this.getStorageKey(), updated);
      return updated;
    });
  }

  markAllAsRead(): void {
    const uid = this.firebaseService.auth?.currentUser?.uid;
    const current = this.notifications();
    if (uid && this.firebaseService.isBrowser) {
      for (const n of current) {
        if (!n.read) {
          this.firebaseService.updateSubDoc(`users/${uid}/notifications`, n.id, {
            id: n.id,
            userId: uid,
            read: true,
          });
        }
      }
    }

    this.notifications.update((list) => {
      const updated = list.map((n) => ({ ...n, read: true }));
      SafeStorage.setItem(this.getStorageKey(), updated);
      return updated;
    });
  }

  deleteNotification(id: string): void {
    const uid = this.firebaseService.auth?.currentUser?.uid;
    if (uid && this.firebaseService.isBrowser) {
      this.firebaseService.deleteSubDoc(`users/${uid}/notifications`, id);
    }

    this.notifications.update((list) => {
      const updated = list.filter((n) => n.id !== id);
      SafeStorage.setItem(this.getStorageKey(), updated);
      return updated;
    });
  }

  clearAll(): void {
    const uid = this.firebaseService.auth?.currentUser?.uid;
    const current = this.notifications();
    if (uid && this.firebaseService.isBrowser) {
      for (const n of current) {
        this.firebaseService.deleteSubDoc(`users/${uid}/notifications`, n.id);
      }
    }

    this.notifications.set([]);
    SafeStorage.setItem(this.getStorageKey(), []);
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
