'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Shield,
  DollarSign,
  Users,
  Server,
  Database,
  Cloud,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  lastActive: string;
  status: 'active' | 'suspended';
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'moderation' | 'pricing' | 'users' | 'system'>('moderation');
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: settingsData, isLoading: settingsLoading } = useSWR('/api/v1/admin/billboards/settings', fetcher);
  const { data: usersData, isLoading: usersLoading } = useSWR('/api/v1/admin/billboards/settings/users', fetcher);
  const { data: healthData, isLoading: healthLoading } = useSWR('/api/v1/admin/billboards/settings/health', fetcher);

  const [moderationSettings, setModerationSettings] = useState({
    autoApproveThreshold: settingsData?.moderation?.autoApproveThreshold || 85,
    autoRejectThreshold: settingsData?.moderation?.autoRejectThreshold || 30,
    nudityThreshold: settingsData?.moderation?.nudityThreshold || 15,
    violenceThreshold: settingsData?.moderation?.violenceThreshold || 20,
    politicalThreshold: settingsData?.moderation?.politicalThreshold || 25,
    aiEnabled: settingsData?.moderation?.aiEnabled ?? true,
  });

  const [pricingSettings, setPricingSettings] = useState({
    basePricePerSlot: settingsData?.pricing?.basePricePerSlot || 5000,
    premiumMultiplier: settingsData?.pricing?.premiumMultiplier || 1.5,
    rushMultiplier: settingsData?.pricing?.rushMultiplier || 2.0,
    weekendMultiplier: settingsData?.pricing?.weekendMultiplier || 1.25,
    bulkDiscount5: settingsData?.pricing?.bulkDiscount5 || 10,
    bulkDiscount10: settingsData?.pricing?.bulkDiscount10 || 20,
  });

  const adminUsers: AdminUser[] = usersData?.users || [];

  const systemHealth = healthData || {
    api: { status: 'unknown', latency: 0, uptime: 0 },
    database: { status: 'unknown', connections: 0, maxConnections: 0 },
    cdn: { status: 'unknown', bandwidth: '0 TB', cacheHitRate: 0 },
    redis: { status: 'unknown', memory: '0 MB', keys: 0 },
  };

  const isLoading = activeSection === 'users' ? usersLoading : activeSection === 'system' ? healthLoading : settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const roleStyles = {
    super_admin: 'bg-purple-100 text-purple-600 border-purple-200',
    admin: 'bg-red-100 text-red-600 border-red-200',
    moderator: 'bg-amber-100 text-amber-600 border-amber-200',
    viewer: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const renderSlider = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    description: string,
    color: string = '#dc2626'
  ) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="text-lg font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
        }}
      />
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Settings Sidebar */}
      <div className="col-span-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <nav className="p-2">
          {[
            { id: 'moderation', label: 'Moderation', icon: Shield, description: 'AI thresholds & rules' },
            { id: 'pricing', label: 'Pricing', icon: DollarSign, description: 'Rates & discounts' },
            { id: 'users', label: 'Access Control', icon: Users, description: 'Admin permissions' },
            { id: 'system', label: 'System Health', icon: Server, description: 'Infrastructure status' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors mb-1 ${
                activeSection === item.id
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className={`h-5 w-5 mt-0.5 ${activeSection === item.id ? 'text-red-600' : 'text-slate-500'}`} />
              <div>
                <p className={`text-sm font-bold ${activeSection === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-500">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors">
            <Save className="h-4 w-4" />
            Save All Changes
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="col-span-9 space-y-6">
        {activeSection === 'moderation' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Moderation Settings</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure AI-powered content moderation thresholds and rules</p>
            </div>

            {/* AI Toggle */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">AI-Assisted Moderation</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Use Gemini 3 Flash to analyze content automatically</p>
                  </div>
                </div>
                <button
                  onClick={() => setModerationSettings(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                  className={`w-14 h-8 rounded-full relative transition-colors ${
                    moderationSettings.aiEnabled ? 'bg-red-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 size-6 bg-white rounded-full shadow transition-transform ${
                    moderationSettings.aiEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Auto-moderation Thresholds */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Auto-Moderation Thresholds</h3>
              {renderSlider(
                'Auto-Approve Threshold',
                moderationSettings.autoApproveThreshold,
                (val) => setModerationSettings(prev => ({ ...prev, autoApproveThreshold: val })),
                'Content with safety score above this will be auto-approved',
                '#22c55e'
              )}
              {renderSlider(
                'Auto-Reject Threshold',
                moderationSettings.autoRejectThreshold,
                (val) => setModerationSettings(prev => ({ ...prev, autoRejectThreshold: val })),
                'Content with safety score below this will be auto-rejected',
                '#ef4444'
              )}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> Content scoring between {moderationSettings.autoRejectThreshold}% and {moderationSettings.autoApproveThreshold}% will require manual review.
                </p>
              </div>
            </div>

            {/* Category Thresholds */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Category Sensitivity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">Maximum allowed percentage for each category before flagging</p>
              {renderSlider(
                'Nudity / Adult Content',
                moderationSettings.nudityThreshold,
                (val) => setModerationSettings(prev => ({ ...prev, nudityThreshold: val })),
                'Skin exposure, suggestive imagery',
                '#ef4444'
              )}
              {renderSlider(
                'Violence / Graphic Content',
                moderationSettings.violenceThreshold,
                (val) => setModerationSettings(prev => ({ ...prev, violenceThreshold: val })),
                'Weapons, injuries, aggressive content',
                '#f97316'
              )}
              {renderSlider(
                'Political / Controversial',
                moderationSettings.politicalThreshold,
                (val) => setModerationSettings(prev => ({ ...prev, politicalThreshold: val })),
                'Political figures, parties, divisive topics',
                '#a855f7'
              )}
            </div>
          </>
        )}

        {activeSection === 'pricing' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pricing Configuration</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Set base rates and multipliers for billboard slots (FCFA)</p>
            </div>

            {/* Base Pricing */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Base Rates</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Base Price per Slot (FCFA)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricingSettings.basePricePerSlot}
                      onChange={(e) => setPricingSettings(prev => ({ ...prev, basePricePerSlot: Number(e.target.value) }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 text-lg font-mono focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">FCFA</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Standard 5-minute slot rate</p>
                </div>
              </div>
            </div>

            {/* Multipliers */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Rate Multipliers</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Premium Locations</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={pricingSettings.premiumMultiplier}
                      onChange={(e) => setPricingSettings(prev => ({ ...prev, premiumMultiplier: Number(e.target.value) }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 font-mono focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">x</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Plateau, Almadies</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Rush Hour</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={pricingSettings.rushMultiplier}
                      onChange={(e) => setPricingSettings(prev => ({ ...prev, rushMultiplier: Number(e.target.value) }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 font-mono focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">x</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">7-9 AM, 5-8 PM</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Weekend</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={pricingSettings.weekendMultiplier}
                      onChange={(e) => setPricingSettings(prev => ({ ...prev, weekendMultiplier: Number(e.target.value) }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3 px-4 font-mono focus:ring-2 focus:ring-red-500/50 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">x</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Saturday & Sunday</p>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-red-600 mb-4">Price Preview Calculator</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-xs mb-1">Standard Slot</p>
                  <p className="font-mono font-bold text-slate-900">{pricingSettings.basePricePerSlot.toLocaleString()} FCFA</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-xs mb-1">Premium Location</p>
                  <p className="font-mono font-bold text-slate-900">{(pricingSettings.basePricePerSlot * pricingSettings.premiumMultiplier).toLocaleString()} FCFA</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-xs mb-1">Rush Hour</p>
                  <p className="font-mono font-bold text-slate-900">{(pricingSettings.basePricePerSlot * pricingSettings.rushMultiplier).toLocaleString()} FCFA</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <p className="text-slate-500 text-xs mb-1">Premium + Rush</p>
                  <p className="font-mono font-bold text-slate-900">{(pricingSettings.basePricePerSlot * pricingSettings.premiumMultiplier * pricingSettings.rushMultiplier).toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'users' && (
          <>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Control</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage administrator accounts and permissions</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
                <Plus className="h-4 w-4" />
                Add Admin
              </button>
            </div>

            {/* Role Legend */}
            <div className="flex gap-4 flex-wrap">
              {[
                { role: 'super_admin', label: 'Super Admin', desc: 'Full system access' },
                { role: 'admin', label: 'Admin', desc: 'Manage content & users' },
                { role: 'moderator', label: 'Moderator', desc: 'Review content only' },
                { role: 'viewer', label: 'Viewer', desc: 'Read-only access' },
              ].map((item) => (
                <div key={item.role} className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded border ${roleStyles[item.role as keyof typeof roleStyles]}`}>
                    {item.label}
                  </span>
                  <span className="text-slate-500">{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Users Table */}
            {adminUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <Users className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Admin Users</h3>
                <p className="text-slate-500 dark:text-slate-400">Add your first admin user to get started</p>
              </div>
            ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${roleStyles[user.role]}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'active' ? (
                          <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                            <span className="size-2 bg-green-500 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                            <span className="size-2 bg-red-500 rounded-full" />
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{user.lastActive}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Edit className="h-4 w-4 text-slate-500" />
                          </button>
                          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Key className="h-4 w-4 text-slate-500" />
                          </button>
                          <button className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* API Keys */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">API Keys</h3>
                  <p className="text-sm text-slate-500">Manage programmatic access to the billboard API</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  <Plus className="h-4 w-4" />
                  Generate Key
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Production API Key</p>
                      <p className="text-xs text-slate-500">Created Jan 15, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                      {showApiKey ? 'bb_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' : '••••••••••••••••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'system' && (
          <>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Health</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Infrastructure monitoring and status</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-6">
              {/* API Status */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Server className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">API Server</p>
                      <p className="text-xs text-green-600 font-bold">Operational</p>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Response Time</span>
                    <span className="font-mono text-slate-900 dark:text-white">{systemHealth.api.latency}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Uptime (30d)</span>
                    <span className="font-mono text-green-600">{systemHealth.api.uptime}%</span>
                  </div>
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Database className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Database</p>
                      <p className="text-xs text-green-600 font-bold">Healthy</p>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Active Connections</span>
                    <span className="font-mono text-slate-900 dark:text-white">{systemHealth.database.connections}/{systemHealth.database.maxConnections}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(systemHealth.database.connections / systemHealth.database.maxConnections) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* CDN Status */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Cloud className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">CDN / Storage</p>
                      <p className="text-xs text-green-600 font-bold">Operational</p>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bandwidth (30d)</span>
                    <span className="font-mono text-slate-900 dark:text-white">{systemHealth.cdn.bandwidth}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cache Hit Rate</span>
                    <span className="font-mono text-green-600">{systemHealth.cdn.cacheHitRate}%</span>
                  </div>
                </div>
              </div>

              {/* Redis Status */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Redis / Queue</p>
                      <p className="text-xs text-green-600 font-bold">Connected</p>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Memory Usage</span>
                    <span className="font-mono text-slate-900 dark:text-white">{systemHealth.redis.memory}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Keys</span>
                    <span className="font-mono text-slate-900 dark:text-white">{systemHealth.redis.keys.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Recent Incidents</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Scheduled Maintenance Completed</p>
                      <span className="text-xs text-slate-500">Jan 15, 2024 02:00 GMT</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Database optimization and index rebuild completed successfully. No downtime reported.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Elevated API Latency</p>
                      <span className="text-xs text-slate-500">Jan 12, 2024 14:32 GMT</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Brief spike in response times (avg 250ms) due to traffic surge. Auto-scaled within 5 minutes.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
