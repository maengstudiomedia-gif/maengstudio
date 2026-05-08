"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, Mail, User, AlertCircle, CheckCircle2, XCircle, Phone, Eye, EyeOff, MailOpen } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inisialisasi Klien Supabase Standar
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [strength, setStrength] = useState(0);

  // STATE BARU: Tampilan Sukses & Intip Sandi
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Logika Kalkulasi Kekuatan Sandi
  useEffect(() => {
    let score = 0;
    if (!password) { 
      setStrength(0); 
      return; 
    }
    if (password.length > 7) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    setStrength(score);
  }, [password]);

  const getStrengthColor = () => {
    switch (strength) {
      case 1: return "bg-red-500 w-1/4 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      case 2: return "bg-orange-500 w-2/4 shadow-[0_0_10px_rgba(249,115,22,0.5)]";
      case 3: return "bg-amber-500 w-3/4 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case 4: return "bg-emerald-500 w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      default: return "bg-white/10 w-0";
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 1: return "Sangat Lemah";
      case 2: return "Lemah";
      case 3: return "Cukup Kuat";
      case 4: return "Sangat Kuat";
      default: return "";
    }
  };

  // Fungsi Validasi
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => phone.startsWith("08") && phone.length >= 10 && phone.length <= 13;

  // Filter Input HP (Hanya menerima angka, blokir syntax)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // Buang semua selain angka
    if (val.length <= 13) {
      setPhone(val);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name, 
          phone: phone 
        } 
      }
    });

    if (signUpError) {
      let customMessage = signUpError.message;

      // 1. Tangkap error saat Trigger/Constraint database menolak data
      if (customMessage.includes("Database error saving new user")) {
        customMessage = "Pendaftaran gagal diproses. Pastikan format nama sesuai (tanpa simbol khusus) dan nomor WhatsApp belum terdaftar sebelumnya.";
      } 
      // 2. Tangkap error jika email sudah ada di Supabase
      else if (customMessage.includes("User already registered")) {
        customMessage = "Alamat email ini sudah terdaftar. Silakan gunakan email lain atau menuju halaman Masuk.";
      }
      // 3. Tangkap error rate limit pendaftaran (jika klien spam tombol daftar)
      else if (customMessage.toLowerCase().includes("rate limit")) {
        customMessage = "Terlalu banyak permintaan pendaftaran. Mohon tunggu beberapa saat sebelum mencoba lagi.";
      }

      setError(customMessage);
    } else {
      console.log("Register Berhasil", data);
      // AKTIFKAN HALAMAN SUKSES JIKA BERHASIL
      setIsSuccess(true);
    }
  };

  // Evaluasi semua syarat untuk mengaktifkan tombol
  const isEmailValid = validateEmail(email);
  const isPhoneValid = validatePhone(phone);
  const passwordsMatch = password === confirmPassword;
  
  const isButtonDisabled = !name || !isEmailValid || !isPhoneValid || strength < 3 || !passwordsMatch;

  return (
    <div className="relative min-h-screen py-12 flex items-center justify-center bg-[#050505] overflow-hidden px-4">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] rounded-full bg-amber-600/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[60%] h-[60%] rounded-full bg-zinc-800/30 blur-[150px] pointer-events-none"></div>

      {/* Glass Card */}
      <div className="relative z-10 max-w-md w-full backdrop-blur-[40px] bg-white/[0.02] border border-white/[0.05] p-10 rounded-3xl shadow-[0_0_80px_-20px_rgba(0,0,0,1)] transition-all duration-500">
        
        {/* KONDISI 1: JIKA PENDAFTARAN BERHASIL */}
        {isSuccess ? (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <MailOpen className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-light text-white tracking-wide mb-3">Cek Email Anda</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Tautan konfirmasi telah dikirimkan ke email: <br />
              <strong className="text-white/90 font-mono">{email}</strong>
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 text-left">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400/90 text-xs leading-relaxed">
                  Silakan periksa folder <strong>Inbox</strong> atau <strong>Spam/Junk</strong> Anda. Anda harus mengklik tautan tersebut sebelum dapat masuk ke sistem.
                </p>
              </div>
            </div>
            <Link href="/login" className="inline-block w-full text-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-white font-medium rounded-xl py-4 transition-all duration-300">
              Kembali ke Login
            </Link>
          </div>
        ) : (

        /* KONDISI 2: FORMULIR PENDAFTARAN UTAMA */
        <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light text-white tracking-wide mb-2">Pendaftaran Akses</h2>
            <p className="text-white/50 text-sm">Bergabunglah untuk pengalaman <span className="text-amber-500 font-medium">Maeng Studio</span></p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="flex items-center text-red-400 text-sm bg-red-500/10 backdrop-blur-md p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Input Nama */}
            <div className="relative">
              <User className="absolute left-4 top-4 h-5 w-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Nama Lengkap" 
                className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.05] text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] transition-all" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            {/* Input Email */}
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
                  onChange={(e) => { 
                    setEmail(e.target.value); 
                    // Reset field di bawahnya jika email salah ketik lagi untuk keamanan data
                    if (!validateEmail(e.target.value)) { 
                      setPhone(""); 
                      setPassword(""); 
                      setConfirmPassword(""); 
                    } 
                  }} 
                  required 
                />
                {email && isEmailValid && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-amber-500" />}
              </div>
              {email && !isEmailValid && <p className="text-red-400/90 text-[10px] mt-1.5 px-1">Format email belum benar.</p>}
            </div>

            {/* Input HP (Terkunci jika email salah) */}
            <div>
              <div className="relative">
                <Phone className={`absolute left-4 top-4 h-5 w-5 ${!isEmailValid ? 'text-white/20' : 'text-white/40'}`} />
                <input 
                  type="tel" 
                  placeholder={!isEmailValid ? "Isi email dahulu" : "Nomor WhatsApp (08...)"} 
                  disabled={!isEmailValid} 
                  className={`w-full bg-white/[0.03] backdrop-blur-md text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-10 focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent ${
                    phone && !isPhoneValid 
                      ? 'border-red-500/50' 
                      : 'border-white/[0.05] focus:border-amber-500/50 focus:bg-white/[0.06]'
                  }`} 
                  value={phone} 
                  onChange={handlePhoneChange} 
                  required 
                />
                {phone && isPhoneValid && <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-amber-500" />}
              </div>
              {phone && !isPhoneValid && (
                <p className="text-red-400/90 text-[10px] mt-1.5 px-1">
                  {!phone.startsWith("08") ? "Harus dimulai dengan 08" : "Minimal 10-13 digit angka"}
                </p>
              )}
            </div>

            {/* Input Password (Terkunci jika email ATAU hp salah) */}
            <div>
              <div className="relative">
                <Lock className={`absolute left-4 top-4 h-5 w-5 ${(!isEmailValid || !isPhoneValid) ? 'text-white/20' : 'text-white/40'}`} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={!isEmailValid || !isPhoneValid ? "Terkunci" : "Buat Kata Sandi"} 
                  disabled={!isEmailValid || !isPhoneValid} 
                  className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.05] text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                
                {/* TOMBOL INTIP SANDI */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!isEmailValid || !isPhoneValid}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && isPhoneValid && (
                <div className="mt-3 px-1">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ease-out ${getStrengthColor()}`}></div>
                  </div>
                  <p className="text-[10px] text-white/50 mt-1.5">
                    Kekuatan: <span className={strength >= 3 ? "text-amber-400 font-medium" : "text-white/70"}>{getStrengthText()}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Input Konfirmasi Password */}
            <div>
              <div className="relative">
                <Lock className={`absolute left-4 top-4 h-5 w-5 ${(!isEmailValid || !isPhoneValid) ? 'text-white/20' : 'text-white/40'}`} />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder={!isEmailValid || !isPhoneValid ? "Terkunci" : "Ketikkan sandi ulang"} 
                  disabled={!isEmailValid || !isPhoneValid} 
                  className={`w-full bg-white/[0.03] backdrop-blur-md text-white placeholder-white/30 text-sm rounded-xl py-4 pl-12 pr-20 focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent ${
                    confirmPassword && !passwordsMatch 
                      ? 'border-red-500/50' 
                      : 'border-white/[0.05] focus:border-amber-500/50 focus:bg-white/[0.06]'
                  }`} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
                
                {/* TOMBOL INTIP KONFIRMASI SANDI (Diposisikan di right-12 agar tidak nabrak centang validasi) */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-12 top-4 text-white/40 hover:text-white transition-colors disabled:opacity-30"
                  disabled={!isEmailValid || !isPhoneValid}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>

                {confirmPassword && isPhoneValid && (
                  <div className="absolute right-4 top-4">
                    {passwordsMatch ? <CheckCircle2 className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  </div>
                )}
              </div>
              {confirmPassword && !passwordsMatch && isPhoneValid && <p className="text-red-400/90 text-[10px] mt-1.5 px-1">Kata sandi tidak cocok.</p>}
            </div>

            <button 
              type="submit" 
              disabled={isButtonDisabled} 
              className={`w-full font-semibold rounded-xl py-4 mt-4 transition-all duration-300 ${
                !isButtonDisabled 
                  ? "bg-amber-500 hover:bg-amber-400 text-black transform hover:scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.3)]" 
                  : "bg-white/[0.02] border border-white/[0.05] text-white/30 cursor-not-allowed backdrop-blur-sm"
              }`}
            >
              Buat Akun
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-8">
            Sudah menjadi klien? <Link href="/login" className="text-white hover:text-amber-500 transition-colors font-medium">Masuk di sini</Link>
          </p>
        </>
        )}
      </div>
    </div>
  );
}