"use client";

import { useState } from "react";
import { Box, Typography, Collapse, Link as MLink, useTheme } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

export default function PageHeader({
  eyebrow,
  title,
  takeaway,
  actions,
  howThisWorks,
}: {
  eyebrow: string;
  title: string;
  takeaway: React.ReactNode;
  actions?: React.ReactNode;
  howThisWorks?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ maxWidth: 780 }}>
        <Typography
          variant="overline"
          color="primary.main"
          sx={{
            position: "relative",
            display: "inline-block",
            pb: 0.4,
            "&::after": {
              content: '""',
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 28,
              height: 2,
              borderRadius: 1,
              bgcolor: "primary.main",
              opacity: isDark ? 0.7 : 0.55,
            },
          }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.6, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "1.05rem" }}>
          {takeaway}
        </Typography>
        {howThisWorks && (
          <>
            <MLink
              component="button"
              type="button"
              variant="body2"
              onClick={() => setOpen((o) => !o)}
              underline="hover"
              sx={{
                mt: 1.25,
                fontWeight: 650,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.35,
                color: "text.secondary",
                transition: "color 150ms ease",
                "&:hover": { color: "primary.main" },
              }}
            >
              {open ? "Hide how this works" : "See how this works"}
              <ExpandMoreRoundedIcon
                sx={{
                  fontSize: 16,
                  transition: "transform 200ms ease",
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </MLink>
            <Collapse in={open} timeout={200}>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                {howThisWorks}
              </Typography>
            </Collapse>
          </>
        )}
      </Box>
      {actions && <Box sx={{ mt: 2.5 }}>{actions}</Box>}
    </Box>
  );
}
