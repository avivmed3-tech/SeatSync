import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ── Timing constants (frames @ 30fps) ──────────────────────────────────────
const PHONE_ENTER_START = 0;
const PHONE_ENTER_END = 25;
const NOTIF_ENTER_START = 35;
const NOTIF_ENTER_END = 60;
const NOTIF_HOLD_END = 110;
const CHECKMARK_START = 115;
const CHECKMARK_END = 145;
const SUCCESS_PULSE_START = 145;

export const RSVPVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone entrance spring
  const phoneProgress = spring({
    frame: frame - PHONE_ENTER_START,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
    durationInFrames: PHONE_ENTER_END,
  });

  const phoneY = interpolate(phoneProgress, [0, 1], [160, 0]);
  const phoneOpacity = interpolate(phoneProgress, [0, 1], [0, 1]);

  // Notification slide-in spring
  const notifProgress = spring({
    frame: frame - NOTIF_ENTER_START,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.6 },
    durationInFrames: NOTIF_ENTER_END - NOTIF_ENTER_START,
  });

  const notifY = interpolate(notifProgress, [0, 1], [-120, 0]);
  const notifOpacity = interpolate(notifProgress, [0, 1], [0, 1]);

  // Checkmark draw progress
  const checkProgress = spring({
    frame: frame - CHECKMARK_START,
    fps,
    config: { damping: 22, stiffness: 180, mass: 0.5 },
    durationInFrames: CHECKMARK_END - CHECKMARK_START,
  });

  // Success glow pulse (repeating sine)
  const pulseOpacity =
    frame >= SUCCESS_PULSE_START
      ? 0.15 +
        0.1 *
          Math.sin(((frame - SUCCESS_PULSE_START) / fps) * Math.PI * 2 * 1.8)
      : 0;

  // Button label flips when confirmed
  const isConfirmed = frame >= CHECKMARK_END;

  // Screen glow intensity
  const glowSize = interpolate(checkProgress, [0, 1], [0, 40]);

  return (
    <AbsoluteFill style={styles.root}>
      {/* Gradient background */}
      <AbsoluteFill style={styles.bg} />

      {/* Decorative circles */}
      <div style={styles.circle1} />
      <div style={styles.circle2} />

      {/* Phone shell */}
      <div
        style={{
          ...styles.phoneWrapper,
          transform: `translateY(${phoneY}px)`,
          opacity: phoneOpacity,
        }}
      >
        {/* Glow ring behind phone */}
        {frame >= CHECKMARK_START && (
          <div
            style={{
              ...styles.glowRing,
              boxShadow: `0 0 ${glowSize}px ${glowSize}px rgba(74,222,128,0.25)`,
            }}
          />
        )}

        <div style={styles.phone}>
          {/* Notch */}
          <div style={styles.notch} />

          {/* Screen */}
          <div style={styles.screen}>
            {/* Status bar */}
            <div style={styles.statusBar}>
              <span style={styles.time}>9:41</span>
              <div style={styles.statusIcons}>
                <WifiIcon />
                <BatteryIcon />
              </div>
            </div>

            {/* Chat header */}
            <div style={styles.chatHeader}>
              <div style={styles.avatarCircle}>
                <span style={styles.avatarText}>🎉</span>
              </div>
              <div>
                <div style={styles.chatName}>SeatSync</div>
                <div style={styles.chatSub}>הודעה חדשה</div>
              </div>
            </div>

            {/* Message bubble */}
            <div
              style={{
                ...styles.bubbleContainer,
                transform: `translateY(${notifY}px)`,
                opacity: notifOpacity,
              }}
            >
              <div style={styles.bubble}>
                <div style={styles.bubbleTag}>הזמנה לאירוע</div>
                <div style={styles.bubbleTitle}>חתונת</div>
                <div style={styles.bubbleTitle}>נועה ❤️ יניב</div>
                <div style={styles.bubbleDetails}>
                  <DetailRow icon="📅" text="יום שישי, 12 ביוני 2026" />
                  <DetailRow icon="📍" text='אולם "גן עדן", תל אביב' />
                  <DetailRow icon="🕕" text="קבלת פנים 18:30" />
                </div>
                <div style={styles.divider} />
                <div style={styles.question}>האם תוכל/י להגיע?</div>

                {/* RSVP Buttons */}
                <div style={styles.btnRow}>
                  <button
                    style={{
                      ...styles.btnConfirm,
                      background: isConfirmed
                        ? "linear-gradient(135deg,#22c55e,#16a34a)"
                        : "linear-gradient(135deg,#4ade80,#22c55e)",
                      transform: isConfirmed ? "scale(1.05)" : "scale(1)",
                      boxShadow: isConfirmed
                        ? "0 4px 24px rgba(34,197,94,0.55)"
                        : "0 2px 12px rgba(34,197,94,0.3)",
                    }}
                  >
                    {isConfirmed ? (
                      <CheckmarkSVG progress={1} />
                    ) : (
                      <span style={styles.btnText}>✓ מגיע/ה</span>
                    )}
                  </button>
                  <button style={styles.btnDecline}>✗ לא מגיע/ה</button>
                </div>

                {isConfirmed && (
                  <div
                    style={{
                      ...styles.confirmedBadge,
                      opacity: interpolate(
                        frame,
                        [CHECKMARK_END, CHECKMARK_END + 15],
                        [0, 1],
                        { extrapolateRight: "clamp" }
                      ),
                      transform: `scale(${interpolate(
                        frame,
                        [CHECKMARK_END, CHECKMARK_END + 15],
                        [0.6, 1],
                        { extrapolateRight: "clamp" }
                      )})`,
                    }}
                  >
                    🎊 תודה! אישרת הגעה
                  </div>
                )}
              </div>
            </div>

            {/* Pulse overlay when confirmed */}
            {frame >= SUCCESS_PULSE_START && (
              <div
                style={{
                  ...styles.pulseOverlay,
                  opacity: pulseOpacity,
                }}
              />
            )}
          </div>

          {/* Home bar */}
          <div style={styles.homeBar} />
        </div>
      </div>

      {/* Bottom brand */}
      <div
        style={{
          ...styles.brand,
          opacity: interpolate(frame, [PHONE_ENTER_END, PHONE_ENTER_END + 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={styles.brandText}>SeatSync</span>
        <span style={styles.brandSub}>ניהול אורחים חכם</span>
      </div>
    </AbsoluteFill>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const DetailRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div style={styles.detailRow}>
    <span style={styles.detailIcon}>{icon}</span>
    <span style={styles.detailText}>{text}</span>
  </div>
);

const CheckmarkSVG: React.FC<{ progress: number }> = ({ progress }) => {
  const dashLen = 36;
  const offset = dashLen * (1 - progress);
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <polyline
        points="6,15 12,21 22,9"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashLen}
        strokeDashoffset={offset}
      />
    </svg>
  );
};

const WifiIcon = () => (
  <svg width="18" height="14" viewBox="0 0 24 18" fill="white" opacity={0.85}>
    <path d="M12 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-4a7 7 0 0 1 4.95 2.05l-1.41 1.41A5 5 0 0 0 12 12a5 5 0 0 0-3.54 1.46L7.05 12.05A7 7 0 0 1 12 10zm0-4a11 11 0 0 1 7.78 3.22l-1.41 1.41A9 9 0 0 0 12 8a9 9 0 0 0-6.37 2.63L4.22 9.22A11 11 0 0 1 12 6z" />
  </svg>
);

const BatteryIcon = () => (
  <svg width="26" height="14" viewBox="0 0 26 14" fill="none">
    <rect x="0.5" y="0.5" width="22" height="13" rx="3.5" stroke="white" strokeOpacity="0.85" />
    <rect x="2" y="2" width="17" height="10" rx="2" fill="white" fillOpacity="0.85" />
    <path d="M23 4.5v5a2.5 2.5 0 0 0 0-5z" fill="white" fillOpacity="0.85" />
  </svg>
);

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    direction: "rtl",
  },
  bg: {
    background:
      "linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
  },
  circle1: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
    top: -120,
    right: -120,
  },
  circle2: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
    bottom: 80,
    left: -80,
  },
  phoneWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    inset: -20,
    borderRadius: 68,
    pointerEvents: "none",
  },
  phone: {
    width: 380,
    height: 760,
    background: "linear-gradient(180deg,#1c1c1e 0%,#2c2c2e 100%)",
    borderRadius: 50,
    border: "2.5px solid rgba(255,255,255,0.12)",
    boxShadow:
      "0 32px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  notch: {
    width: 120,
    height: 30,
    background: "#1c1c1e",
    borderRadius: "0 0 24px 24px",
    marginTop: 0,
    zIndex: 10,
    flexShrink: 0,
  },
  screen: {
    flex: 1,
    width: "100%",
    background: "linear-gradient(180deg,#111827 0%,#1f2937 100%)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  },
  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 22px",
    flexShrink: 0,
  },
  time: {
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  statusIcons: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 18px 14px",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    flexShrink: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  avatarText: { fontSize: 22 },
  chatName: {
    color: "white",
    fontWeight: 700,
    fontSize: 16,
  },
  chatSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 1,
  },
  bubbleContainer: {
    flex: 1,
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  bubble: {
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.18) 100%)",
    border: "1px solid rgba(139,92,246,0.35)",
    borderRadius: 20,
    padding: "18px 16px 14px",
    backdropFilter: "blur(8px)",
  },
  bubbleTag: {
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "white",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
    display: "inline-block",
    marginBottom: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bubbleTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.3,
    marginBottom: 2,
    textAlign: "right",
  },
  bubbleDetails: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.1)",
    margin: "14px 0 10px",
  },
  question: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 12,
  },
  btnRow: {
    display: "flex",
    gap: 10,
    flexDirection: "row-reverse",
  },
  btnConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
  },
  btnDecline: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnText: {
    color: "white",
    fontSize: 15,
    fontWeight: 700,
  },
  confirmedBadge: {
    marginTop: 12,
    background: "linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.2))",
    border: "1px solid rgba(34,197,94,0.45)",
    borderRadius: 12,
    padding: "8px 14px",
    color: "#4ade80",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexDirection: "row-reverse",
  },
  detailIcon: { fontSize: 15 },
  detailText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: 500,
  },
  pulseOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 50% 65%, rgba(34,197,94,0.3) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  homeBar: {
    width: 130,
    height: 5,
    background: "rgba(255,255,255,0.35)",
    borderRadius: 3,
    margin: "10px auto 12px",
    flexShrink: 0,
  },
  brand: {
    position: "absolute",
    bottom: 80,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  brandText: {
    color: "white",
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: 1,
  },
  brandSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 16,
    letterSpacing: 0.5,
  },
};
