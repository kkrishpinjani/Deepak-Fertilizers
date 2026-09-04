"use client";

import { useState } from "react";
import { Box, Typography, Collapse, Link as MLink } from "@mui/material";

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

  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ maxWidth: 780 }}>
        <Typography variant="overline" color="text.secondary">
          {eyebrow}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.25, mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "1.05rem" }}>
          {takeaway}
        </Typography>
        {howThisWorks && (
          <>
            <MLink component="button" type="button" variant="body2" onClick={() => setOpen((o) => !o)} sx={{ mt: 1, fontWeight: 650 }}>
              {open ? "Hide how this works" : "See how this works"}
            </MLink>
            <Collapse in={open}>
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
