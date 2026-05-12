import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Play, CheckCircle2, Lock, Clock, Loader2,
  BookOpen, Menu, X, ChevronRight, ChevronDown, ChevronUp,
  Layers, FileText, Download, Trophy, AlertCircle, RotateCcw,
  Video, ExternalLink, Maximize2, List
} from 'lucide-react';
import { Formation, FormationModule, FormationChapter } from '../types';
import { Client } from '../types';
import { toast } from 'sonner';

interface CoursePlayerProps {
  formation: Formation;
  loggedClient: Client;
  onBack: () => void;
}

type VideoInfo =
  | { type: 'youtube'; videoId: string }
  | { type: 'vimeo'; videoId: string }
  | { type: 'direct'; url: string }
  | null;

function parseVideoUrl(url: string): VideoInfo {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return { type: 'youtube', videoId: ytMatch[1] };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', videoId: vimeoMatch[1] };
  if (url.startsWith('http')) return { type: 'direct', url };
  return null;
}

function getSortedModules(formation: Formation): FormationModule[] {
  return [...(formation.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function CoursePlayer({ formation, loggedClient, onBack }: CoursePlayerProps) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [lastPositionSeconds, setLastPositionSeconds] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [marking, setMarking] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileLessonOpen, setMobileLessonOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [navigating, setNavigating] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const positionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const modules = getSortedModules(formation);
  const currentModule = modules.find(m => m.id === currentModuleId) ?? null;
  const videoInfo = currentModule?.videoUrl ? parseVideoUrl(currentModule.videoUrl) : null;
  const currentIdx = modules.findIndex(m => m.id === currentModuleId);

  const videoModules = modules.filter(m => !!m.videoUrl);
  const totalVideoModules = videoModules.length;
  const completedVideoCount = videoModules.filter(m => m.id && completedIds.includes(m.id)).length;
  const progressPct = totalVideoModules > 0 ? Math.round((completedVideoCount / totalVideoModules) * 100) : 0;

  const isLocked = useCallback((mod: FormationModule, idx: number): boolean => {
    if (idx === 0) return false;
    const prev = modules[idx - 1];
    return !completedIds.includes(prev?.id ?? '');
  }, [modules, completedIds]);

  const isCompleted = (mod: FormationModule) => completedIds.includes(mod.id ?? '');

  // ── Load progress ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedClient?.id || !formation.id) return;
    fetch(`/api/formations/progress/${loggedClient.id}/${formation.id}`)
      .then(r => r.json())
      .then(data => {
        const prog = data.progress;
        if (prog) {
          setCompletedIds(prog.completedModuleIds ?? []);
          const startId = prog.currentModuleId ?? modules[0]?.id;
          if (startId) setCurrentModuleId(startId);
          setLastPositionSeconds(prog.lastPositionSeconds ?? 0);
        } else {
          if (modules[0]) setCurrentModuleId(modules[0].id ?? null);
        }
        const chapterMap: Record<string, boolean> = {};
        formation.chapters?.forEach(c => { chapterMap[c.id] = true; });
        if (!formation.chapters?.length) chapterMap['__default'] = true;
        setExpandedChapters(chapterMap);
      })
      .catch(() => {
        if (modules[0]) setCurrentModuleId(modules[0].id ?? null);
      })
      .finally(() => setLoadingProgress(false));
  }, [loggedClient.id, formation.id]);

  // ── Save watch position ────────────────────────────────────────────────────
  const savePosition = useCallback((seconds: number) => {
    if (!loggedClient?.id || !formation.id || !currentModuleId) return;
    if (positionTimerRef.current) clearTimeout(positionTimerRef.current);
    positionTimerRef.current = setTimeout(() => {
      fetch('/api/formations/progress/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: loggedClient.id,
          formationId: formation.id,
          moduleId: currentModuleId,
          positionSeconds: Math.floor(seconds),
        }),
      }).catch(() => {});
    }, 4000);
  }, [loggedClient.id, formation.id, currentModuleId]);

  // ── Mark lesson complete ───────────────────────────────────────────────────
  const markComplete = useCallback(async (moduleId?: string, autoAdvance = true) => {
    const targetId = moduleId ?? currentModuleId;
    if (!targetId || completedIds.includes(targetId) || !loggedClient?.id || !formation.id) return;
    setMarking(true);
    setJustCompleted(false);
    try {
      await fetch('/api/formations/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedClient.id, formationId: formation.id, moduleId: targetId }),
      });
      setCompletedIds(prev => [...prev, targetId]);
      setJustCompleted(true);
      if (autoAdvance) {
        const idx = modules.findIndex(m => m.id === targetId);
        if (idx < modules.length - 1) {
          setTimeout(() => {
            setCurrentModuleId(modules[idx + 1].id ?? null);
            setJustCompleted(false);
          }, 1600);
        }
      }
    } catch {
      toast.error('Erreur lors de la mise à jour de la progression.');
    } finally {
      setMarking(false);
    }
  }, [currentModuleId, completedIds, loggedClient.id, formation.id, modules]);

  // ── YouTube end detection ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.event === 'onStateChange' && data?.info === 0) {
          markComplete();
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [markComplete]);

  // ── Resume direct video position ───────────────────────────────────────────
  useEffect(() => {
    if (videoInfo?.type === 'direct' && videoRef.current && lastPositionSeconds > 5) {
      videoRef.current.currentTime = lastPositionSeconds;
    }
  }, [currentModuleId]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const scrollTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToModule = (mod: FormationModule, idx: number) => {
    if (isLocked(mod, idx)) {
      toast.error('🔒 Terminez la leçon précédente pour débloquer celle-ci.');
      return;
    }
    setCurrentModuleId(mod.id ?? null);
    setJustCompleted(false);
    // On mobile: close lesson panel and scroll to top
    setMobileLessonOpen(false);
    scrollTop();
  };

  const goNext = async () => {
    if (currentIdx === -1 || currentIdx >= modules.length - 1) return;
    const next = modules[currentIdx + 1];
    const nextIdx = currentIdx + 1;

    // If current is already completed → navigate directly
    if (isCompleted(currentModule!)) {
      if (!isLocked(next, nextIdx)) {
        setCurrentModuleId(next.id ?? null);
        scrollTop();
      } else {
        toast.error('🔒 La leçon suivante est verrouillée.');
      }
      return;
    }

    // If current has no video (PDF-only) → mark complete + navigate
    if (!currentModule?.videoUrl) {
      setNavigating(true);
      try {
        await markComplete(currentModuleId ?? undefined, false);
        setCurrentModuleId(next.id ?? null);
        scrollTop();
      } finally {
        setNavigating(false);
      }
      return;
    }

    // Has video but not completed → show tip to mark complete first
    toast.error('🔒 Terminez cette leçon avant de passer à la suivante.');
  };

  const goPrev = () => {
    if (currentIdx <= 0) return;
    setCurrentModuleId(modules[currentIdx - 1].id ?? null);
    setJustCompleted(false);
    scrollTop();
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  // ── Module list item ───────────────────────────────────────────────────────
  const ModuleItem = ({ mod, idx, indent = false }: { mod: FormationModule; idx: number; indent?: boolean }) => {
    const locked = isLocked(mod, idx);
    const completed = isCompleted(mod);
    const current = currentModuleId === mod.id;
    const hasVideo = !!mod.videoUrl;

    return (
      <button
        onClick={() => goToModule(mod, idx)}
        disabled={locked}
        className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all ${indent ? 'pl-8' : ''} ${
          current
            ? 'bg-primary/20 border-l-2 border-primary'
            : locked
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-white/5 border-l-2 border-transparent'
        }`}
      >
        <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
          completed ? 'bg-emerald-500' : current ? 'bg-primary' : 'bg-white/10'
        }`}>
          {completed ? (
            <CheckCircle2 className="h-3 w-3 text-white" />
          ) : locked ? (
            <Lock className="h-3 w-3 text-white/60" />
          ) : current ? (
            <Play className="h-3 w-3 text-white fill-white" />
          ) : (
            <span className="text-[9px] font-black text-white/70">{idx + 1}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug line-clamp-2 ${
            current ? 'text-white' : completed ? 'text-white/70' : locked ? 'text-white/40' : 'text-white/70'
          }`}>
            {mod.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {mod.duration && (
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />{mod.duration}
              </span>
            )}
            {!hasVideo && mod.pdfUrl && (
              <span className="text-[10px] text-blue-400 flex items-center gap-1">
                <FileText className="h-2.5 w-2.5" />PDF
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  // ── Sidebar content renderer ───────────────────────────────────────────────
  const renderModuleList = () => {
    if (!formation.chapters?.length) {
      return modules.map((mod, idx) => <ModuleItem key={mod.id} mod={mod} idx={idx} />);
    }
    const groupedByChapter: Record<string, FormationModule[]> = {};
    const noChapter: FormationModule[] = [];
    modules.forEach((mod) => {
      if (mod.chapterId) {
        groupedByChapter[mod.chapterId] = [...(groupedByChapter[mod.chapterId] || []), mod];
      } else {
        noChapter.push(mod);
      }
    });
    return (
      <>
        {formation.chapters.map(chapter => (
          <div key={chapter.id}>
            <button
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              <span className="text-xs font-black text-white/80 uppercase tracking-widest flex-1 line-clamp-1">{chapter.title}</span>
              {expandedChapters[chapter.id]
                ? <ChevronUp className="h-3.5 w-3.5 text-white/40 shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />}
            </button>
            {expandedChapters[chapter.id] && (groupedByChapter[chapter.id] || []).map((mod) => {
              const globalIdx = modules.findIndex(m => m.id === mod.id);
              return <ModuleItem key={mod.id} mod={mod} idx={globalIdx} indent />;
            })}
          </div>
        ))}
        {noChapter.map((mod) => {
          const globalIdx = modules.findIndex(m => m.id === mod.id);
          return <ModuleItem key={mod.id} mod={mod} idx={globalIdx} />;
        })}
      </>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingProgress) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-white/60 font-medium">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  const canGoPrev = currentIdx > 0;
  const canGoNext = currentIdx < modules.length - 1;
  const currentCompleted = currentModule ? isCompleted(currentModule) : false;
  const nextLocked = canGoNext ? isLocked(modules[currentIdx + 1], currentIdx + 1) : false;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="h-14 bg-gray-900 border-b border-white/10 flex items-center px-4 gap-3 shrink-0 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-semibold shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Retour</span>
        </button>
        <div className="h-4 w-px bg-white/10 shrink-0" />
        <p className="text-white font-bold text-sm flex-1 truncate">{formation.title}</p>

        {/* Desktop progress */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs font-bold text-white/60 shrink-0">{progressPct}%</span>
        </div>

        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setDesktopSidebarOpen(v => !v)}
          className="hidden md:flex p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title={desktopSidebarOpen ? 'Masquer le menu' : 'Afficher le menu'}
        >
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden h-1 bg-white/10 shrink-0">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {/*
        LAYOUT:
        - Mobile (default):  flex-col  → content on top, lesson list pinned below
        - Desktop (md+):     flex-row  → animated sidebar on left, content on right
      */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* ── Desktop sidebar (hidden on mobile) ───────────────────────────── */}
        <AnimatePresence initial={false}>
          {desktopSidebarOpen && (
            <motion.div
              key="desktop-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="hidden md:flex flex-col bg-gray-900 border-r border-white/10 shrink-0 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <div className="p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-white font-bold text-sm">Contenu du cours</span>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {completedVideoCount}/{totalVideoModules} leçons terminées
                </p>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {renderModuleList()}
              </div>
              {formation.hasCertificate && progressPct === 100 && (
                <div className="p-3 border-t border-white/10 bg-emerald-500/10 shrink-0">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs font-bold">Cours terminé — Certificat disponible !</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content + mobile lesson panel ──────────────────────────── */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto min-h-0 flex flex-col">

          {/* Content area */}
          <div className="flex-1">
            {!currentModule ? (
              <div className="flex items-center justify-center h-64 md:h-full text-white/40">
                <div className="text-center px-4">
                  <Video className="h-14 w-14 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-sm">Sélectionnez une leçon pour commencer</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">

                {/* ── Video player ──────────────────────────────────────────── */}
                <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl">
                  {!currentModule.videoUrl ? (
                    <div className="aspect-video flex flex-col items-center justify-center text-white/40 bg-gray-900">
                      <FileText className="h-12 w-12 mb-3" />
                      <p className="text-sm font-semibold">Leçon sans vidéo</p>
                      <p className="text-xs mt-1">Consultez le contenu ci-dessous</p>
                    </div>
                  ) : videoInfo?.type === 'youtube' ? (
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        key={currentModule.id}
                        src={`https://www.youtube.com/embed/${videoInfo.videoId}?enablejsapi=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentModule.title}
                      />
                    </div>
                  ) : videoInfo?.type === 'vimeo' ? (
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        key={currentModule.id}
                        src={`https://player.vimeo.com/video/${videoInfo.videoId}?api=1&color=2563eb`}
                        className="absolute inset-0 w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={currentModule.title}
                      />
                    </div>
                  ) : videoInfo?.type === 'direct' ? (
                    <video
                      key={currentModule.id}
                      ref={videoRef}
                      controls
                      playsInline
                      className="w-full aspect-video"
                      onEnded={() => markComplete()}
                      onTimeUpdate={e => savePosition((e.target as HTMLVideoElement).currentTime)}
                      style={{ background: '#000' }}
                    >
                      <source src={videoInfo.url} />
                      <p className="text-white/40 p-4 text-sm">Votre navigateur ne supporte pas ce format vidéo.</p>
                    </video>
                  ) : (
                    <div className="aspect-video flex items-center justify-center bg-gray-900 text-white/40">
                      <p className="text-sm">URL vidéo non reconnue</p>
                    </div>
                  )}
                </div>

                {/* ── Lesson header ─────────────────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
                      Leçon {currentIdx + 1} / {modules.length}
                    </span>
                    {currentCompleted && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Terminée
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight">{currentModule.title}</h1>
                  {currentModule.duration && (
                    <p className="text-sm text-white/40 flex items-center gap-1 mt-1">
                      <Clock className="h-3.5 w-3.5" /> {currentModule.duration}
                    </p>
                  )}
                </div>

                {/* ── Actions row ───────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Mark complete */}
                  {currentModule.videoUrl && !currentCompleted && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => markComplete(undefined, false)}
                      disabled={marking}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
                    >
                      {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>Marquer comme terminé</span>
                    </motion.button>
                  )}
                </div>

                {/* ── Completion celebration ────────────────────────────────── */}
                <AnimatePresence>
                  {justCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3"
                    >
                      <Trophy className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-emerald-300 font-bold text-sm">Leçon terminée ! 🎉</p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">Passage à la leçon suivante...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Course complete banner ────────────────────────────────── */}
                {progressPct === 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-2xl p-5 text-center"
                  >
                    <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-amber-300 font-black text-lg">🏆 Félicitations !</p>
                    <p className="text-amber-400/70 text-sm mt-1">Vous avez terminé ce cours avec succès.</p>
                    {formation.hasCertificate && (
                      <p className="text-xs text-amber-400 mt-2 font-semibold">Votre certificat est disponible — contactez-nous pour le recevoir.</p>
                    )}
                  </motion.div>
                )}

                {/* ── Description ───────────────────────────────────────────── */}
                {currentModule.description && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest mb-2">Description</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{currentModule.description}</p>
                  </div>
                )}

                {/* ── PDF resource ──────────────────────────────────────────── */}
                {currentModule.pdfUrl && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest mb-3">Ressource</h3>
                    <a
                      href={currentModule.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors"
                    >
                      <Download className="h-5 w-5 text-blue-400 shrink-0" />
                      <span className="text-sm font-semibold text-blue-300 flex-1">Télécharger le support PDF</span>
                      <ExternalLink className="h-4 w-4 text-blue-400/60" />
                    </a>
                  </div>
                )}

                {/* ── Formation resources ───────────────────────────────────── */}
                {formation.resources && formation.resources.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-white/60 font-bold text-xs uppercase tracking-widest mb-3">Ressources du cours</h3>
                    <div className="space-y-2">
                      {formation.resources.map(res => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-white/40 shrink-0" />
                          <span className="text-sm text-white/70 flex-1">{res.name}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-white/30" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Navigation buttons ────────────────────────────────────── */}
                <div className="flex items-center justify-between pt-2 pb-4 border-t border-white/10 gap-3">
                  {/* Previous */}
                  <button
                    onClick={goPrev}
                    disabled={!canGoPrev}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Précédent</span>
                  </button>

                  {/* Center: progress pill */}
                  <div className="flex items-center gap-2 text-xs text-white/40 font-semibold">
                    <span className="tabular-nums">{currentIdx + 1}</span>
                    <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className="tabular-nums">{modules.length}</span>
                  </div>

                  {/* Next */}
                  <button
                    onClick={goNext}
                    disabled={!canGoNext || navigating}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                      currentCompleted && canGoNext && !nextLocked
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {navigating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Suivant</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile lesson list (visible ONLY on mobile, below video) ──── */}
          <div className="md:hidden border-t border-white/10 bg-gray-900 shrink-0">
            {/* Toggle button */}
            <button
              onClick={() => setMobileLessonOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-colors active:bg-white/10"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Contenu du cours</p>
                  <p className="text-white/40 text-xs">{completedVideoCount}/{totalVideoModules} leçons terminées · {progressPct}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mini progress ring */}
                <div className="relative h-8 w-8">
                  <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle
                      cx="16" cy="16" r="12" fill="none"
                      stroke={progressPct === 100 ? '#10b981' : '#2563eb'}
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 12}`}
                      strokeDashoffset={`${2 * Math.PI * 12 * (1 - progressPct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                    {progressPct}
                  </span>
                </div>
                {mobileLessonOpen
                  ? <ChevronDown className="h-4 w-4 text-white/40" />
                  : <ChevronRight className="h-4 w-4 text-white/40" />}
              </div>
            </button>

            {/* Expandable lesson list */}
            <AnimatePresence initial={false}>
              {mobileLessonOpen && (
                <motion.div
                  key="mobile-lessons"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[55vh] overflow-y-auto py-2 border-t border-white/5">
                    {renderModuleList()}
                    {formation.hasCertificate && progressPct === 100 && (
                      <div className="mx-3 mt-2 mb-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400">
                        <Trophy className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-bold">Cours terminé — Certificat disponible !</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
        {/* end main content + mobile lesson panel */}

      </div>
      {/* end body */}

    </div>
  );
}
