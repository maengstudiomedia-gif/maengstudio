"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitted(true);
  };

  const isEmailValid = validateEmail(email);
  const isButtonDisabled = !email || !isEmailValid;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden px-4">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-amber-600/10 blur-[150px] pointer-events-none"></div>

      {/* Glass Card */}
      <div className="relative z-10 max-w-md w-full backdrop-blur-[40px] bg-white/[0.02] border border-white/[0.05] p-10 rounded-3xl shadow-[0_0_80px_-20px_rgba(0,0,0,1)]">
        
        <Link href="/login" className="inline-flex items-center text-white/50 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Login
        </Link>

        <div className="mb-8">
          <h2 className="text-2xl font-light text-white tracking-wide mb-2">Pemulihan Akses</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Masukkan email yang terdaftar. Kami akan mengirimkan tautan aman untuk mengatur ulang kata sandi Anda.
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleReset} className="space-y-6">
            {error && (
              <div className="flex items-center text-red-400 text-sm bg-red-500/10 backdrop-blur-md p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-white/40" />
                <input 
                  type="email" 
                  placeholder="Alamat Email" 
                  className={`w-full bg-white/[0.03] backdrop-blur-md text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-10 focus:outline-none transition-all ${
                    email && !isEmailValid 
                      ? 'border-red-500/50 focus:bg-red-500/[0.02]' 
                      : 'border-white/[0.05] focus:border-amber-500/50 focus:bg-white/[0.06]'
                  }`} 
                  value={email} 
                  onChange={(e) => { setEmail(e.target.value); setError(""); }} 
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

            <button 
              type="submit" 
              disabled={isButtonDisabled}
              className={`w-full font-semibold rounded-xl py-4 transition-all duration-300 ${
                !isButtonDisabled
                  ? "border border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                  : "bg-white/[0.02] border border-white/[0.05] text-white/30 cursor-not-allowed backdrop-blur-sm"
              }`}
            >
              Kirim Tautan Pemulihan
            </button>
          </form>
        ) : (
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-xl p-6 text-center">
            <p className="text-emerald-400/90 text-sm">
              Tautan pemulihan telah dikirim. Silakan periksa kotak masuk (atau folder spam) email Anda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}