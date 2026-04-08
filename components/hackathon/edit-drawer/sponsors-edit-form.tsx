"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { useEdit } from "@/components/hackathon/preview/edit-context";
import { Badge } from "@/components/ui/badge";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Trash2,
  Plus,
  Building2,
  Loader2,
  ExternalLink,
  Sun,
  Moon,
  Crown,
  Trophy,
  Medal,
  Award,
  Circle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { SponsorLogoUpload } from "./sponsor-logo-upload";
import type {
  HackathonSponsor,
  SponsorTier,
  TenantProfile,
} from "@/lib/db/hackathon-types";

type SponsorWithTenant = HackathonSponsor & {
  tenant?: Pick<
    TenantProfile,
    "slug" | "name" | "logo_url" | "logo_url_dark"
  > | null;
};

interface SponsorsEditFormProps {
  hackathonId: string;
  initialSponsors: SponsorWithTenant[];
  onSaveAndNext?: () => void;
  onSave?: (data: { sponsors: { name: string; tier: string | null }[] }) => Promise<boolean>;
}

const TIER_OPTIONS: {
  key: SponsorTier;
  label: string;
  description: string;
  icon: typeof Crown;
  preview: { w: string; h: string };
}[] = [
  {
    key: "title",
    label: "Title",
    description: "Primary event sponsor featured most prominently",
    icon: Crown,
    preview: { w: "w-20", h: "h-10" },
  },
  {
    key: "gold",
    label: "Gold",
    description: "Major sponsor with large logo placement",
    icon: Trophy,
    preview: { w: "w-20", h: "h-10" },
  },
  {
    key: "silver",
    label: "Silver",
    description: "Supporting sponsor with medium logo placement",
    icon: Medal,
    preview: { w: "w-16", h: "h-8" },
  },
  {
    key: "bronze",
    label: "Bronze",
    description: "Contributing sponsor with standard logo placement",
    icon: Award,
    preview: { w: "w-12", h: "h-6" },
  },
  {
    key: "none",
    label: "No Tier",
    description: "Listed among sponsors without tier distinction",
    icon: Circle,
    preview: { w: "w-16", h: "h-8" },
  },
];

const TIER_LABEL: Record<SponsorTier, string> = {
  title: "Title",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  none: "No Tier",
};

function TierPicker({
  value,
  onSelect,
  showTitle,
}: {
  value: SponsorTier;
  onSelect: (tier: SponsorTier) => void;
  showTitle: boolean;
}) {
  const [open, setOpen] = useState(false);

  const options = showTitle
    ? TIER_OPTIONS
    : TIER_OPTIONS.filter((t) => t.key !== "title");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border px-2.5 h-8 text-xs hover:bg-muted/50 transition-colors"
        >
          {TIER_LABEL[value]}
          <ChevronsUpDown className="size-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-1.5 gap-0">
        {options.map((tier) => {
          const Icon = tier.icon;
          const isSelected = value === tier.key;
          const isDisabledTitle = tier.key === "title" && showTitle;
          return (
            <HoverCard key={tier.key} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  disabled={isDisabledTitle}
                  onClick={() => {
                    if (!isDisabledTitle) {
                      onSelect(tier.key);
                      setOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{tier.label}</span>
                  {isSelected && <Check className="size-3.5 shrink-0" />}
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="left" align="center" sideOffset={12} className="w-56 p-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{tier.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{tier.description}</p>
                  <div className="flex items-end justify-center pt-1 pb-0.5">
                    <div className={`${tier.preview.w} ${tier.preview.h} rounded border border-dashed bg-muted/30 flex items-center justify-center`}>
                      <span className="text-[8px] text-muted-foreground select-none">Logo</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Relative logo size on event page</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

interface OrgSearchResult {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  logoUrlDark: string | null;
  websiteUrl: string | null;
  isSaved?: boolean;
}

function useOrgSearch(excludeIdsString: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrgSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const excludeParam = excludeIdsString
          ? `&exclude=${excludeIdsString}`
          : "";
        const res = await fetch(
          `/api/dashboard/organizations/search?q=${encodeURIComponent(query)}${excludeParam}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.organizations);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, excludeIdsString]);

  return { query, setQuery, results, loading, searched };
}

export function SponsorsEditForm({
  hackathonId,
  initialSponsors,
  onSaveAndNext,
  onSave,
}: SponsorsEditFormProps) {
  const isLocalMode = !!onSave;
  const router = useRouter();
  const { closeDrawer } = useEdit();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, Partial<SponsorWithTenant>>
  >(new Map());
  const savingCount = useRef(0);
  const tempIdCounter = useRef(0);

  const [localSponsors, setLocalSponsors] = useState<SponsorWithTenant[]>(
    isLocalMode ? initialSponsors : [],
  );

  useEffect(() => {
    setHiddenIds(new Set());
    setOptimisticUpdates(new Map());
  }, [initialSponsors]);

  const visibleSponsors = useMemo(() => {
    const sponsors = isLocalMode ? localSponsors : initialSponsors;
    return sponsors
      .filter((s) => !hiddenIds.has(s.id))
      .map((s) => {
        const override = optimisticUpdates.get(s.id);
        return override ? { ...s, ...override } : s;
      });
  }, [isLocalMode, localSponsors, initialSponsors, hiddenIds, optimisticUpdates]);

  const excludeIdsString = useMemo(
    () =>
      visibleSponsors
        .map((s) => s.sponsor_tenant_id)
        .filter((id): id is string => id !== null)
        .join(","),
    [visibleSponsors],
  );

  const orgSearch = useOrgSearch(isLocalMode ? "" : excludeIdsString);
  const linkSearch = useOrgSearch(isLocalMode ? "" : excludeIdsString);
  const [localQuery, setLocalQuery] = useState("");
  const [linkingSponsorId, setLinkingSponsorId] = useState<string | null>(null);

  const query = isLocalMode ? localQuery : orgSearch.query;
  const setQuery = isLocalMode ? setLocalQuery : orgSearch.setQuery;
  const results = isLocalMode ? [] : orgSearch.results;
  const loading = isLocalMode ? false : orgSearch.loading;
  const searched = isLocalMode ? true : orgSearch.searched;
  const linkResults = isLocalMode
    ? []
    : linkSearch.results.filter((org) => !org.isSaved);
  const linkLoading = isLocalMode ? false : linkSearch.loading;
  const linkSearched = isLocalMode ? true : linkSearch.searched;

  function saveLocalSponsors(sponsors: SponsorWithTenant[]) {
    const sponsorsData = sponsors.map((s) => ({
      name: s.name,
      tier: s.tier === "none" ? null : s.tier,
    }));
    onSave?.({ sponsors: sponsorsData });
  }

  async function handleAddOrg(org: OrgSearchResult) {
    if (isLocalMode) {
      const tempId = `temp-${++tempIdCounter.current}`;
      const newSponsor: SponsorWithTenant = {
        id: tempId,
        hackathon_id: hackathonId,
        sponsor_tenant_id: org.isSaved ? null : org.id,
        tenant_sponsor_id: null,
        use_org_assets: !org.isSaved,
        name: org.name,
        logo_url: org.logoUrl,
        logo_url_dark: org.logoUrlDark,
        website_url: org.websiteUrl,
        tier: "none",
        display_order: localSponsors.length,
        created_at: new Date().toISOString(),
        tenant: org.isSaved
          ? null
          : {
              slug: org.slug,
              name: org.name,
              logo_url: org.logoUrl,
              logo_url_dark: org.logoUrlDark,
            },
      };
      const updated = [...localSponsors, newSponsor];
      setLocalSponsors(updated);
      saveLocalSponsors(updated);
      setQuery("");
      return;
    }

    setAdding(true);
    setError(null);
    savingCount.current++;
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: org.name,
            tier: "none",
            logoUrl: org.isSaved ? null : org.logoUrl,
            websiteUrl: org.websiteUrl,
            sponsorTenantId: org.isSaved ? null : org.id,
            useOrgAssets: !org.isSaved,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to add ${org.name}`);
      }
      setQuery("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sponsor");
    } finally {
      setAdding(false);
      savingCount.current--;
    }
  }

  async function handleAddManual() {
    if (!query.trim()) return;

    if (isLocalMode) {
      const tempId = `temp-${++tempIdCounter.current}`;
      const newSponsor: SponsorWithTenant = {
        id: tempId,
        hackathon_id: hackathonId,
        sponsor_tenant_id: null,
        tenant_sponsor_id: null,
        use_org_assets: false,
        name: query.trim(),
        logo_url: null,
        logo_url_dark: null,
        website_url: null,
        tier: "none",
        display_order: localSponsors.length,
        created_at: new Date().toISOString(),
      };
      const updated = [...localSponsors, newSponsor];
      setLocalSponsors(updated);
      saveLocalSponsors(updated);
      setQuery("");
      return;
    }

    setAdding(true);
    setError(null);
    savingCount.current++;
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: query.trim(),
            tier: "none",
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add sponsor");
      }
      setQuery("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sponsor");
    } finally {
      setAdding(false);
      savingCount.current--;
    }
  }

  async function handleDeleteSponsor(sponsorId: string) {
    if (isLocalMode) {
      const updated = localSponsors.filter((s) => s.id !== sponsorId);
      setLocalSponsors(updated);
      saveLocalSponsors(updated);
      return;
    }

    setHiddenIds((prev) => new Set(prev).add(sponsorId));
    setError(null);
    savingCount.current++;
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove sponsor");
      }
      router.refresh();
    } catch (err) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(sponsorId);
        return next;
      });
      setError(
        err instanceof Error ? err.message : "Failed to remove sponsor",
      );
    } finally {
      savingCount.current--;
    }
  }

  async function handleUpdateTier(sponsorId: string, newTier: SponsorTier) {
    if (isLocalMode) {
      const updated = localSponsors.map((s) =>
        s.id === sponsorId ? { ...s, tier: newTier } : s,
      );
      setLocalSponsors(updated);
      saveLocalSponsors(updated);
      return;
    }

    setOptimisticUpdates((prev) => new Map(prev).set(sponsorId, { ...prev.get(sponsorId), tier: newTier }));
    setError(null);
    savingCount.current++;
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: newTier }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update tier");
      }
      router.refresh();
    } catch (err) {
      setOptimisticUpdates((prev) => {
        const next = new Map(prev);
        const existing = next.get(sponsorId);
        if (existing) {
          const { tier: _, ...rest } = existing;
          if (Object.keys(rest).length > 0) { next.set(sponsorId, rest as Partial<SponsorWithTenant>); } else { next.delete(sponsorId); }
        }
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to update tier");
    } finally {
      savingCount.current--;
    }
  }

  async function handleLinkOrg(sponsorId: string, org: OrgSearchResult) {
    if (org.isSaved) return;

    linkSearch.setQuery("");
    setLinkingSponsorId(null);
    setOptimisticUpdates((prev) =>
      new Map(prev).set(sponsorId, {
        ...prev.get(sponsorId),
        sponsor_tenant_id: org.id,
        tenant: { slug: org.slug, name: org.name, logo_url: org.logoUrl, logo_url_dark: org.logoUrlDark },
        website_url: org.websiteUrl,
        use_org_assets: false,
      }),
    );
    setError(null);
    savingCount.current++;

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sponsorTenantId: org.id,
            websiteUrl: org.websiteUrl,
            useOrgAssets: false,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to link sponsor");
      }
      router.refresh();
    } catch (err) {
      setOptimisticUpdates((prev) => {
        const next = new Map(prev);
        const existing = next.get(sponsorId);
        if (existing) {
          const { sponsor_tenant_id: _, tenant: _t, website_url: _w, use_org_assets: _u, ...rest } = existing;
          if (Object.keys(rest).length > 0) { next.set(sponsorId, rest as Partial<SponsorWithTenant>); } else { next.delete(sponsorId); }
        }
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to link sponsor");
    } finally {
      savingCount.current--;
    }
  }

  async function handleUpdateAssetSource(
    sponsorId: string,
    nextUseOrgAssets: boolean,
  ) {
    if (isLocalMode) return;

    setOptimisticUpdates((prev) =>
      new Map(prev).set(sponsorId, { ...prev.get(sponsorId), use_org_assets: nextUseOrgAssets }),
    );
    setError(null);
    savingCount.current++;
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useOrgAssets: nextUseOrgAssets }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update asset source");
      }
      router.refresh();
    } catch (err) {
      setOptimisticUpdates((prev) => {
        const next = new Map(prev);
        const existing = next.get(sponsorId);
        if (existing) {
          const { use_org_assets: _, ...rest } = existing;
          if (Object.keys(rest).length > 0) { next.set(sponsorId, rest as Partial<SponsorWithTenant>); } else { next.delete(sponsorId); }
        }
        return next;
      });
      setError(
        err instanceof Error ? err.message : "Failed to update asset source",
      );
    } finally {
      savingCount.current--;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && !adding) {
        handleAddManual();
      } else if (onSaveAndNext) {
        onSaveAndNext();
      } else if (savingCount.current === 0) {
        closeDrawer();
      }
    }
  }

  const showResults = query.length >= 2;
  const showAddManually = showResults && searched && !loading;

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        <Field>
          <FieldLabel>Add Sponsor</FieldLabel>
          <div className="relative">
            <Input
              placeholder="Sponsor organization name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={adding}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {(loading || adding) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {showResults && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto mt-2">
              {results.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleAddOrg(org)}
                  disabled={adding}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {org.logoUrl ? (
                    <>
                      <OptimizedImage
                        src={org.logoUrl}
                        alt={org.name}
                        width={32}
                        height={32}
                        className="rounded-md dark:hidden"
                      />
                      <OptimizedImage
                        src={org.logoUrlDark || org.logoUrl}
                        alt={org.name}
                        width={32}
                        height={32}
                        className="rounded-md hidden dark:block"
                      />
                    </>
                  ) : (
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium truncate text-sm">{org.name}</p>
                      {org.isSaved && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Saved
                        </Badge>
                      )}
                    </div>
                    {org.slug && (
                      <p className="text-xs text-muted-foreground">
                        @{org.slug}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {showAddManually && (
                <button
                  type="button"
                  onClick={handleAddManual}
                  disabled={adding}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                    <Plus className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      Add &quot;{query}&quot; manually
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Not on the platform
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </Field>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </FieldGroup>

      {visibleSponsors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Sponsors ({visibleSponsors.length})
          </h4>
          <div className="space-y-2">
            {visibleSponsors.map((sponsor) => {
              const isLinked = !!sponsor.sponsor_tenant_id;
              const useOrgAssets = isLinked && sponsor.use_org_assets;
              const displayName =
                useOrgAssets && sponsor.tenant?.name
                  ? sponsor.tenant.name
                  : sponsor.name;
              const showLinkResults =
                linkingSponsorId === sponsor.id && linkSearch.query.length >= 2;

              return (
                <div
                  key={sponsor.id}
                  className="rounded-lg border p-3 space-y-3"
                >
                  {!isLocalMode && (useOrgAssets ? (
                    <div className="flex gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Sun className="size-2.5" />
                          <span>Light logo</span>
                        </div>
                        <div className="bg-[#f5f5f4] border border-[#e5e5e5] p-2 flex items-center justify-center h-14 w-28">
                          {sponsor.tenant?.logo_url ? (
                            <OptimizedImage
                              src={sponsor.tenant.logo_url}
                              alt={`${displayName} light logo`}
                              width={96}
                              height={40}
                              className="max-h-10 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              No org logo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Moon className="size-2.5" />
                          <span>Dark logo</span>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] p-2 flex items-center justify-center h-14 w-28">
                          {sponsor.tenant?.logo_url ? (
                            <OptimizedImage
                              src={
                                sponsor.tenant.logo_url_dark ||
                                sponsor.tenant.logo_url
                              }
                              alt={`${displayName} dark logo`}
                              width={96}
                              height={40}
                              className="max-h-10 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              No org logo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Sun className="size-2.5" />
                          <span>Light logo</span>
                        </div>
                        <SponsorLogoUpload
                          logoUrl={sponsor.logo_url}
                          hackathonId={hackathonId}
                          sponsorId={sponsor.id}
                          variant="light"
                          onUploaded={() => router.refresh()}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Moon className="size-2.5" />
                          <span>Dark logo</span>
                        </div>
                        <SponsorLogoUpload
                          logoUrl={sponsor.logo_url_dark}
                          hackathonId={hackathonId}
                          sponsorId={sponsor.id}
                          variant="dark"
                          onUploaded={() => router.refresh()}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    {useOrgAssets && sponsor.tenant?.slug ? (
                      <Link
                        href={`/o/${sponsor.tenant.slug}`}
                        className="font-medium text-sm hover:underline inline-flex items-center gap-1"
                        target="_blank"
                      >
                        {displayName}
                        <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                      </Link>
                    ) : (
                      <span className="font-medium text-sm">{displayName}</span>
                    )}
                    {isLinked && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Linked
                      </Badge>
                    )}
                    {!isLocalMode && !isLinked && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          linkSearch.setQuery("");
                          setLinkingSponsorId((current) =>
                            current === sponsor.id ? null : sponsor.id,
                          );
                        }}
                        className="h-7 text-xs"
                      >
                        Link to an existing org
                      </Button>
                    )}
                  </div>
                  {!isLocalMode && linkingSponsorId === sponsor.id && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          placeholder="Search organizations..."
                          value={linkSearch.query}
                          onChange={(e) => linkSearch.setQuery(e.target.value)}
                          autoFocus
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                        />
                        {linkLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
                        )}
                      </div>
                      {showLinkResults && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                          {linkResults.map((org) => (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => handleLinkOrg(sponsor.id, org)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                            >
                              {org.logoUrl ? (
                                <>
                                  <OptimizedImage
                                    src={org.logoUrl}
                                    alt={org.name}
                                    width={32}
                                    height={32}
                                    className="rounded-md dark:hidden"
                                  />
                                  <OptimizedImage
                                    src={org.logoUrlDark || org.logoUrl}
                                    alt={org.name}
                                    width={32}
                                    height={32}
                                    className="rounded-md hidden dark:block"
                                  />
                                </>
                              ) : (
                                <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                                  <Building2 className="size-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">
                                  {org.name}
                                </p>
                                {org.slug && (
                                  <p className="text-xs text-muted-foreground">
                                    @{org.slug}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                          {!linkLoading &&
                            linkSearched &&
                            linkResults.length === 0 && (
                              <div className="p-3 text-xs text-muted-foreground">
                                No matching organizations found.
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isLinked && (
                      <Select
                        value={useOrgAssets ? "org" : "manual"}
                        onValueChange={(value) =>
                          handleUpdateAssetSource(sponsor.id, value === "org")
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual assets</SelectItem>
                          <SelectItem value="org">Org assets</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <TierPicker
                      value={sponsor.tier}
                      onSelect={(tier) => handleUpdateTier(sponsor.id, tier)}
                      showTitle={sponsor.tier === "title"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Button type="button" variant="outline" onClick={() => { if (savingCount.current === 0) closeDrawer(); }}>
          Done
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </KbdGroup>{" "}
            {onSaveAndNext ? "next" : "done"}
          </span>
        </div>
      </div>
    </div>
  );
}
