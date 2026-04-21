import type { Commande, NotifyBefore } from '../types';

const STORAGE_KEY = 'e1d_notif_schedule_v1';

interface ScheduledNotif {
  id: string;
  commandeId: string;
  clientName: string;
  deliveryDate: string;
  notifyAt: string;
  shown: boolean;
}

function loadSchedule(): ScheduledNotif[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveSchedule(s: ScheduledNotif[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function buildNotifyAt(deliveryDate: string, daysBefore: NotifyBefore): string {
  const d = new Date(deliveryDate);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

function itemsSummary(commande: Commande): string {
  const parts = commande.items.map(i => `${i.quantity}× ${i.dessertName}`);
  if (parts.length <= 2) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`;
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function scheduleCommandeNotifications(commande: Commande) {
  const existing = loadSchedule().filter(n => n.commandeId !== commande.id);
  if (commande.notifyBefore.length === 0) { saveSchedule(existing); return; }
  const newNotifs: ScheduledNotif[] = commande.notifyBefore.map(d => ({
    id: `${commande.id}-${d}`,
    commandeId: commande.id,
    clientName: commande.clientName,
    deliveryDate: commande.deliveryDate,
    notifyAt: buildNotifyAt(commande.deliveryDate, d),
    shown: false,
  }));
  saveSchedule([...existing, ...newNotifs]);
}

export function removeCommandeNotifications(commandeId: string) {
  saveSchedule(loadSchedule().filter(n => n.commandeId !== commandeId));
}

export function checkAndFireNotifications(commandes: Commande[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const schedule = loadSchedule();
  let changed = false;

  for (const notif of schedule) {
    if (notif.shown || new Date(notif.notifyAt) > now) continue;
    const cmd = commandes.find(c => c.id === notif.commandeId);
    if (!cmd || cmd.status === 'delivered') { notif.shown = true; changed = true; continue; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deliv = new Date(notif.deliveryDate); deliv.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((deliv.getTime() - today.getTime()) / 86400000);
    const timeLabel = daysLeft === 0 ? "Livraison aujourd'hui !" :
      daysLeft === 1 ? 'Livraison demain' : `Livraison dans ${daysLeft}j`;

    try {
      new Notification(`${timeLabel} — ${notif.clientName}`, {
        body: itemsSummary(cmd),
        icon: '/apple-touch-icon.png',
        tag: notif.id,
      });
    } catch {}
    notif.shown = true; changed = true;
  }
  if (changed) saveSchedule(schedule);
}

export function syncAllNotifications(commandes: Commande[]) {
  const existing = loadSchedule();
  const existingIds = new Set(existing.map(n => n.id));
  const now = new Date();
  const activeIds = new Set(commandes.filter(c => c.status !== 'delivered').map(c => c.id));
  const pruned = existing.filter(n => activeIds.has(n.commandeId) || n.shown);
  const toAdd: ScheduledNotif[] = [];

  for (const cmd of commandes) {
    if (cmd.status === 'delivered') continue;
    for (const d of cmd.notifyBefore) {
      const id = `${cmd.id}-${d}`;
      if (!existingIds.has(id)) {
        const notifyAt = buildNotifyAt(cmd.deliveryDate, d);
        if (new Date(notifyAt) > now) {
          toAdd.push({ id, commandeId: cmd.id, clientName: cmd.clientName, deliveryDate: cmd.deliveryDate, notifyAt, shown: false });
        }
      }
    }
  }
  saveSchedule([...pruned, ...toAdd]);
}
