"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import GoogleIcon from "@mui/icons-material/Google";
import MicrosoftIcon from "@mui/icons-material/Window";
import ThemeToggle from "@/components/ThemeToggle";
import StatusBadge from "@/components/StatusBadge";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useSystemStatus() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/connectors", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const active = (d.connectors ?? []).filter((c: any) => c.mode === "active");
        setHealthy(active.length > 0 && active.every((c: any) => c.healthy));
      })
      .catch(() => !cancelled && setHealthy(false));
    return () => {
      cancelled = true;
    };
  }, []);
  return healthy;
}

// Ambient animated backdrop — orbiting glow nebulas, a slow-drifting grid,
// and a scattered field of drifting particles. Pure CSS/SVG, no chart/graph
// library. This is the one screen in the app allowed to go full cinematic —
// it's a standalone entry point, not a working data surface.
function AmbientField() {
  const particles = Array.from({ length: 26 }, (_, i) => {
    const seed = i * 137.5;
    const left = (seed % 100).toFixed(1);
    const top = ((seed * 1.7) % 100).toFixed(1);
    const size = 1.5 + (i % 4) * 0.6;
    const duration = 10 + (i % 7) * 2.4;
    const delay = -(i % 9) * 1.3;
    const colors = ["#5aa9ff", "#a78bfa", "#67e8f9"];
    return { left, top, size, duration, delay, color: colors[i % colors.length] };
  });

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(148,163,220,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,220,0.10) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black 25%, transparent 78%)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: "50%",
          top: "-18%",
          left: "-12%",
          background: "radial-gradient(circle, rgba(90,169,255,0.40), transparent 68%)",
          filter: "blur(6px)",
          animation: "driftA 20s ease-in-out infinite",
          "@keyframes driftA": {
            "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
            "50%": { transform: "translate(60px, 40px) scale(1.12)" },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 680,
          height: 680,
          borderRadius: "50%",
          bottom: "-20%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(167,139,250,0.36), transparent 68%)",
          filter: "blur(6px)",
          animation: "driftB 24s ease-in-out infinite",
          "@keyframes driftB": {
            "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
            "50%": { transform: "translate(-50px, -55px) scale(1.14)" },
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 480,
          height: 480,
          borderRadius: "50%",
          top: "32%",
          left: "56%",
          background: "radial-gradient(circle, rgba(103,232,249,0.26), transparent 68%)",
          filter: "blur(6px)",
          animation: "driftC 28s ease-in-out infinite",
          "@keyframes driftC": {
            "0%, 100%": { transform: "translate(0px, 0px)" },
            "50%": { transform: "translate(-70px, 30px)" },
          },
        }}
      />

      {particles.map((p, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            bgcolor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            opacity: 0.55,
            animation: `floatP-${i} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            [`@keyframes floatP-${i}`]: {
              "0%, 100%": { transform: "translateY(0px)", opacity: 0.25 },
              "50%": { transform: "translateY(-22px)", opacity: 0.75 },
            },
          }}
        />
      ))}
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const systemHealthy = useSystemStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const emailError = touched && !EMAIL_RE.test(email);
  const passwordError = touched && password.length === 0;
  const canSubmit = EMAIL_RE.test(email) && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setAuthError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Sign in failed.");
        setSubmitting(false);
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setAuthError("We couldn't reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {isDark && <AmbientField />}

      <Box sx={{ position: "fixed", top: 20, right: 20, zIndex: 2 }}>
        <ThemeToggle />
      </Box>

      <Stack spacing={3} sx={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        <Stack alignItems="center" spacing={1.5}>
          <Box sx={{ position: "relative", width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isDark && (
              <>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "1px solid rgba(90,169,255,0.35)",
                    animation: "spin 14s linear infinite",
                    "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -3,
                      left: "50%",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#5aa9ff",
                      boxShadow: "0 0 10px #5aa9ff, 0 0 20px #5aa9ff",
                      transform: "translateX(-50%)",
                    },
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 10,
                    borderRadius: "50%",
                    border: "1px solid rgba(167,139,250,0.3)",
                    animation: "spinRev 20s linear infinite",
                    "@keyframes spinRev": { to: { transform: "rotate(-360deg)" } },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      bottom: -3,
                      left: "50%",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      bgcolor: "#a78bfa",
                      boxShadow: "0 0 10px #a78bfa, 0 0 18px #a78bfa",
                      transform: "translateX(-50%)",
                    },
                  }}
                />
              </>
            )}
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "primary.main",
                boxShadow: isDark ? "0 0 40px rgba(90,169,255,0.85)" : "none",
              }}
            >
              <BoltRoundedIcon sx={{ fontSize: 28, color: "#fff" }} />
            </Box>
          </Box>
          <Typography variant="h5" sx={{ fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 700 }}>
            Finance Intelligence
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            ENTERPRISE AI · DEEPAK FERTILISERS &amp; PETROCHEMICALS
          </Typography>
        </Stack>

        <Box
          sx={{
            p: "2px",
            borderRadius: 4,
            background: isDark
              ? "linear-gradient(135deg, rgba(90,169,255,0.9), rgba(167,139,250,0.7), rgba(103,232,249,0.7), rgba(90,169,255,0.9))"
              : "transparent",
            backgroundSize: "300% 300%",
            animation: isDark ? "gradientShift 8s ease infinite" : "none",
            "@keyframes gradientShift": {
              "0%": { backgroundPosition: "0% 50%" },
              "50%": { backgroundPosition: "100% 50%" },
              "100%": { backgroundPosition: "0% 50%" },
            },
            boxShadow: isDark ? "0 0 60px rgba(90,169,255,0.35), 0 0 120px rgba(167,139,250,0.18)" : "none",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3.7,
              bgcolor: isDark ? "rgba(12,16,28,0.92)" : "background.paper",
              backdropFilter: isDark ? "blur(20px)" : "none",
              border: isDark ? "none" : "1px solid",
              borderColor: "divider",
              boxShadow: isDark ? "0 24px 64px rgba(2,4,16,0.6)" : "0 1px 3px rgba(16,24,40,0.08)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Sign in to your workspace
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Governed access to your finance and operations intelligence.
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthError(null)}>
                {authError}
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                label="Work email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAuthError(null);
                }}
                error={emailError}
                helperText={emailError ? "Enter a valid email address" : " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError(null);
                }}
                error={passwordError}
                helperText={passwordError ? "Password is required" : " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end" tabIndex={-1}>
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />

              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: -1 }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                  label={<Typography variant="caption">Keep me signed in</Typography>}
                />
              </Stack>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRoundedIcon fontSize="small" />}
                sx={{
                  py: 1.1,
                  fontSize: 15,
                  boxShadow: isDark ? "0 0 0 1px rgba(90,169,255,0.4), 0 10px 30px rgba(90,169,255,0.28)" : "none",
                }}
              >
                {submitting ? "Entering workspace…" : "Sign in"}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                Sign in with your DFPCL workspace credentials.
              </Typography>

              <Divider sx={{ my: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Stack direction="row" spacing={1.5}>
                <Tooltip title="Single sign-on is not configured in this environment" arrow>
                  <span style={{ flex: 1 }}>
                    <Button fullWidth variant="outlined" disabled startIcon={<GoogleIcon fontSize="small" />}>
                      Google
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Single sign-on is not configured in this environment" arrow>
                  <span style={{ flex: 1 }}>
                    <Button fullWidth variant="outlined" disabled startIcon={<MicrosoftIcon fontSize="small" />}>
                      Microsoft
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          {systemHealthy === null ? (
            <StatusBadge tone="neutral" label="Checking system status…" size="small" />
          ) : (
            <StatusBadge
              tone={systemHealthy ? "positive" : "watch"}
              label={systemHealthy ? "Data systems healthy" : "Data systems degraded"}
              size="small"
            />
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
