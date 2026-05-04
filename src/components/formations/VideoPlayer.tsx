import React, { useState } from 'react';
import { Lock, Play, CheckCircle2, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  locked: boolean;
  title: string;
  completed: boolean;
  onComplete: () => void;
  loading?: boolean;
}

function getEmbedUrl(url: string): string {
  if (!url) return '';
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0&enablejsapi=1`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Direct URL (mp4 etc.)
  return url;
}

export default function VideoPlayer({ videoUrl, locked, title, completed, onComplete, loading }: VideoPlayerProps) {
  const [markedComplete, setMarkedComplete] = useState(false);
  const embedUrl = getEmbedUrl(videoUrl);
  const isDirect = !embedUrl.includes('youtube') && !embedUrl.includes('vimeo') && embedUrl.endsWith('.mp4');

  const handleMarkComplete = async () => {
    setMarkedComplete(true);
    await onComplete();
  };

  if (locked) {
    return (
      <div className="relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-4">
        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
          <Lock className="h-10 w-10 text-white/60" />
        </div>
        <div className="text-center px-6">
          <p className="text-white font-black text-lg">Contenu verrouillé</p>
          <p className="text-white/50 text-sm mt-1">Achetez cette formation pour accéder à la vidéo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl">
        {isDirect ? (
          <video controls className="w-full h-full" src={embedUrl} />
        ) : (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-bold text-dark truncate max-w-[70%]">{title}</p>
        {completed || markedComplete ? (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4" />
            Terminé
          </div>
        ) : (
          <button
            onClick={handleMarkComplete}
            disabled={loading || markedComplete}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Marquer comme terminé
          </button>
        )}
      </div>
    </div>
  );
}
