import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../lib/api.js';
import { translateTamil } from '../lib/familyParser.js';
import { MicIcon, XIcon } from './Icons';

const LANGUAGES = [
  { code: 'ta-IN', label: 'Tamil (ta-IN)' },
  { code: 'en-IN', label: 'English (en-IN)' },
];

const QUICK_PHRASES = [
  { label: 'வயது 62 விதவை விவசாயி சீதா', code: 'ta-IN', text: 'வயது 62 விதவை விவசாயி சீதா' },
  { label: 'sita 62 widow farmer', code: 'en-IN', text: 'sita 62 widow farmer' },
];

const SR = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

function convert(text, code) {
  return code === 'ta-IN' ? translateTamil(text) : text;
}

// Sends the raw transcript to the backend /api/extract first (ta-IN and en-IN).
// Never throws: if the API fails or returns no household members, falls back to the local translator.
async function extractIntake(rawTranscript, lang) {
  try {
    const res = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawTranscript, lang }),
    });
    if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.household?.members) || data.household.members.length === 0) {
      throw new Error('No household members in response');
    }
    return {
      text: data.englishText || rawTranscript,
      household: data.household,
      followUp: data.followUp,
    };
  } catch {
    // API failure or no members: use the local fallback parser.
    return { text: convert(rawTranscript, lang) };
  }
}

export default function VoiceModal({ open, onClose, onResult }) {
  const [lang, setLang] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!open && recognitionRef.current) {
      recognitionRef.current.abort?.();
      recognitionRef.current = null;
    }
  }, [open]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  if (!open) return null;

  function startSpeaking() {
    setError('');
    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = async (event) => {
      const rawTranscript = event.results?.[0]?.[0]?.transcript || '';
      const intake = await extractIntake(rawTranscript, lang);
      setListening(false);
      recognitionRef.current = null;
      onResult(intake);
      onClose();
    };
    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      setError(`Could not capture speech${event?.error ? ` (${event.error})` : ''}. Please try again or type your details.`);
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setError('Could not start voice input. Please try again.');
    }
  }

  function applyPhrase(phrase) {
    onResult(convert(phrase.text, phrase.code));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Speak Your Family Details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium ${
                lang === l.code
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {!SR && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            Voice input is not supported in this browser. Type your details instead.
          </p>
        )}

        <button
          type="button"
          onClick={startSpeaking}
          disabled={!SR || listening}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MicIcon className="w-4 h-4" />
          {listening ? 'Listening…' : 'Start speaking'}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Quick test phrases</p>
          <div className="flex flex-col gap-2">
            {QUICK_PHRASES.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => applyPhrase(p)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
