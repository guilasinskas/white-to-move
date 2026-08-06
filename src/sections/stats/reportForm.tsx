import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  CircularProgress,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { ReportPlatform, ReportTimeControl } from "@/types/playerReport";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface ReportQuery {
  platform: ReportPlatform;
  username: string;
  timeControl: ReportTimeControl;
  since: string;
  until: string;
  engineDepth: number;
  maxGames: number;
}

interface StoredQuery {
  platform: ReportPlatform;
  username: string;
  timeControl: ReportTimeControl;
}

const TIME_CONTROLS: { value: ReportTimeControl; label: string }[] = [
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
  { value: "correspondence", label: "Correspondence" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function ReportForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (query: ReportQuery) => void;
  disabled?: boolean;
}) {
  const [stored, setStored] = useLocalStorage<StoredQuery>(
    "player-report-query",
    { platform: "lichess", username: "", timeControl: "bullet" }
  );

  const [platform, setPlatform] = useState<ReportPlatform>(
    stored?.platform ?? "lichess"
  );
  const [username, setUsername] = useState(stored?.username ?? "");
  const [timeControl, setTimeControl] = useState<ReportTimeControl>(
    stored?.timeControl ?? "bullet"
  );
  const [since, setSince] = useState(monthsAgoIso(3));
  const [until, setUntil] = useState(todayIso());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [engineDepth, setEngineDepth] = useState(14);
  const [maxGames, setMaxGames] = useState(2000);

  const handleSubmit = () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setStored({ platform, username: trimmed, timeControl });
    onSubmit({
      platform,
      username: trimmed,
      timeControl,
      since,
      until,
      engineDepth,
      maxGames,
    });
  };

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: "var(--cc-radius-xl)",
        backgroundColor: "var(--cc-surface-container-lowest)",
        boxShadow: "var(--cc-shadow-ambient)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <ToggleButtonGroup
          value={platform}
          exclusive
          size="small"
          onChange={(_, v) => v && setPlatform(v)}
        >
          <ToggleButton value="lichess" sx={{ px: 1.5, fontSize: "0.78rem" }}>
            <Icon
              icon="simple-icons:lichess"
              width={14}
              style={{ marginRight: 6 }}
            />
            Lichess
          </ToggleButton>
          <ToggleButton value="chessCom" sx={{ px: 1.5, fontSize: "0.78rem" }}>
            <Icon
              icon="simple-icons:chess-dot-com"
              width={14}
              color={platform === "chessCom" ? "#81b64c" : undefined}
              style={{ marginRight: 6 }}
            />
            Chess.com
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Username"
          size="small"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          sx={{ flex: 1, minWidth: 160 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Time control</InputLabel>
          <Select
            value={timeControl}
            label="Time control"
            onChange={(e) =>
              setTimeControl(e.target.value as ReportTimeControl)
            }
          >
            {TIME_CONTROLS.map((tc) => (
              <MenuItem key={tc.value} value={tc.value}>
                {tc.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="From"
          type="date"
          size="small"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!username.trim() || disabled}
          startIcon={
            disabled ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Icon icon="mdi:magnify" width={16} />
            )
          }
          sx={{ height: 40 }}
        >
          {disabled ? "Working…" : "Analyze"}
        </Button>
      </Box>

      <Button
        size="small"
        onClick={() => setShowAdvanced((s) => !s)}
        sx={{ mt: 1.5, textTransform: "none", fontSize: "0.78rem" }}
        startIcon={
          <Icon
            icon={showAdvanced ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={16}
          />
        }
      >
        Advanced settings
      </Button>
      <Collapse in={showAdvanced}>
        <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
          <TextField
            label="Engine depth"
            type="number"
            size="small"
            value={engineDepth}
            onChange={(e) =>
              setEngineDepth(
                Math.max(6, Math.min(24, Number(e.target.value) || 14))
              )
            }
            sx={{ width: 140 }}
          />
          <TextField
            label="Max games"
            type="number"
            size="small"
            value={maxGames}
            onChange={(e) =>
              setMaxGames(
                Math.max(1, Math.min(2000, Number(e.target.value) || 2000))
              )
            }
            sx={{ width: 140 }}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
