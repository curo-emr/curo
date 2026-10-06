import { HeartPulse, Shield, Clock, Activity } from "lucide-react";

const features = [
  { icon: Clock, text: "Live triage queue, longest wait first" },
  { icon: Activity, text: "Vitals flagged against normal ranges as you type" },
  { icon: Shield, text: "Allergies and conditions visible before you start" },
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-[44%] h-full flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg, #050c1a 0%, #0b1c3b 40%, #111f40 65%, #091729 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute -top-28 -left-28 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(147,197,253,0.06) 0%, transparent 70%)",
            transform: "translate(-40%, -50%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">
              Curo
            </span>
            <p className="text-[11px] text-white/40 leading-none mt-0.5">
              Nurse Station
            </p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-[38px] font-bold text-white leading-tight">
              Every patient,
              <br />
              <span style={{ color: "rgba(147,197,253,0.85)" }}>
                measured before the doctor
              </span>
            </h2>
            <p className="text-white/45 text-[15px] leading-relaxed max-w-[272px]">
              Take each patient&apos;s vitals at triage and they are waiting
              in the doctor&apos;s visit when the consultation starts.
            </p>
          </div>

          <div className="space-y-2.5">
            {features.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(59,130,246,0.22)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <span className="text-white/62 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/20 text-xs">
          © {new Date().getFullYear()} Curo. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 h-full overflow-y-auto flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px]">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #060d1a 0%, #12244a 100%)",
              }}
            >
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Curo
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
