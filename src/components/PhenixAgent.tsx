import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';

const ADMIN_SECRET = 'rena-admin-2024';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const SUGGESTIONS = [
  'Comment ajouter un produit ?',
  'Comment approuver un dépôt ?',
  'Comment créer une formation ?',
  'Comment changer le taux de change ?',
  'Comment envoyer une annonce ?',
  'Comment ajouter une plateforme promotion ?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-indigo-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function PhenixAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pulse, setPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '👋 Bonjour ! Je suis **Phénix**, votre assistant IA.\n\nJe connais votre tableau de bord par cœur. Posez-moi n\'importe quelle question sur les fonctionnalités de l\'administration !',
        ts: Date.now(),
      }]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setPulse(false);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

    const userMsg: Message = { role: 'user', content: userText, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/admin/phenix-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const reply = data.reply || 'Désolé, une erreur est survenue.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erreur de connexion. Vérifiez votre clé API Groq.', ts: Date.now() }]);
    }
    setLoading(false);
  }, [messages, loading]);

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: '👋 Conversation réinitialisée. Comment puis-je vous aider ?',
      ts: Date.now(),
    }]);
    setShowSuggestions(true);
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-lg border border-indigo-100"
            >
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-gray-600">Phénix IA</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(o => !o)}
          whileTap={{ scale: 0.93 }}
          className="relative h-14 w-14 rounded-full shadow-xl flex items-center justify-center focus:outline-none"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a78bfa 100%)' }}
          aria-label="Agent Phénix"
        >
          {pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-indigo-500" />
          )}
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <ChevronDown className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="open"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}>
                <Sparkles className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
            className="fixed bottom-28 right-4 z-[9998] w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{ maxHeight: '520px', boxShadow: '0 24px 64px rgba(99,102,241,0.18), 0 4px 24px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a78bfa 100%)' }}>
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">Phénix</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                  <p className="text-white/75 text-[10px] font-medium">Assistant IA · Toujours disponible</p>
                </div>
              </div>
              <button onClick={reset}
                className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Réinitialiser">
                <RotateCcw className="h-3.5 w-3.5 text-white" />
              </button>
              <button onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/60 space-y-0">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-md">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              {/* Suggestions */}
              <AnimatePresence>
                {showSuggestions && messages.length <= 1 && !loading && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Questions fréquentes</p>
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white border border-gray-100 text-xs font-semibold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 bg-white">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-indigo-300 focus-within:bg-white transition-all"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Posez une question..."
                  disabled={loading}
                  className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{ background: input.trim() && !loading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e5e7eb' }}
                >
                  {loading
                    ? <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
                    : <Send className="h-3.5 w-3.5 text-white" />
                  }
                </button>
              </form>
              <p className="text-[9px] text-gray-300 text-center mt-1.5 font-medium">Propulsé par Groq · llama-3.1-8b</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
