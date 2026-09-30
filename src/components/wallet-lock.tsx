"use client";

import { AnimatePresence, motion } from "framer-motion";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

const PASS_HASH_KEY = "saldo-passphrase-hash-v1";
const SESSION_KEY = "saldo-unlocked-v1";

const funnyWords = [
  "capivara", "pastel", "foguete", "pudim", "chinelo", "pinguim", "coxinha", "abacaxi",
  "bigode", "pipoca", "jacare", "gelatina", "unicornio", "batata", "tamandua", "pacoca",
  "sorvete", "tucano", "panqueca", "miojo", "girafa", "cafune", "biscoito", "berinjela",
  "sardinha", "caramelo", "pijama", "confete", "trompete", "farofa", "kiwi", "picolé",
  "almofada", "gambá", "mandioca", "pirulito", "caneca", "quindim", "tapioca", "cacto",
];

type LockState = "loading" | "setup" | "confirm" | "locked" | "open";

function normalizePhrase(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

async function hashPhrase(value: string) {
  const data = new TextEncoder().encode(normalizePhrase(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makePhrase() {
  const pool = [...funnyWords];
  const picked: string[] = [];
  while (picked.length < 16) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const index = random[0] % pool.length;
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked.join(" ");
}

export function WalletLock({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockState>("loading");
  const [phrase, setPhrase] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const words = useMemo(() => phrase.split(" ").filter(Boolean), [phrase]);

  useEffect(() => {
    const initializeFrame = window.requestAnimationFrame(() => {
      const storedHash = localStorage.getItem(PASS_HASH_KEY);
      const sessionUnlocked = sessionStorage.getItem(SESSION_KEY) === "true";
      if (sessionUnlocked && storedHash) {
        setState("open");
      } else if (storedHash) {
        setState("locked");
      } else {
        setPhrase(makePhrase());
        setState("setup");
      }
    });

    const handleLock = () => {
      sessionStorage.removeItem(SESSION_KEY);
      setInput("");
      setError("");
      setState(localStorage.getItem(PASS_HASH_KEY) ? "locked" : "setup");
    };

    window.addEventListener("saldo:lock", handleLock);
    return () => {
      window.cancelAnimationFrame(initializeFrame);
      window.removeEventListener("saldo:lock", handleLock);
    };
  }, []);

  async function copyPhrase() {
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function confirmNewPhrase() {
    if (normalizePhrase(input) !== normalizePhrase(phrase)) {
      setError("A frase não confere. Digite as 16 palavras na mesma ordem.");
      return;
    }
    localStorage.setItem(PASS_HASH_KEY, await hashPhrase(phrase));
    sessionStorage.setItem(SESSION_KEY, "true");
    setError("");
    setInput("");
    setState("open");
  }

  async function unlock() {
    const storedHash = localStorage.getItem(PASS_HASH_KEY);
    if (!storedHash || (await hashPhrase(input)) !== storedHash) {
      setError("Frase incorreta. Confira as palavras e tente novamente.");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "true");
    setError("");
    setInput("");
    setState("open");
  }

  function resetAccess() {
    localStorage.removeItem(PASS_HASH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    const nextPhrase = makePhrase();
    setPhrase(nextPhrase);
    setInput("");
    setError("");
    setState("setup");
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.985, y: 12 }}
        animate={{ opacity: state === "open" ? 1 : state === "loading" ? 0 : 0.72, scale: state === "open" ? 1 : 0.985, y: state === "open" ? 0 : 12 }}
        transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {state !== "open" && state !== "loading" && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#090a0b]/94 px-4 py-8 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[560px]"
            >
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[15px] bg-[#2a2d2f] text-[#70e3a3] shadow-[0_12px_40px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/[0.06]">
                  <span className="text-lg font-black tracking-[-0.08em]">S</span>
                </div>
                <span className="text-xl font-semibold tracking-[-0.04em] text-white">Saldo</span>
              </div>

              <div className="rounded-[28px] border border-white/[0.07] bg-[#181a1c]/96 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:p-8">
                {state === "setup" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#67df9c]/10 text-[#70e3a3]">
                      <KeyRoundedIcon fontSize="small" />
                    </div>
                    <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">Sua frase de acesso</h1>
                    <p className="mt-2 text-sm leading-6 text-[#9da0a5]">
                      Estas 16 palavras protegem o acesso local ao app. Anote a sequência antes de continuar.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {words.map((word, index) => (
                        <motion.div
                          key={`${word}-${index}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.025 * index, duration: 0.35 }}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5"
                        >
                          <span className="mr-2 text-[10px] font-semibold text-[#62656a]">{index + 1}</span>
                          <span className="text-xs font-medium text-[#dfe1e3]">{word}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={copyPhrase}
                        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] text-sm font-semibold text-[#d8dade] transition hover:bg-white/[0.065]"
                      >
                        {copied ? <CheckCircleRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
                        {copied ? "Copiada" : "Copiar frase"}
                      </button>
                      <button
                        onClick={() => { setInput(""); setError(""); setState("confirm"); }}
                        className="h-12 flex-[1.3] rounded-2xl bg-[#eceeef] px-5 text-sm font-bold text-[#17191b] transition hover:bg-white active:scale-[0.985]"
                      >
                        Já anotei
                      </button>
                    </div>
                    <p className="mt-4 text-center text-[11px] leading-5 text-[#66616f]">Não é uma seed de blockchain e não controla ativos reais.</p>
                  </motion.div>
                )}

                {state === "confirm" && (
                  <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#67df9c]/10 text-[#70e3a3]">
                      <LockRoundedIcon fontSize="small" />
                    </div>
                    <h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">Confirme sua frase</h1>
                    <p className="mt-2 text-sm leading-6 text-[#9da0a5]">Digite as 16 palavras, na ordem, separadas por espaço.</p>
                    <textarea
                      autoFocus
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      rows={4}
                      placeholder="capivara pastel foguete..."
                      className="mt-6 w-full resize-none rounded-2xl border border-white/[0.08] bg-[#111315] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-[#505257] focus:border-white/20 focus:ring-4 focus:ring-white/[0.035]"
                    />
                    {error && <p className="mt-3 text-xs font-medium text-[#ff8d9b]">{error}</p>}
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => setState("setup")} className="h-12 flex-1 rounded-2xl border border-white/[0.08] text-sm font-semibold text-[#c4c6ca] transition hover:bg-white/[0.04]">Voltar</button>
                      <button onClick={confirmNewPhrase} className="h-12 flex-[1.35] rounded-2xl bg-[#eceeef] text-sm font-bold text-[#17191b] transition hover:bg-white active:scale-[0.985]">Confirmar e entrar</button>
                    </div>
                  </motion.div>
                )}

                {state === "locked" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#67df9c]/10 text-[#70e3a3] shadow-[inset_0_0_0_1px_rgba(103,223,156,0.08)]">
                      <LockRoundedIcon />
                    </div>
                    <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-white">Carteira bloqueada</h1>
                    <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-[#8f9297]">Insira sua frase de 16 palavras para abrir o painel.</p>
                    <textarea
                      autoFocus
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      rows={3}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") unlock();
                      }}
                      placeholder="Sua frase secreta..."
                      className="mt-6 w-full resize-none rounded-2xl border border-white/[0.08] bg-[#111315] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-[#505257] focus:border-white/20 focus:ring-4 focus:ring-white/[0.035]"
                    />
                    {error && <p className="mt-3 text-center text-xs font-medium text-[#ff8d9b]">{error}</p>}
                    <button onClick={unlock} className="mt-5 h-12 w-full rounded-2xl bg-[#eceeef] text-sm font-bold text-[#17191b] transition hover:bg-white active:scale-[0.985]">Desbloquear</button>
                    <button onClick={resetAccess} className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-medium text-[#686b70] transition hover:text-[#aaadb1]">
                      <RefreshRoundedIcon sx={{ fontSize: 15 }} /> Redefinir acesso local
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
