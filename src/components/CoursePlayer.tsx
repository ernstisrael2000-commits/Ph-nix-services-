import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Play, CheckCircle2, Lock, Clock, Loader2,
  BookOpen, Menu, X, ChevronRight, ChevronDown, ChevronUp,
  Layers, FileText, Download, Trophy, RotateCcw,
  Video, List, StickyNote, BarChart3, ExternalLink
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

type PlayerTab = 'overview' | 'resources' | 'notes';

function parseVideoUrl(url: string): VideoInfo {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', videoId: ytMatch[1] };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', videoId: vimeoMatch[1] };
  if (url.startsWith('http')) return { type: 'direct', url };
  return null;
}

function getSortedModules(formation: Formation): FormationModule[] {
  return [...(formation.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getNoteKey(formationId: string, moduleId: string) {
  return `neopay_notes_${formationId}_${moduleId}`;
}

export default function CoursePlayer({ formation, loggedClient, onBack }: CoursePlayerProps) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [lastPositionSeconds, setLastPositionSeconds] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [marking, setMarking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [navigating, setNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState<PlayerTab>('overview');
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

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
      .catch(() => { if (modules[0]) setCurrentModuleId(modules[0].id ?? null); })
      .finally(() => setLoadingProgress(false));
  }, [loggedClient.id, formation.id]);

  // ── Load note for current module ────────────────────────────────────────────
  useEffect(() => {
    if (!formation.id || !currentModuleId) return;
    const saved = localStorage.getItem(getNoteKey(formation.id, currentModuleId)) || '';
    setNote(saved);
    setNoteSaved(false);
  }, [currentModuleId, formation.id]);

  const saveNote = () => {
    if (!formation.id || !currentModuleId) return;
    localStorage.setItem(getNoteKey(formation.id, currentModuleId), note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  // ── Save watch position ────────────────────────────────────────────────────
  const savePosition = useCallback((seconds: number) => {
    if (!loggedClient?.id || !formation.id || !currentModuleId) return;
    if (positionTimerRef.current) clearTimeout(positionTimerRef.current);
    positionTimerRef.current = setTimeout(() => {
      fetch('/api/formations/progress/position', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedClient.id, formationId: formation.id, moduleId: currentModuleId, positionSeconds: Math.floor(seconds) }),
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loggedClient.id, formationId: formation.id, moduleId: targetId }),
      });
      setCompletedIds(prev => [...prev, targetId]);
      setJustCompleted(true);
      if (autoAdvance) {
        const idx = modules.findIndex(m => m.id === targetId);
        if (idx < modules.length - 1) {
          setTimeout(() => { setCurrentModuleId(modules[idx + 1].id ?? null); setJustCompleted(false); }, 1600);
        }
      }
    } catch { toast.error('Erreur lors de la mise à jour de la progression.'); }
    finally { setMarking(false); }
  }, [currentModuleId, completedIds, loggedClient.id, formation.id, modules]);

  // ── YouTube end detection ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.event === 'onStateChange' && data?.info === 0) markComplete();
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
    if (isLocked(mod, idx)) { toast.error('🔒 Terminez la leçon précédente pour débloquer celle-ci.'); return; }
    setCurrentModuleId(mod.id ?? null);
    setJustCompleted(false);
    setMobileSidebarOpen(false);
    setActiveTab('overview');
    scrollTop();
  };

  const goNext = async () => {
    if (currentIdx === -1 || currentIdx >= modules.length - 1) return;
    const next = modules[currentIdx + 1];
    const nextIdx = currentIdx + 1;
    if (isCompleted(currentModule!)) {
      if (!isLocked(next, nextIdx)) { setCurrentModuleId(next.id ?? null); scrollTop(); }
      else { toast.error('🔒 La leçon suivante est verrouillée.'); }
      return;
    }
    if (!currentModule?.videoUrl) {
      setNavigating(true);
      try { await markComplete(currentModuleId ?? undefined, false); setCurrentModuleId(next.id ?? null); scrollTop(); }
      finally { setNavigating(false); }
      return;
    }
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
  const ModuleItem = ({ mod, idx }: { mod: FormationModule; idx: number }) => {
    const locked = isLocked(mod, idx);
    const completed = isCompleted(mod);
    const current = currentModuleId === mod.id;
    const hasVideo = !!mod.videoUrl;

    return (
      <button onClick={() => goToModule(mod, idx)} disabled={locked}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-l-2 ${
          current ? 'bg-violet-900/30 border-violet-400' : locked ? 'opacity-40 cursor-not-allowed border-transparent' : 'hover:bg-white/5 border-transparent'
        }`}>
        <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black transition-colors ${
          completed ? 'bg-emerald-500' : current ? 'bg-violet-500' : 'bg-white/10'
        }`}>
          {completed ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> :
           locked ? <Lock className="h-3 w-3 text-white/60" /> :
           current ? <Play className="h-3 w-3 text-white fill-white" /> :
           <span className="text-white/60">{idx + 1}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug line-clamp-2 ${current ? 'text-white' : completed ? 'text-white/60' : locked ? 'text-white/30' : 'text-white/70'}`}>
            {mod.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {mod.duration && <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{mod.duration}</span>}
            {!hasVideo && mod.pdfUrl && <span className="text-[10px] text-violet-400 flex items-center gap-1"><FileText className="h-2.5 w-2.5" />PDF</span>}
          </div>
        </div>
        {current && !completed && <div className="mt-1 h-2 w-2 rounded-full bg-violet-400 shrink-0 animate-pulse" />}
      </button>
    );
  };

  // ── Sidebar module list ────────────────────────────────────────────────────
  const renderModuleList = () => {
    if (!formation.chapters?.length) {
      return modules.map((mod, idx) => <ModuleItem key={mod.id} mod={mod} idx={idx} />);
    }
    const groupedByChapter: Record<string, FormationModule[]> = {};
    const noChapter: FormationModule[] = [];
    modules.forEach(mod => {
      if (mod.chapterId) { groupedByChapter[mod.chapterId] = [...(groupedByChapter[mod.chapterId] || []), mod]; }
      else { noChapter.push(mod); }
    });
    return (
      <>
        {formation.chapters.map((chapter, ci) => (
          <div key={chapter.id}>
            <button onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors">
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">{String(ci + 1).padStart(2, '0')}</span>
              <span className="text-xs font-black text-white/80 flex-1 line-clamp-1">{chapter.title}</span>
              {expandedChapters[chapter.id]
                ? <ChevronUp className="h-3.5 w-3.5 text-white/30 shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-white/30 shrink-0" />}
            </button>
            {expandedChapters[chapter.id] && (groupedByChapter[chapter.id] || []).map(mod => {
              const globalIdx = modules.findIndex(m => m.id === mod.id);
              return <ModuleItem key={mod.id} mod={mod} idx={globalIdx} />;
            })}
          </div>
        ))}
        {noChapter.map(mod => {
          const globalIdx = modules.findIndex(m => m.id === mod.id);
          return <ModuleItem key={mod.id} mod={mod} idx={globalIdx} />;
        })}
      </>
    );
  };

  if (loadingProgress) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4 w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-violet-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
          </div>
          <p className="text-white/50 font-medium text-sm">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  const canGoPrev = currentIdx > 0;
  const canGoNext = currentIdx < modules.length - 1;
  const currentCompleted = currentModule ? isCompleted(currentModule) : false;

  const TABS: { id: PlayerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Aperçu', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'resources', label: 'Ressources', icon: <FileText className="h-3.5 w-3.5" /> },
    { id: 'notes', label: 'Mes notes', icon: <StickyNote className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="h-14 bg-gray-900 border-b border-white/10 flex items-center px-4 gap-3 shrink-0 z-20">
        <button onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-semibold shrink-0">
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Retour</span>
        </button>
        <div className="h-4 w-px bg-white/10 shrink-0" />
        <p className="text-white font-bold text-sm flex-1 truncate">{formation.title}</p>

        {/* Progress */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="w-28 bg-white/10 rounded-full h-1.5 overflow-hidden">
            <motion.div className="h-full bg-violet-500 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
          </div>
          <span className="text-xs font-bold text-white/50 shrink-0">{progressPct}% complété</span>
        </div>

        {/* Mobile: open lesson list */}
        <button onClick={() => setMobileSidebarOpen(v => !v)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <List className="h-4 w-4" />
        </button>

        {/* Desktop: toggle sidebar */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="hidden md:flex p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <List className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden h-0.5 bg-white/10 shrink-0">
        <motion.div className="h-full bg-violet-500"
          initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="hidden md:flex flex-col bg-gray-900 border-r border-white/10 shrink-0 overflow-hidden"
              style={{ minWidth: 0 }}>
              <div className="p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-black text-sm">Contenu du cours</span>
                  <span className="text-[11px] text-violet-400 font-bold">{progressPct}% complété</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="h-full bg-violet-500 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <p className="text-[11px] text-white/30 mt-1.5">{completedVideoCount}/{totalVideoModules} leçons terminées</p>
              </div>
              <div className="flex-1 overflow-y-auto py-1">{renderModuleList()}</div>
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

        {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed right-0 top-14 bottom-0 w-80 max-w-[85vw] bg-gray-900 z-50 md:hidden flex flex-col shadow-2xl border-l border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-white font-black text-sm">Contenu du cours</p>
                    <p className="text-[11px] text-violet-400 font-bold mt-0.5">{progressPct}% complété</p>
                  </div>
                  <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-1">{renderModuleList()}</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {!currentModule ? (
            <div className="flex items-center justify-center flex-1 text-white/30">
              <div className="text-center px-4">
                <Video className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-sm">Sélectionnez une leçon pour commencer</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Video player ────────────────────────────────────────── */}
              <div className="bg-black w-full shrink-0">
                {!currentModule.videoUrl ? (
                  <div className="aspect-video flex flex-col items-center justify-center text-white/30 bg-gray-900">
                    <FileText className="h-12 w-12 mb-3" />
                    <p className="text-sm font-semibold">Leçon sans vidéo</p>
                    <p className="text-xs mt-1 text-white/20">Consultez le contenu et les ressources ci-dessous</p>
                  </div>
                ) : videoInfo?.type === 'youtube' ? (
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe key={currentModule.id}
                      src={`https://www.youtube.com/embed/${videoInfo.videoId}?enablejsapi=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen title={currentModule.title} />
                  </div>
                ) : videoInfo?.type === 'vimeo' ? (
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe key={currentModule.id}
                      src={`https://player.vimeo.com/video/${videoInfo.videoId}?api=1&color=7C3AED`}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={currentModule.title} />
                  </div>
                ) : videoInfo?.type === 'direct' ? (
                  <video key={currentModule.id} ref={videoRef} controls playsInline
                    className="w-full aspect-video" style={{ background: '#000' }}
                    onEnded={() => markComplete()}
                    onTimeUpdate={e => savePosition((e.target as HTMLVideoElement).currentTime)}>
                    <source src={videoInfo.url} />
                  </video>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-gray-900 text-white/30">
                    <p className="text-sm">URL vidéo non reconnue</p>
                  </div>
                )}
              </div>

              {/* ── Lesson header ─────────────────────────────────────────── */}
              <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
                        Leçon {currentIdx + 1} / {modules.length}
                      </span>
                      {currentCompleted && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Terminée
                        </span>
                      )}
                      {justCompleted && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="flex items-center gap-1 text-[11px] font-bold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full">
                          ✨ Bravo !
                        </motion.span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{currentModule.title}</h2>
                    {currentModule.description && (
                      <p className="text-sm text-white/40 mt-1.5 leading-relaxed">{currentModule.description}</p>
                    )}
                  </div>
                  {!currentCompleted && (
                    <button onClick={() => markComplete()} disabled={marking}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50">
                      {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Marquer terminée</span>
                    </button>
                  )}
                </div>

                {/* ── Navigation buttons ─────────────────────────────────── */}
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={goPrev} disabled={!canGoPrev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="h-3.5 w-3.5" /> Précédente
                  </button>
                  <button onClick={goNext} disabled={!canGoNext || navigating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/40">
                    {navigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Suivante <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* ── Tabs ───────────────────────────────────────────────── */}
                <div className="border-b border-white/10 mb-6">
                  <div className="flex gap-0 overflow-x-auto no-scrollbar">
                    {TABS.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                          activeTab === tab.id
                            ? 'text-violet-400 border-violet-500'
                            : 'text-white/40 border-transparent hover:text-white/60'
                        }`}>
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab content ────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {currentModule.description ? (
                        <p className="text-white/60 text-sm leading-relaxed">{currentModule.description}</p>
                      ) : (
                        <p className="text-white/30 text-sm">Aucune description pour cette leçon.</p>
                      )}
                      {currentModule.duration && (
                        <div className="flex items-center gap-2 mt-4 text-xs text-white/30">
                          <Clock className="h-3.5 w-3.5" /> Durée estimée : {currentModule.duration}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'resources' && (
                    <motion.div key="resources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {currentModule.pdfUrl ? (
                        <a href={currentModule.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors group">
                          <div className="h-10 w-10 bg-violet-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">Support de cours PDF</p>
                            <p className="text-xs text-white/40 mt-0.5">Cliquez pour télécharger</p>
                          </div>
                          <Download className="h-4 w-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
                        </a>
                      ) : (
                        <div className="text-center py-12 text-white/20">
                          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Aucune ressource pour cette leçon.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'notes' && (
                    <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-white/40">Prendre des notes pour cette leçon</p>
                        <button onClick={saveNote}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${noteSaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'}`}>
                          {noteSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
                        </button>
                      </div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Commencez à écrire vos notes ici... Elles seront sauvegardées localement."
                        className="w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Certificate banner ─────────────────────────────────────────── */}
              {formation.hasCertificate && progressPct === 100 && (
                <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-8">
                  <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-5 flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Trophy className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-amber-300 font-black text-sm">🎉 Félicitations ! Cours terminé</p>
                      <p className="text-amber-400/70 text-xs mt-0.5">Votre certificat d'achèvement est disponible. Contactez Neopay pour l'obtenir.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
