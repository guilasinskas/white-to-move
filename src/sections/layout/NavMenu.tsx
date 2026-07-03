import NavLink from "@/components/NavLink";
import { Icon } from "@iconify/react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/router";
import { CC } from "@/constants";

const MenuOptions = [
  { text: "Analysis", icon: "streamline:magnifying-glass-solid", href: "/" },
  { text: "Database", icon: "streamline:database", href: "/database" },
  { text: "Openings", icon: "streamline:book-reading", href: "/openings" },
  { text: "Exercises", icon: "mdi:target", href: "/exercises" },
  { text: "Stats", icon: "mdi:chart-bar", href: "/stats" },
  {
    text: "Notes",
    icon: "material-symbols:sticky-note-2-outline",
    href: "/notes",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NavMenu({ open, onClose }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 240, pt: 1 }}>
        <Box sx={{ px: 2, py: 1, mb: "4px" }}>
          <Typography
            sx={{
              fontFamily: "var(--cc-font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isDark ? CC.textMuted : "#8a8a8a",
            }}
          >
            Navigation
          </Typography>
        </Box>

        <List
          sx={{ px: 1, gap: "2px", display: "flex", flexDirection: "column" }}
        >
          {MenuOptions.map(({ text, icon, href }) => {
            const isActive =
              href === "/"
                ? router.pathname === "/"
                : router.pathname.startsWith(href);
            return (
              <NavLink key={href} href={href}>
                <ListItemButton
                  onClick={onClose}
                  selected={isActive}
                  sx={{
                    py: "10px",
                    px: "10px",
                    borderRadius: "4px",
                    mb: "2px",
                    borderLeft: isActive
                      ? `2px solid ${isDark ? CC.text : CC.lText}`
                      : "2px solid transparent",
                    backgroundColor: isActive ? CC.primaryMuted : "transparent",
                    "&:hover": {
                      backgroundColor: isDark ? CC.bg3 : CC.lBg3,
                    },
                    "&.Mui-selected": {
                      backgroundColor: CC.primaryMuted,
                      "&:hover": {
                        backgroundColor: CC.primarySubtle,
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Icon
                      icon={icon}
                      width={17}
                      color={
                        isActive
                          ? isDark
                            ? CC.text
                            : CC.lText
                          : isDark
                            ? CC.textSub
                            : CC.lTextSub
                      }
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={text}
                    primaryTypographyProps={{
                      fontFamily: "var(--cc-font-body)",
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: "-0.005em",
                      color: isActive
                        ? isDark
                          ? CC.text
                          : CC.lText
                        : isDark
                          ? CC.textSub
                          : CC.lTextSub,
                    }}
                  />
                </ListItemButton>
              </NavLink>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
