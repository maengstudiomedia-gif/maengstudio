"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, CheckCircle2, Clock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile"; 
import { secureLoginAction, checkEmailStatusAction, checkIpStatusAction } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter(); // Untuk pindah halaman
  const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
  const isTurnstileConfigured = turnstileSiteKey.length > 0;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true); 
  const [securityInfo, setSecurityInfo] = useState("");
  const [captchaState, setCaptchaState] = useState<"loading" | "ready" | "error">("loading");

  // STATE BARU: Untuk Intip Sandi & Tampilan Sukses
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // Tampilan Sukses
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- REFERENSI TURNSTILE UNTUK RESET OTOMATIS ---
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (!isTurnstileConfigured) {
      setCaptchaState("error");
      setError("Captcha belum dikonfigurasi di server. Hubungi admin untuk melengkapi NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
    }
  }, [isTurnstileConfigured]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      if (redirectFallbackRef.current) clearTimeout(redirectFallbackRef.current);
    };
  }, []);

  // 1. Cek Kunci IP saat halaman pertama dimuat
  useEffect(() => {
    let isMounted = true;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), ms);
        promise
          .then((value) => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });

    const verifyInitialSecurity = async () => {
      try {
        const ipStatus = await withTimeout(checkIpStatusAction(), 4000);
        if (!isMounted) return;
        if (ipStatus.isLocked && ipStatus.lockoutTime) {
          setLockoutTime(ipStatus.lockoutTime);
        }
      } catch {
        if (!isMounted) return;
        // UI tetap bisa dipakai walau pre-check lambat, validasi keras tetap dijaga di server action.
        setSecurityInfo("Pengecekan awal sedang lambat. Anda tetap bisa lanjut login dengan verifikasi captcha.");
      } finally {
        if (!isMounted) return;
        setIsCheckingLock(false);
      }
    };
    
    verifyInitialSecurity();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Efek Countdown Timer
  useEffect(() => {
    if (lockoutTime !== null && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0) {
      setLockoutTime(null);
      setError("");
    }
  }, [lockoutTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleBlurEmail = async () => {
    if (!validateEmail(email)) return;
    const status = await checkEmailStatusAction(email);
    
    if (status.isLocked && status.lockoutTime) {
      setLockoutTime(status.lockoutTime);
    } else if (status.attemptsLeft && status.attemptsLeft < 3) {
      setError(`Peringatan: Tersisa ${status.attemptsLeft} percobaan login untuk email ini.`);
    } else {
      setError("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- PENCEGAHAN DOUBLE-SUBMIT & RACE CONDITION ---
    if (lockoutTime !== null || isLoading) return; 
    
    setIsLoading(true);
    setError("");
    setSecurityInfo("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("cf-turnstile-response", turnstileToken);
    
    try {
      const result = await secureLoginAction(formData);

      if (!result.success) {
        if (result.isLocked) {
          setLockoutTime(result.lockoutTime!);
        } else {
          setError(result.message ?? "Login gagal. Silakan coba lagi.");
        }
        
        // --- CRITICAL FIX: RESET TURNSTILE JIKA GAGAL ---
        setTurnstileToken(""); 
        turnstileRef.current?.reset();
        setIsLoading(false); // Matikan loading jika gagal
        
      } else {
        // --- LOGIKA BARU: JIKA SUKSES ---
        setIsSuccess(true); // Ganti tampilan jadi layar sukses
        setIsLoading(false);
        setError("");
        
        const targetPath = result.role === "admin" ? "/admin/dashboard" : "/client/profile";

        // Tahan sebentar agar pesan sukses terlihat, lalu redirect normal.
        redirectTimeoutRef.current = setTimeout(() => {
          router.replace(targetPath);
          router.refresh();
        }, 1200);

        // Fallback hard-redirect jika navigasi client gagal/tertahan.
        redirectFallbackRef.current = setTimeout(() => {
          window.location.href = targetPath;
        }, 3000);
      }
    } catch (err) {
      // Menangani error jaringan yang tidak terduga
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
      setTurnstileToken(""); 
      turnstileRef.current?.reset();
      setIsLoading(false);
    }
  };

  const isEmailValid = validateEmail(email);
  
  // Tombol lumpuh jika ada yang belum valid ATAU jika form sedang memproses request (isLoading)
  const isButtonDisabled = !email || !password || !isEmailValid || lockoutTime !== null || isLoading || !turnstileToken || !isTurnstileConfigured;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden px-4">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-zinc-600/20 blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full backdrop-blur-[40px] bg-white/[0.02] border border-white/[0.05] p-10 rounded-3xl shadow-[0_0_80px_-20px_rgba(0,0,0,1)] transition-all duration-500">
        
        {/* === TAMPILAN 1: BERHASIL LOGIN === */}
        {isSuccess ? (
           <div className="text-center animate-in fade-in zoom-in duration-500 py-6">
             <div className="mx-auto w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-full flex flex-col items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
               <ShieldCheck className="w-12 h-12 text-amber-500 mb-1" />
             </div>
             <h2 className="text-2xl font-light text-white tracking-wide mb-2">Akses Diberikan</h2>
             <p className="text-white/50 text-sm leading-relaxed mb-6">
               Verifikasi identitas berhasil. <br/> Mengenkripsi sesi Anda...
             </p>
             <div className="flex justify-center items-center space-x-2 text-amber-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengarahkan ke Dashboard</span>
             </div>
           </div>
        ) : (

        /* === TAMPILAN 2: FORM LOGIN (ASLI) === */
        <>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <img src="/favicon.ico" alt="Maeng Studio" className="w-8 h-8 object-contain" />
            </div>
            <h1 className="text-3xl font-light text-white tracking-wide">MAENG <span className="font-bold">STUDIO</span></h1>
            <p className="text-zinc-400 mt-2 text-sm uppercase tracking-widest opacity-80">Dokumentasi & Audio System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {lockoutTime !== null ? (
              <div className="flex items-start text-red-400 text-sm bg-red-500/10 backdrop-blur-md p-4 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Clock className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold mb-1">Akses Terkunci Sementara</p>
                  <p>Terlalu banyak percobaan gagal. Silakan coba lagi dalam <span className="font-bold text-white">{formatTime(lockoutTime)}</span></p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center text-amber-400 text-sm bg-amber-500/10 backdrop-blur-md p-3 rounded-xl border border-amber-500/20">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            ) : securityInfo ? (
              <div className="flex items-center text-blue-300 text-sm bg-blue-500/10 backdrop-blur-md p-3 rounded-xl border border-blue-500/20">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {securityInfo}
              </div>
            ) : null}

            {/* Input Email Glass */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-white/40" />
                <input
                  type="email"
                  placeholder="Alamat Email"
                  disabled={lockoutTime !== null || isLoading}
                  className={`w-full bg-white/[0.03] backdrop-blur-md text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-10 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    email && !isEmailValid 
                      ? 'border-red-500/50 focus:border-red-500/70 focus:bg-red-500/[0.02]' 
                      : 'border-white/[0.05] focus:border-amber-500/50 focus:bg-white/[0.06]'
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error && !error.includes("Tersisa")) setError(""); 
                  }}
                  onBlur={handleBlurEmail}
                  required
                />
                {email && isEmailValid && (
                  <div className="absolute right-4 top-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                  </div>
                )}
              </div>
              {email && !isEmailValid && (
                <p className="text-red-400/90 text-[10px] mt-1.5 px-1">Format email tidak valid.</p>
              )}
            </div>

            {/* Input Password Glass DENGAN FITUR INTIP SANDI */}
            <div className="relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-white/40" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kata Sandi"
                disabled={lockoutTime !== null || isLoading}
                className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.05] text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {/* TOMBOL MATA UNTUK INTIP SANDI */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors disabled:opacity-30"
                disabled={lockoutTime !== null || isLoading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-white/60 hover:text-amber-500 transition-colors ml-auto">
                Lupa sandi?
              </Link>
            </div>

            {/* CLOUDFLARE TURNSTILE MODE RAMAH MOBILE */}
            {isTurnstileConfigured ? (
              <Turnstile
                ref={turnstileRef} 
                siteKey={turnstileSiteKey}
                options={{ theme: "auto", size: "flexible" }}
                onWidgetLoad={() => setCaptchaState("ready")}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setCaptchaState("ready");
                }}
                onError={() => {
                  setTurnstileToken("");
                  setCaptchaState("error");
                  setError("Turnstile gagal dimuat. Pastikan domain deploy sudah terdaftar di Cloudflare Turnstile dan adblock dimatikan.");
                }}
                onExpire={() => {
                  // Jika user kelamaan diam dan token kedaluwarsa, paksa minta ulang ke Cloudflare
                  setTurnstileToken("");
                  setCaptchaState("loading");
                  turnstileRef.current?.reset();
                }}
              />
            ) : (
              <div className="flex items-center gap-2 text-red-300/90 text-xs bg-red-500/10 backdrop-blur-md p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Captcha tidak aktif: NEXT_PUBLIC_TURNSTILE_SITE_KEY belum tersedia di environment deployment.</span>
              </div>
            )}
            <div className="text-xs">
              {captchaState === "loading" && (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memuat verifikasi keamanan...</span>
                </div>
              )}
              {captchaState === "ready" && !turnstileToken && (
                <div className="flex items-center gap-2 text-amber-300/90">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Verifikasi siap, tunggu token keamanan...</span>
                </div>
              )}
              {captchaState === "ready" && turnstileToken && (
                <div className="flex items-center gap-2 text-green-300/90">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verifikasi keamanan siap. Anda bisa login.</span>
                </div>
              )}
              {captchaState === "error" && (
                <div className="flex items-center gap-2 text-red-300/90">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Captcha gagal dimuat. Coba refresh halaman.</span>
                </div>
              )}
            </div>

            {/* Glass Button Dinamis */}
            <button 
              type="submit" 
              disabled={isButtonDisabled}
              className={`w-full font-semibold rounded-xl py-4 transition-all duration-300 flex items-center justify-center ${
                !isButtonDisabled
                  ? "bg-amber-500 hover:bg-amber-400 text-black transform hover:scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                  : "bg-white/[0.02] border border-white/[0.05] text-white/30 cursor-not-allowed backdrop-blur-sm"
              }`}
            >
              {isLoading 
                  ? "Memproses..." 
                  : lockoutTime !== null 
                    ? "Terkunci" 
                    : "Masuk"}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-8">
            Belum memiliki akun? <Link href="/register" className="text-white hover:text-amber-500 transition-colors font-medium">Daftar sekarang</Link>
          </p>
        </>
        )}
      </div>
    </div>
  );
}