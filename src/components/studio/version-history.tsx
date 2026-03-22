'use client';

import { useWizardStore } from '@/lib/stores/wizard-store';
import { Clock, Maximize2, Layers, PanelRightClose, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ImagePreview } from '@/components/ui/image-preview';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

interface VersionHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function VersionHistory({ isOpen, onToggle }: VersionHistoryProps) {
  const { generatedImages, activeGeneratedImageIndex, setActiveGeneratedImage } = useWizardStore();
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Single click selects version for editing
  const handleVersionClick = (index: number) => {
    setActiveGeneratedImage(index);
  };

  // Double click or button opens fullscreen preview
  const handleOpenPreview = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIndex(index);
    setShowPreview(true);
  };

  // Reverse to show newest first, but keep track of original index
  const versionsWithIndex = generatedImages.map((img, idx) => ({
    ...img,
    originalIndex: idx,
    versionNumber: idx + 1,
  })).reverse();

  // Current is the actively selected one, not just the latest
  const currentVersionIndex = activeGeneratedImageIndex;

  // Collapsed state - just show toggle button
  if (!isOpen) {
    return (
      <aside className="w-12 bg-white border-l border-slate-200 flex flex-col h-full">
        <div className="px-2 py-4 border-b border-slate-100">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            title="Afficher l'historique"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header with toggle */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              title="Masquer l'historique"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
            <h3 className="font-semibold text-slate-900 text-sm tracking-wide uppercase">
              Historique
            </h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {generatedImages.length} version{generatedImages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {versionsWithIndex.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">
              Les versions futures apparaîtront ici.
            </p>
          </div>
        ) : (
          versionsWithIndex.map((version) => {
            const isCurrentVersion = version.originalIndex === currentVersionIndex;

            return (
              <button
                key={version.originalIndex}
                onClick={() => handleVersionClick(version.originalIndex)}
                className={cn(
                  'w-full rounded-xl overflow-hidden border-2 transition-all hover:shadow-md text-left',
                  isCurrentVersion
                    ? 'border-violet-400 bg-violet-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-slate-100 group">
                  <img
                    src={version.url}
                    alt={`Version ${version.versionNumber}`}
                    className="w-full h-full object-cover"
                  />
                  {isCurrentVersion && (
                    <div className="absolute top-2 left-2 bg-violet-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Actuel
                    </div>
                  )}
                  {/* Zoom button on hover */}
                  <div
                    onClick={(e) => handleOpenPreview(version.originalIndex, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg cursor-pointer"
                    title="Voir en grand"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Version Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 text-sm">
                      Version {version.versionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(version.createdAt)}</span>
                  </div>
                  {version.feedback ? (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {truncateText(version.feedback, 60)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {version.versionNumber === 1 ? 'Première ébauche' : 'Sans commentaire'}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {generatedImages.length > 1 && (
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={() => {
              setPreviewIndex(activeGeneratedImageIndex);
              setShowPreview(true);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-violet-600 transition-colors py-2"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Comparer les versions</span>
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      <ImagePreview
        images={generatedImages.map((img, idx) => ({
          url: img.url,
          alt: `Version ${idx + 1}`,
          id: `version-${idx}`,
        }))}
        initialIndex={previewIndex}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </aside>
  );
}
