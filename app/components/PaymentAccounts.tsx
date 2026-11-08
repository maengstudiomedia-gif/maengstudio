const PAYMENT_ACCOUNTS = [
  { name: "BCA", number: "8435901499", mark: "BCA", markClass: "text-[#00529c]" },
  { name: "SeaBank", number: "901760387739", mark: "SeaBank", markClass: "text-[#ed6b24]" },
  { name: "DANA", number: "08117873878", mark: "DANA", markClass: "text-[#118eea]" },
];

export default function PaymentAccounts({
  theme = "light",
  showConfirmation = false,
}: {
  theme?: "dark" | "light";
  showConfirmation?: boolean;
}) {
  const isDark = theme === "dark";

  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold ${isDark ? "text-white/75" : "text-[#52645a]"}`}>
        Transfer Bank / E-wallet · a.n. Guntur Bayu Jantoro
      </p>
      {PAYMENT_ACCOUNTS.map((account) => (
        <div
          key={account.name}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
            isDark ? "border-white/10 bg-white/[0.04]" : "border-[#e8eee9] bg-white"
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid h-9 min-w-14 place-items-center rounded-lg bg-white px-2 text-[11px] font-black ${account.markClass}`}
          >
            {account.mark}
          </span>
          <div className="min-w-0">
            <p className={`text-[10px] ${isDark ? "text-white/45" : "text-[#819087]"}`}>{account.name}</p>
            <p className={`font-mono text-xs font-semibold ${isDark ? "text-white/80" : "text-[#27362d]"}`}>
              {account.number}
            </p>
          </div>
        </div>
      ))}
      {showConfirmation && (
        <p className={`border-t pt-2 text-xs ${isDark ? "border-white/10 text-white/55" : "border-[#edf1ee] text-[#718078]"}`}>
          Setelah transfer, konfirmasi melalui WhatsApp.
        </p>
      )}
    </div>
  );
}