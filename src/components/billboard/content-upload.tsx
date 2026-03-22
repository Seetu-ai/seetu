'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ContentUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  maxSizeMB?: number;
  maxDurationSeconds?: number;
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
const DEFAULT_MAX_SIZE_MB = 50;
const DEFAULT_MAX_DURATION = 60;

export function ContentUpload({
  onUpload,
  isUploading = false,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  maxDurationSeconds = DEFAULT_MAX_DURATION,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: ContentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const validateFile = async (selectedFile: File): Promise<boolean> => {
    setError(null);

    // Check type
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou MP4.');
      return false;
    }

    // Check size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      return false;
    }

    // For videos, check duration
    if (selectedFile.type.startsWith('video/')) {
      const duration = await getVideoDuration(selectedFile);
      if (duration > maxDurationSeconds) {
        setError(`Vidéo trop longue (max ${maxDurationSeconds}s)`);
        return false;
      }
      setVideoDuration(Math.round(duration));
    }

    return true;
  };

  const getVideoDuration = (videoFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isValid = await validateFile(selected);
    if (!isValid) {
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;

    const isValid = await validateFile(dropped);
    if (!isValid) {
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(dropped);
    setPreview(URL.createObjectURL(dropped));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setVideoDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    await onUpload(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Téléchargez votre publicité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-violet-400 transition-colors"
          >
            <Upload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="font-medium text-slate-700">
              Cliquez ou glissez un fichier ici
            </p>
            <p className="text-sm text-slate-500 mt-1">
              JPG, PNG ou MP4 (max {maxSizeMB}MB, vidéo max {maxDurationSeconds}s)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
              {file.type.startsWith('video/') ? (
                <video
                  ref={videoRef}
                  src={preview!}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={preview!}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
              <Badge className="absolute top-2 left-2 bg-black/50 text-white">
                {file.type.startsWith('video/') ? (
                  <>
                    <Video className="h-3 w-3 mr-1" />
                    Vidéo {videoDuration && `(${videoDuration}s)`}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Image
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span className="truncate max-w-[60%]">{file.name}</span>
              <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearFile}
                disabled={isUploading}
              >
                Changer
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Télécharger
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
