import { Icon } from "@iconify/react";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/router";
import { CC } from "@/constants";
import NavLink from "@/components/NavLink";
import Image from "next/image";

export const SIDEBAR_WIDTH = 256;

const NAV_LINKS = [
  { text: "Analyze", icon: "mdi:chart-line", href: "/" },
  { text: "Database", icon: "mdi:database-outline", href: "/database" },
  {
    text: "Openings",
    icon: "mdi:book-open-page-variant-outline",
    href: "/openings",
  },
  { text: "Exercises", icon: "mdi:target", href: "/exercises" },
  { text: "Stats", icon: "mdi:chart-bar", href: "/stats" },
  { text: "Notes", icon: "mdi:note-text-outline", href: "/notes" },
];

interface Props {
  darkMode: boolean;
  switchDarkMode: () => void;
}

export default function SideBar({ darkMode, switchDarkMode }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component="aside"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: isDark ? CC.navBg : CC.lBg1,
        borderRight: `1px solid ${isDark ? CC.navBorder : CC.lBorder}`,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        padding: "24px 20px",
        gap: "32px",
        zIndex: (t) => t.zIndex.drawer,
      }}
    >
      {/* Brand */}
      <NavLink href="/">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "8px",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Image
              src="/favicon.png"
              alt="White to Move"
              width={40}
              height={40}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: "var(--cc-font-headline)",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.03em",
              color: CC.primary,
              lineHeight: 1,
            }}
          >
            White to Move
          </Typography>
        </Box>
      </NavLink>

      {/* Nav items */}
      <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
        {NAV_LINKS.map(({ text, icon, href }) => {
          const isActive =
            href === "/"
              ? router.pathname === "/"
              : router.pathname.startsWith(href);
          return (
            <NavLink key={href} href={href}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: "10px",
                  px: "8px",
                  cursor: "pointer",
                  position: "relative",
                  color: isActive ? (isDark ? CC.text : CC.lText) : CC.textSub,
                  fontWeight: isActive ? 700 : 500,
                  transition: "color 200ms ease",
                  "&:hover": { color: CC.primary },
                  "&::before": isActive
                    ? {
                        content: '""',
                        position: "absolute",
                        left: -12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: CC.primary,
                      }
                    : undefined,
                }}
              >
                <Icon icon={icon} width={20} />
                <Typography
                  sx={{
                    fontFamily: "var(--cc-font-body)",
                    fontSize: 16,
                    fontWeight: "inherit",
                    color: "inherit",
                  }}
                >
                  {text}
                </Typography>
              </Box>
            </NavLink>
          );
        })}
      </Stack>

      {/* Bottom area: theme toggle */}
      <Stack spacing={2}>
        <Tooltip
          title={darkMode ? "Light mode" : "Dark mode"}
          placement="right"
        >
          <IconButton
            onClick={switchDarkMode}
            aria-label="Toggle dark mode"
            sx={{
              borderRadius: "var(--cc-radius-pill)",
              alignSelf: "flex-start",
              color: CC.textSub,
              backgroundColor: "var(--cc-surface-container-low)",
              px: 2,
              py: 1,
              gap: 1,
              "&:hover": {
                backgroundColor: "var(--cc-primary-fixed)",
                color: CC.primary,
              },
            }}
          >
            <Icon
              icon={darkMode ? "mdi:weather-sunny" : "mdi:weather-night"}
              width={18}
            />
            <Typography
              sx={{
                fontFamily: "var(--cc-font-body)",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              {darkMode ? "Light mode" : "Dark mode"}
            </Typography>
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
