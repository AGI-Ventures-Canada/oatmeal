"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FlaskConical,
  Loader2,
  X,
  Users,
  FileText,
  DoorOpen,
  Gavel,
  Trophy,
  MessageCircle,
  Zap,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  Tags,
  Share2,
  Calculator,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HackathonStatus, HackathonPhase } from "@/lib/db/hackathon-types";
import { getTimelineState } from "@/lib/utils/timeline";
import { cn } from "@/lib/utils";

const ALL_STAGES: { status: HackathonStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "registration_open", label: "Reg. Open" },
  { status: "active", label: "Active" },
  { status: "judging", label: "Judging" },
  { status: "completed", label: "Completed" },
  { status: "archived", label: "Archived" },
];

const ALL_PHASES: { phase: HackathonPhase | null; label: string }[] = [
  { phase: null, label: "None" },
  { phase: "build", label: "Build" },
  { phase: "submission_open", label: "Submit" },
  { phase: "preliminaries", label: "Prelims" },
  { phase: "finals", label: "Finals" },
  { phase: "results_pending", label: "Results" },
];

const TIMELINE_PRESETS = [
  { label: "Started 2h ago, ends in 6h", startsAt: -2, endsAt: 6 },
  { label: "Started 1h ago, ends in 30m", startsAt: -1, endsAt: 0.5 },
  { label: "Starts in 1h, ends in 24h", startsAt: 1, endsAt: 24 },
  { label: "Ended 1h ago", startsAt: -8, endsAt: -1 },
];

const EDGE_MARGIN = 12;
const SNAP_TRANSITION = "all 200ms cubic-bezier(0.25, 1, 0.5, 1)";
const DRAG_THRESHOLD = 5;
const BUTTON_W = 140;
const BUTTON_H = 48;
const SIDEBAR_WIDTH = 256;
const ROLE_SWITCHER_CLEARANCE = 56;

type EdgeY = "top" | "center" | "bottom";
type EdgeX = "left" | "center" | "right";
type Edge = `${EdgeY}-${EdgeX}`;

function snapToEdge(
  x: number,
  y: number,
): { x: number; y: number; edge: Edge } {
  const hasSidebar = window.innerWidth >= 1024;
  const leftEdge = hasSidebar ? SIDEBAR_WIDTH + EDGE_MARGIN : EDGE_MARGIN;
  const rightEdge = window.innerWidth - BUTTON_W - EDGE_MARGIN;
  const contentMidX = hasSidebar
    ? (SIDEBAR_WIDTH + window.innerWidth) / 2
    : window.innerWidth / 2;
  const centerX = contentMidX - BUTTON_W / 2;
  const centerY = window.innerHeight / 2 - BUTTON_H / 2;

  const thirdX = (window.innerWidth - (hasSidebar ? SIDEBAR_WIDTH : 0)) / 3;
  const offsetX = x - (hasSidebar ? SIDEBAR_WIDTH : 0);
  const edgeX: EdgeX =
    offsetX < thirdX ? "left" : offsetX < thirdX * 2 ? "center" : "right";

  const thirdY = window.innerHeight / 3;
  const edgeY: EdgeY =
    y < thirdY ? "top" : y < thirdY * 2 ? "center" : "bottom";

  const snapX =
    edgeX === "left" ? leftEdge : edgeX === "center" ? centerX : rightEdge;
  const snapY =
    edgeY === "top"
      ? EDGE_MARGIN
      : edgeY === "center"
        ? centerY
        : window.innerHeight - BUTTON_H - EDGE_MARGIN - ROLE_SWITCHER_CLEARANCE;

  return { x: snapX, y: snapY, edge: `${edgeY}-${edgeX}` };
}

function defaultPosition() {
  return {
    x: window.innerWidth - BUTTON_W - EDGE_MARGIN,
    y:
      window.innerHeight -
      BUTTON_H -
      EDGE_MARGIN -
      ROLE_SWITCHER_CLEARANCE,
  };
}

interface DebugStageSwitcherProps {
  hackathonId: string;
  currentStatus: HackathonStatus;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export function DebugStageSwitcher({
  hackathonId,
  currentStatus,
  registrationOpensAt,
  registrationClosesAt,
  startsAt,
  endsAt,
}: DebugStageSwitcherProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [edge, setEdge] = useState<Edge>("bottom-right");
  const [isSnapping, setIsSnapping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  positionRef.current = position;
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("devtools-state");
    if (saved) {
      sessionStorage.removeItem("devtools-state");
      const s = JSON.parse(saved);
      setPosition(s.position ?? defaultPosition());
      setEdge(s.edge ?? "bottom-right");
      setExpanded(true);
      setShowMore(s.showMore ?? false);
    } else {
      setPosition(defaultPosition());
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSnapping) {
      const timer = setTimeout(() => setIsSnapping(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isSnapping]);

  useEffect(() => {
    function handleResize() {
      const snapped = snapToEdge(
        positionRef.current.x + BUTTON_W / 2,
        positionRef.current.y + BUTTON_H / 2,
      );
      setPosition({ x: snapped.x, y: snapped.y });
      setEdge(snapped.edge);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && expanded) setExpanded(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (!expanded) return;
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return;
      setExpanded(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [expanded]);

  const timelineState = getTimelineState({
    status: currentStatus,
    registration_opens_at: registrationOpensAt,
    registration_closes_at: registrationClosesAt,
    starts_at: startsAt,
    ends_at: endsAt,
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function devAction(path: string, method = "POST", body?: unknown) {
    const key = path + method;
    if (pending) return;
    setPending(key);
    try {
      const res = await fetch(`/api/dev/hackathons/${hackathonId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      sessionStorage.setItem(
        "devtools-state",
        JSON.stringify({
          position: positionRef.current,
          edge,
          showMore,
        }),
      );
      window.location.reload();
      return data;
    } catch {
      showToast("Action failed");
    } finally {
      setPending(null);
    }
  }

  async function switchStatus(status: HackathonStatus) {
    await devAction("/status", "PATCH", { status });
    showToast(`Status → ${status}`);
  }

  async function switchPhase(phase: HackathonPhase | null) {
    await devAction("/phase", "PATCH", { phase });
    showToast(`Phase → ${phase ?? "none"}`);
  }

  async function setTimeline(preset: (typeof TIMELINE_PRESETS)[number]) {
    const now = Date.now();
    await devAction("/timeline", "PATCH", {
      startsAt: new Date(now + preset.startsAt * 3600000).toISOString(),
      endsAt: new Date(now + preset.endsAt * 3600000).toISOString(),
      registrationOpensAt: new Date(now - 7 * 86400000).toISOString(),
      registrationClosesAt: new Date(
        now + preset.startsAt * 3600000,
      ).toISOString(),
    });
    showToast("Timeline updated");
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, [role=button]")) return;
      isDragging.current = true;
      hasMoved.current = false;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsSnapping(false);
    },
    [position],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (
      !hasMoved.current &&
      Math.abs(dx) < DRAG_THRESHOLD &&
      Math.abs(dy) < DRAG_THRESHOLD
    )
      return;
    hasMoved.current = true;
    const newX = Math.max(
      0,
      Math.min(dragStart.current.posX + dx, window.innerWidth - BUTTON_W),
    );
    const newY = Math.max(
      0,
      Math.min(dragStart.current.posY + dy, window.innerHeight - BUTTON_H),
    );
    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    const wasDragging = hasMoved.current;
    isDragging.current = false;
    hasMoved.current = false;

    if (wasDragging) {
      const centerX = position.x + BUTTON_W / 2;
      const centerY = position.y + BUTTON_H / 2;
      const snapped = snapToEdge(centerX, centerY);
      setIsSnapping(true);
      setPosition({ x: snapped.x, y: snapped.y });
      setEdge(snapped.edge);
    } else if (!expanded) {
      setExpanded(true);
    }
  }, [position, expanded]);

  if (!mounted) return null;

  const isLoading = !!pending;
  const [edgeY, edgeX] = edge.split("-") as [EdgeY, EdgeX];

  const panelOrigin = cn(
    edgeX === "right"
      ? "origin-right"
      : edgeX === "center"
        ? "origin-center"
        : "origin-left",
    edgeY === "bottom"
      ? "origin-bottom"
      : edgeY === "center"
        ? "origin-center"
        : "origin-top",
  );

  return (
    <div
      className={cn(
        "fixed z-9999 select-none",
        !expanded && "cursor-grab active:cursor-grabbing",
      )}
      style={{
        left: position.x,
        top: position.y,
        transition: isSnapping ? SNAP_TRANSITION : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {expanded ? (
        <div
          ref={panelRef}
          className={cn(
            "rounded-lg border border-dashed bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150 w-[480px] max-h-[80vh] overflow-y-auto",
            panelOrigin,
          )}
          style={{
            transform:
              [
                edgeX === "right"
                  ? `translateX(calc(-100% + ${BUTTON_W}px))`
                  : edgeX === "center"
                    ? `translateX(calc(-50% + ${BUTTON_W / 2}px))`
                    : "",
                edgeY === "bottom" || edgeY === "center"
                  ? `translateY(calc(-100% - ${EDGE_MARGIN}px))`
                  : `translateY(${BUTTON_H + EDGE_MARGIN}px)`,
              ]
                .filter(Boolean)
                .join(" ") || undefined,
          }}
        >
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Dev Tools</span>
                <Badge variant={timelineState.variant} className="text-xs">
                  {timelineState.label}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0"
                onClick={() => setExpanded(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>

            {toast && (
              <div className="rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                {toast}
              </div>
            )}

            <Section label="Status">
              <div className="flex flex-wrap gap-1.5">
                {ALL_STAGES.map(({ status, label }) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === currentStatus ? "default" : "outline"}
                    disabled={isLoading}
                    onClick={() => switchStatus(status)}
                    className="h-7 text-xs"
                  >
                    {pending === `/status PATCH` &&
                      status === currentStatus && (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      )}
                    {label}
                  </Button>
                ))}
              </div>
            </Section>

            <Section label="Phase">
              <div className="flex flex-wrap gap-1.5">
                {ALL_PHASES.map(({ phase, label }) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => switchPhase(phase)}
                    className="h-7 text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Section>

            <Section label="Timeline">
              <div className="flex flex-wrap gap-1.5">
                {TIMELINE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setTimeline(preset)}
                    className="h-7 text-xs"
                  >
                    <Clock className="size-3 mr-1" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </Section>

            <Section label="Seed Data">
              <div className="grid grid-cols-2 gap-1.5">
                <SeedButton
                  icon={<Zap className="size-3" />}
                  label="Seed Everything"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-all");
                    showToast("Full seed done!");
                  }}
                />
                <SeedButton
                  icon={<Users className="size-3" />}
                  label="5 Teams"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-teams", "POST", { count: 5 });
                    showToast("Teams seeded");
                  }}
                />
                <SeedButton
                  icon={<FileText className="size-3" />}
                  label="Submissions"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-submissions");
                    showToast("Submissions seeded");
                  }}
                />
                <SeedButton
                  icon={<DoorOpen className="size-3" />}
                  label="3 Rooms + Assign"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-rooms", "POST", {
                      count: 3,
                      assignTeams: true,
                    });
                    showToast("Rooms seeded");
                  }}
                />
                <SeedButton
                  icon={<Gavel className="size-3" />}
                  label="Judging Setup"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-judging");
                    showToast("Judging seeded");
                  }}
                />
                <SeedButton
                  icon={<Trophy className="size-3" />}
                  label="Score 60%"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-scores", "POST", {
                      percentage: 60,
                    });
                    showToast("Scores added");
                  }}
                />
                <SeedButton
                  icon={<MessageCircle className="size-3" />}
                  label="Mentor Requests"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-mentors");
                    showToast("Mentors seeded");
                  }}
                />
                <SeedButton
                  icon={<FileText className="size-3" />}
                  label="Release Challenge"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-challenge");
                    showToast("Challenge released");
                  }}
                />
                <SeedButton
                  icon={<Award className="size-3" />}
                  label="3 Prizes"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-prizes");
                    showToast("Prizes seeded");
                  }}
                />
                <SeedButton
                  icon={<Tags className="size-3" />}
                  label="3 Categories"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-categories");
                    showToast("Categories seeded");
                  }}
                />
                <SeedButton
                  icon={<Share2 className="size-3" />}
                  label="Social Posts"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-social");
                    showToast("Social posts seeded");
                  }}
                />
                <SeedButton
                  icon={<Trophy className="size-3" />}
                  label="Score 100%"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/seed-scores", "POST", {
                      percentage: 100,
                    });
                    showToast("All scored");
                  }}
                />
                <SeedButton
                  icon={<Calculator className="size-3" />}
                  label="Calc Results"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/calculate-results");
                    showToast("Results calculated");
                  }}
                />
                <SeedButton
                  icon={<Send className="size-3" />}
                  label="Publish Results"
                  loading={isLoading}
                  onClick={async () => {
                    await devAction("/publish-results");
                    showToast("Results published");
                  }}
                />
              </div>
            </Section>

            <button
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              {showMore ? "Less" : "More"}
            </button>

            {showMore && (
              <Section label="Danger Zone">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isLoading}
                  onClick={async () => {
                    await devAction("/seed-data", "DELETE");
                    showToast("Seed data cleared");
                  }}
                  className="h-7 text-xs"
                >
                  <Trash2 className="size-3 mr-1" />
                  Clear All Seed Data
                </Button>
              </Section>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={buttonRef}
          className={cn(
            "flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground transition-all duration-150",
            isHovered && "scale-105",
          )}
          style={{
            boxShadow: isHovered
              ? "0 8px 32px color-mix(in oklch, var(--primary) 50%, transparent)"
              : "0 4px 20px color-mix(in oklch, var(--primary) 35%, transparent)",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FlaskConical
            className={cn(
              "size-5 shrink-0 transition-transform duration-150",
              isHovered && "rotate-12",
            )}
          />
          <span className="text-sm font-semibold whitespace-nowrap">
            Dev Tools
          </span>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      {children}
    </div>
  );
}

function SeedButton({
  icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={onClick}
      className="h-8 text-xs justify-start"
    >
      {icon}
      <span className="ml-1.5">{label}</span>
    </Button>
  );
}
