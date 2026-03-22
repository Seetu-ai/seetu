/**
 * GET /api/v1/admin/billboards/activity
 * Admin: Recent activity and alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return SUPERADMIN_EMAILS.includes(user.email);
}

type AlertType = 'critical' | 'warning' | 'info' | 'resolved';

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const alerts: any[] = [];

    // Offline billboards (critical)
    const offline = await prisma.billboard.findMany({
      where: { isActive: true, status: 'offline' },
      select: { id: true, name: true, slug: true, lastHeartbeat: true },
    });

    for (const b of offline) {
      alerts.push({
        id: `offline-${b.id}`,
        type: 'critical',
        title: `Billboard Offline: ${b.name}`,
        description: 'Connectivity lost. Heartbeat signal timed out.',
        timestamp: b.lastHeartbeat?.toISOString() || new Date().toISOString(),
        billboardId: b.slug,
        read: false,
      });
    }

    // Pending moderation with high risk (warning)
    const pending = await prisma.billboardContent.findMany({
      where: { status: 'pending_moderation' },
      select: { id: true, createdAt: true, moderationResult: true, whatsappName: true },
      take: 5,
    });

    for (const c of pending) {
      const risk = (c.moderationResult as any)?.risk_level;
      if (risk === 'high') {
        alerts.push({
          id: `mod-${c.id}`,
          type: 'critical',
          title: 'High Risk Content Detected',
          description: `AI scan flagged potentially non-compliant content from ${c.whatsappName || 'Unknown'}.`,
          timestamp: c.createdAt.toISOString(),
          read: false,
        });
      } else if (risk === 'medium') {
        alerts.push({
          id: `mod-${c.id}`,
          type: 'warning',
          title: 'Content Needs Review',
          description: 'Content requires manual moderation review.',
          timestamp: c.createdAt.toISOString(),
          read: false,
        });
      }
    }

    // Recent completed plays (resolved)
    const plays = await prisma.billboardQueue.findMany({
      where: { status: 'completed', endedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: { billboard: { select: { name: true } } },
      take: 3,
    });

    for (const p of plays) {
      alerts.push({
        id: `play-${p.id}`,
        type: 'resolved',
        title: `Content Displayed: ${p.billboard.name}`,
        description: 'Ad played successfully.',
        timestamp: p.endedAt?.toISOString() || new Date().toISOString(),
        read: true,
      });
    }

    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const stats = {
      total: alerts.length,
      critical: alerts.filter((a) => a.type === 'critical').length,
      warning: alerts.filter((a) => a.type === 'warning').length,
      info: alerts.filter((a) => a.type === 'info').length,
    };

    return NextResponse.json({ alerts: alerts.slice(0, 20), stats });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
