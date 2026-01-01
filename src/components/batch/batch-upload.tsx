'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Image,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadedUrl?: string;
  error?: string;
}

interface BatchUploadProps {
  maxFiles?: number;
  onFilesUploaded: (files: { url: string; name: string }[]) => void;
}

export function BatchUpload({ maxFiles = 20, onFilesUploaded }: BatchUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.slice(0, maxFiles - files.length).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      }));

      if (acceptedFiles.length > maxFiles - files.length) {
        toast.warning(`Maximum ${maxFiles} fichiers autorisés`);
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles || isUploading,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async () => {
    setIsUploading(true);

    const pendingFiles = files.filter((f) => f.status === 'pending');
    const uploadedUrls: { url: string; name: string }[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileData = pendingFiles[i];
      const fileIndex = files.indexOf(fileData);

      // Mark as uploading
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[fileIndex] = { ...newFiles[fileIndex], status: 'uploading' };
        return newFiles;
      });

      try {
        const formData = new FormData();
        formData.append('file', fileData.file);

        const res = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Mark as uploaded
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            status: 'uploaded',
            uploadedUrl: data.url,
          };
          return newFiles;
        });

        uploadedUrls.push({ url: data.url, name: fileData.file.name });
      } catch (err) {
        // Mark as error
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            status: 'error',
            error: err instanceof Error ? err.message : 'Erreur',
          };
          return newFiles;
        });
      }
    }

    setIsUploading(false);

    if (uploadedUrls.length > 0) {
      toast.success(`${uploadedUrls.length} fichiers uploadés`);
      onFilesUploaded(uploadedUrls);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadedCount = files.filter((f) => f.status === 'uploaded').length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-violet-600 bg-violet-50'
            : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50',
          (files.length >= maxFiles || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-700 font-medium">
          {isDragActive
            ? 'Déposez les images ici...'
            : 'Glissez-déposez vos images ou cliquez pour sélectionner'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          PNG, JPG, WEBP - Maximum {maxFiles} fichiers
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {files.length} / {maxFiles} fichiers sélectionnés
        </p>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {files.map((fileData, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
            >
              <img
                src={fileData.preview}
                alt=""
                className="w-full h-full object-cover"
              />

              {/* Status overlay */}
              {fileData.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
              {fileData.status === 'uploaded' && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
              {fileData.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
              )}

              {/* Remove button */}
              {fileData.status !== 'uploading' && (
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            {pendingCount > 0 && <span>{pendingCount} en attente</span>}
            {uploadedCount > 0 && (
              <span className="text-green-600 ml-2">
                {uploadedCount} uploadés
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                files.forEach((f) => URL.revokeObjectURL(f.preview));
                setFiles([]);
              }}
              disabled={isUploading}
            >
              Effacer tout
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={isUploading || pendingCount === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader {pendingCount} fichiers
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
