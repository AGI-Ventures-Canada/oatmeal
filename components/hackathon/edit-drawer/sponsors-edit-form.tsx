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
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { useEdit } from "@/components/hackathon/preview/edit-context";
import { Badge } from "@/components/ui/badge";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Trash2,
  Plus,
  Building2,
  Loader2,
  Undo2,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
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

interface OrgSearchResult {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  logoUrlDark: string | null;
  websiteUrl: string | null;
  isSaved?: boolean;
}

type LogoVariant = "light" | "dark";

type PendingChange =
  | {
      type: "add";
      sponsor: SponsorWithTenant;
      tempId: string;
      logoFile?: File;
      logoPreviewUrl?: string;
      logoDarkFile?: File;
      logoDarkPreviewUrl?: string;
    }
  | { type: "delete"; sponsorId: string; originalSponsor: SponsorWithTenant }
  | {
      type: "tier";
      sponsorId: string;
      newTier: SponsorTier;
      oldTier: SponsorTier;
    }
  | {
      type: "logo";
      sponsorId: string;
      variant: LogoVariant;
      file: File;
      previewUrl: string;
      oldUrl: string | null;
    }
  | {
      type: "link";
      sponsorId: string;
      sponsorTenantId: string;
      tenant: SponsorWithTenant["tenant"];
      websiteUrl: string | null;
      useOrgAssets: boolean;
    }
  | {
      type: "source";
      sponsorId: string;
      useOrgAssets: boolean;
      oldUseOrgAssets: boolean;
    };

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
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const tempIdCounter = useRef(0);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSponsors = useMemo(() => {
    let sponsors = [...initialSponsors];

    for (const change of pendingChanges) {
      if (change.type === "add") {
        const sponsorWithPreview = {
          ...change.sponsor,
          ...(change.logoPreviewUrl && { logo_url: change.logoPreviewUrl }),
          ...(change.logoDarkPreviewUrl && {
            logo_url_dark: change.logoDarkPreviewUrl,
          }),
        };
        sponsors.push(sponsorWithPreview);
      } else if (change.type === "delete") {
        sponsors = sponsors.filter((s) => s.id !== change.sponsorId);
      } else if (change.type === "tier") {
        sponsors = sponsors.map((s) =>
          s.id === change.sponsorId ? { ...s, tier: change.newTier } : s,
        );
      } else if (change.type === "logo") {
        sponsors = sponsors.map((s) =>
          s.id === change.sponsorId
            ? {
                ...s,
                ...(change.variant === "light"
                  ? { logo_url: change.previewUrl }
                  : { logo_url_dark: change.previewUrl }),
              }
            : s,
        );
      } else if (change.type === "link") {
        sponsors = sponsors.map((s) =>
          s.id === change.sponsorId
            ? {
                ...s,
                sponsor_tenant_id: change.sponsorTenantId,
                tenant: change.tenant,
                website_url: change.websiteUrl,
                use_org_assets: change.useOrgAssets,
              }
            : s,
        );
      } else if (change.type === "source") {
        sponsors = sponsors.map((s) =>
          s.id === change.sponsorId
            ? {
                ...s,
                use_org_assets: change.useOrgAssets,
              }
            : s,
        );
      }
    }

    return sponsors;
  }, [initialSponsors, pendingChanges]);

  const excludeIdsString = useMemo(
    () =>
      currentSponsors
        .map((s) => s.sponsor_tenant_id)
        .filter((id): id is string => id !== null)
        .join(","),
    [currentSponsors],
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

  const hasChanges = pendingChanges.length > 0;

  useEffect(() => {
    if (!hasChanges || saving) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveChanges().then((ok) => {
        if (ok) {
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }
      });
    }, 500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChanges]);

  function handleAddOrg(org: OrgSearchResult) {
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
      display_order: currentSponsors.length,
      created_at: new Date().toISOString(),
      tenant: org.isSaved ? null : {
        slug: org.slug,
        name: org.name,
        logo_url: org.logoUrl,
        logo_url_dark: org.logoUrlDark,
      },
    };

    setPendingChanges([
      ...pendingChanges,
      { type: "add", sponsor: newSponsor, tempId },
    ]);
    setQuery("");
  }

  function handleAddManual() {
    if (!query.trim()) return;

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
      display_order: currentSponsors.length,
      created_at: new Date().toISOString(),
    };

    setPendingChanges([
      ...pendingChanges,
      { type: "add", sponsor: newSponsor, tempId },
    ]);
    setQuery("");
  }

  function handleLinkOrg(sponsorId: string, org: OrgSearchResult) {
    if (org.isSaved) return;

    const tenant = {
      slug: org.slug,
      name: org.name,
      logo_url: org.logoUrl,
      logo_url_dark: org.logoUrlDark,
    };

    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === sponsorId,
    ) as Extract<PendingChange, { type: "add" }> | undefined;

    if (addChange) {
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange
            ? {
                ...c,
                sponsor: {
                  ...c.sponsor,
                  sponsor_tenant_id: org.id,
                  tenant,
                  website_url: org.websiteUrl ?? c.sponsor.website_url,
                  use_org_assets: c.sponsor.use_org_assets,
                },
              }
            : c,
        ),
      );
      linkSearch.setQuery("");
      setLinkingSponsorId(null);
      return;
    }

    const existingLinkChangeIndex = pendingChanges.findIndex(
      (c) => c.type === "link" && c.sponsorId === sponsorId,
    );

    if (existingLinkChangeIndex >= 0) {
      const updated = [...pendingChanges];
      updated[existingLinkChangeIndex] = {
        type: "link",
        sponsorId,
        sponsorTenantId: org.id,
        tenant,
        websiteUrl: org.websiteUrl,
        useOrgAssets: false,
      };
      setPendingChanges(updated);
      linkSearch.setQuery("");
      setLinkingSponsorId(null);
      return;
    }

    setPendingChanges([
      ...pendingChanges,
      {
        type: "link",
        sponsorId,
        sponsorTenantId: org.id,
        tenant,
        websiteUrl: org.websiteUrl,
        useOrgAssets: false,
      },
    ]);
    linkSearch.setQuery("");
    setLinkingSponsorId(null);
  }

  function handleUpdateAssetSource(sponsorId: string, nextUseOrgAssets: boolean) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === sponsorId,
    ) as Extract<PendingChange, { type: "add" }> | undefined;

    if (addChange) {
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange
            ? {
                ...c,
                sponsor: { ...c.sponsor, use_org_assets: nextUseOrgAssets },
              }
            : c,
        ),
      );
      return;
    }

    const linkChangeIndex = pendingChanges.findIndex(
      (c) => c.type === "link" && c.sponsorId === sponsorId,
    );

    if (linkChangeIndex >= 0) {
      const updated = [...pendingChanges];
      const linkChange = updated[linkChangeIndex] as Extract<
        PendingChange,
        { type: "link" }
      >;
      updated[linkChangeIndex] = { ...linkChange, useOrgAssets: nextUseOrgAssets };
      setPendingChanges(updated);
      return;
    }

    const existingSourceChangeIndex = pendingChanges.findIndex(
      (c) => c.type === "source" && c.sponsorId === sponsorId,
    );

    if (existingSourceChangeIndex >= 0) {
      const existingChange = pendingChanges[existingSourceChangeIndex] as Extract<
        PendingChange,
        { type: "source" }
      >;

      if (existingChange.oldUseOrgAssets === nextUseOrgAssets) {
        setPendingChanges(
          pendingChanges.filter((_, i) => i !== existingSourceChangeIndex),
        );
      } else {
        const updated = [...pendingChanges];
        updated[existingSourceChangeIndex] = {
          ...existingChange,
          useOrgAssets: nextUseOrgAssets,
        };
        setPendingChanges(updated);
      }
      return;
    }

    const currentSponsor = initialSponsors.find((s) => s.id === sponsorId);
    if (!currentSponsor || currentSponsor.use_org_assets === nextUseOrgAssets) {
      return;
    }

    setPendingChanges([
      ...pendingChanges,
      {
        type: "source",
        sponsorId,
        useOrgAssets: nextUseOrgAssets,
        oldUseOrgAssets: currentSponsor.use_org_assets,
      },
    ]);
  }

  function handleUpdateTier(sponsorId: string, newTier: SponsorTier) {
    const existingTierChangeIndex = pendingChanges.findIndex(
      (c) => c.type === "tier" && c.sponsorId === sponsorId,
    );

    if (existingTierChangeIndex >= 0) {
      const existingChange = pendingChanges[existingTierChangeIndex] as Extract<
        PendingChange,
        { type: "tier" }
      >;
      if (existingChange.oldTier === newTier) {
        setPendingChanges(
          pendingChanges.filter((_, i) => i !== existingTierChangeIndex),
        );
      } else {
        const updated = [...pendingChanges];
        updated[existingTierChangeIndex] = { ...existingChange, newTier };
        setPendingChanges(updated);
      }
      return;
    }

    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === sponsorId,
    ) as Extract<PendingChange, { type: "add" }> | undefined;

    if (addChange) {
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange
            ? { ...c, sponsor: { ...c.sponsor, tier: newTier } }
            : c,
        ),
      );
      return;
    }

    const currentSponsor = initialSponsors.find((s) => s.id === sponsorId);
    if (!currentSponsor || currentSponsor.tier === newTier) return;

    setPendingChanges([
      ...pendingChanges,
      {
        type: "tier",
        sponsorId,
        newTier,
        oldTier: currentSponsor.tier,
      },
    ]);
  }

  function handleDeleteSponsor(sponsorId: string) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === sponsorId,
    );

    if (addChange) {
      setPendingChanges(pendingChanges.filter((c) => c !== addChange));
      return;
    }

    const originalSponsor = initialSponsors.find((s) => s.id === sponsorId);
    if (!originalSponsor) return;

    const filtered = pendingChanges.filter(
      (c) =>
        !(
          (c.type === "tier" ||
            c.type === "logo" ||
            c.type === "link" ||
            c.type === "source") &&
          c.sponsorId === sponsorId
        ),
    );
    setPendingChanges([
      ...filtered,
      { type: "delete", sponsorId, originalSponsor },
    ]);
  }

  function handleLogoSelected(
    sponsorId: string,
    file: File,
    variant: LogoVariant,
  ) {
    const previewUrl = URL.createObjectURL(file);

    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === sponsorId,
    ) as Extract<PendingChange, { type: "add" }> | undefined;

    if (addChange) {
      if (variant === "light") {
        if (addChange.logoPreviewUrl) {
          URL.revokeObjectURL(addChange.logoPreviewUrl);
        }
        setPendingChanges(
          pendingChanges.map((c) =>
            c === addChange
              ? { ...c, logoFile: file, logoPreviewUrl: previewUrl }
              : c,
          ),
        );
      } else {
        if (addChange.logoDarkPreviewUrl) {
          URL.revokeObjectURL(addChange.logoDarkPreviewUrl);
        }
        setPendingChanges(
          pendingChanges.map((c) =>
            c === addChange
              ? { ...c, logoDarkFile: file, logoDarkPreviewUrl: previewUrl }
              : c,
          ),
        );
      }
      return;
    }

    const existingLogoChange = pendingChanges.find(
      (c) =>
        c.type === "logo" &&
        c.sponsorId === sponsorId &&
        c.variant === variant,
    ) as Extract<PendingChange, { type: "logo" }> | undefined;

    if (existingLogoChange) {
      URL.revokeObjectURL(existingLogoChange.previewUrl);
      setPendingChanges(
        pendingChanges.map((c) =>
          c === existingLogoChange ? { ...c, file, previewUrl } : c,
        ),
      );
      return;
    }

    const currentSponsor = initialSponsors.find((s) => s.id === sponsorId);
    if (!currentSponsor) return;

    setPendingChanges([
      ...pendingChanges,
      {
        type: "logo",
        sponsorId,
        variant,
        file,
        previewUrl,
        oldUrl:
          variant === "light"
            ? currentSponsor.logo_url
            : currentSponsor.logo_url_dark,
      },
    ]);
  }

  function handleUndo(index: number) {
    const change = pendingChanges[index];
    if (change.type === "add") {
      if (change.logoPreviewUrl) URL.revokeObjectURL(change.logoPreviewUrl);
      if (change.logoDarkPreviewUrl)
        URL.revokeObjectURL(change.logoDarkPreviewUrl);
    }
    if (change.type === "logo") {
      URL.revokeObjectURL(change.previewUrl);
    }
    setPendingChanges(pendingChanges.filter((_, i) => i !== index));
  }

  function handleUndoAll() {
    for (const change of pendingChanges) {
      if (change.type === "add") {
        if (change.logoPreviewUrl) URL.revokeObjectURL(change.logoPreviewUrl);
        if (change.logoDarkPreviewUrl)
          URL.revokeObjectURL(change.logoDarkPreviewUrl);
      }
      if (change.type === "logo") {
        URL.revokeObjectURL(change.previewUrl);
      }
    }
    setPendingChanges([]);
    linkSearch.setQuery("");
    setLinkingSponsorId(null);
  }

  async function saveChanges() {
    if (!hasChanges) return true;

    if (isLocalMode) {
      const sponsorsData = currentSponsors.map((s) => ({
        name: s.name,
        tier: s.tier === "none" ? null : s.tier,
      }));
      const ok = await onSave!({ sponsors: sponsorsData });
      if (ok) {
        setPendingChanges([]);
      }
      return ok;
    }

    setSaving(true);
    setError(null);

    try {
      for (const change of pendingChanges) {
        if (change.type === "add") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: change.sponsor.name,
                tier: change.sponsor.tier,
                logoUrl: change.sponsor.sponsor_tenant_id
                  ? change.sponsor.logo_url
                  : null,
                websiteUrl: change.sponsor.website_url,
                sponsorTenantId: change.sponsor.sponsor_tenant_id,
                useOrgAssets: change.sponsor.use_org_assets,
              }),
            },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(
              data.error || `Failed to add ${change.sponsor.name}`,
            );
          }

          if (change.logoFile || change.logoDarkFile) {
            const sponsorData = await res.json();

            if (change.logoFile) {
              const formData = new FormData();
              formData.append("file", change.logoFile);
              formData.append("variant", "light");

              const logoRes = await fetch(
                `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorData.id}/logo`,
                { method: "POST", body: formData },
              );
              if (!logoRes.ok) {
                const logoData = await logoRes.json();
                throw new Error(
                  logoData.error ||
                    `Failed to upload light logo for ${change.sponsor.name}`,
                );
              }
            }

            if (change.logoDarkFile) {
              const formData = new FormData();
              formData.append("file", change.logoDarkFile);
              formData.append("variant", "dark");

              const logoRes = await fetch(
                `/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorData.id}/logo`,
                { method: "POST", body: formData },
              );
              if (!logoRes.ok) {
                const logoData = await logoRes.json();
                throw new Error(
                  logoData.error ||
                    `Failed to upload dark logo for ${change.sponsor.name}`,
                );
              }
            }
          }
        } else if (change.type === "delete") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`,
            {
              method: "DELETE",
            },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to remove sponsor");
          }
        } else if (change.type === "tier") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tier: change.newTier }),
            },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update tier");
          }
        } else if (change.type === "logo") {
          const formData = new FormData();
          formData.append("file", change.file);
          formData.append("variant", change.variant);

          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}/logo`,
            { method: "POST", body: formData },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(
              data.error || `Failed to upload ${change.variant} logo`,
            );
          }
        } else if (change.type === "link") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sponsorTenantId: change.sponsorTenantId,
                websiteUrl: change.websiteUrl,
                useOrgAssets: change.useOrgAssets,
              }),
            },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to link sponsor");
          }
        } else if (change.type === "source") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                useOrgAssets: change.useOrgAssets,
              }),
            },
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update asset source");
          }
        }
      }

      for (const change of pendingChanges) {
        if (change.type === "add") {
          if (change.logoPreviewUrl) URL.revokeObjectURL(change.logoPreviewUrl);
          if (change.logoDarkPreviewUrl)
            URL.revokeObjectURL(change.logoDarkPreviewUrl);
        }
        if (change.type === "logo") {
          URL.revokeObjectURL(change.previewUrl);
        }
      }

      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!hasChanges) {
      closeDrawer();
      return;
    }

    const ok = await saveChanges();
    if (ok) closeDrawer();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && !saving) {
        handleAddManual();
      } else if (!saving) {
        if (onSaveAndNext) {
          onSaveAndNext();
        } else {
          closeDrawer();
        }
      }
    }
  }

  const showResults = query.length >= 2;
  const showAddManually = showResults && searched && !loading;

  function isPending(sponsorId: string) {
    return (
      sponsorId.startsWith("temp-") ||
      pendingChanges.some(
        (c) =>
          (c.type === "delete" && c.sponsorId === sponsorId) ||
          (c.type === "tier" && c.sponsorId === sponsorId) ||
          (c.type === "logo" && c.sponsorId === sponsorId) ||
          (c.type === "link" && c.sponsorId === sponsorId) ||
          (c.type === "source" && c.sponsorId === sponsorId),
      )
    );
  }

  function isDeleted(sponsorId: string) {
    return pendingChanges.some(
      (c) => c.type === "delete" && c.sponsorId === sponsorId,
    );
  }

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
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {loading && (
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

      {currentSponsors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Sponsors ({currentSponsors.length})
            </h4>
          </div>
          <div className="space-y-2">
            {currentSponsors.map((sponsor) => {
              const pending = isPending(sponsor.id);
              const deleted = isDeleted(sponsor.id);
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
                  className={`rounded-lg border p-3 space-y-3 ${
                    pending ? "border-dashed bg-muted/30" : ""
                  } ${deleted ? "opacity-50" : ""}`}
                >
                  {!isLocalMode && (useOrgAssets ? (
                    <div className="flex gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Sun className="size-2.5" />
                          <span>Light</span>
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
                          <span>Dark</span>
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
                          <span>Light</span>
                        </div>
                        <SponsorLogoUpload
                          logoUrl={sponsor.logo_url}
                          hackathonId={hackathonId}
                          sponsorId={sponsor.id}
                          variant="light"
                          onFileSelected={(file) =>
                            handleLogoSelected(sponsor.id, file, "light")
                          }
                          onUploaded={() => router.refresh()}
                          disabled={deleted}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Moon className="size-2.5" />
                          <span>Dark</span>
                        </div>
                        <SponsorLogoUpload
                          logoUrl={sponsor.logo_url_dark}
                          hackathonId={hackathonId}
                          sponsorId={sponsor.id}
                          variant="dark"
                          onFileSelected={(file) =>
                            handleLogoSelected(sponsor.id, file, "dark")
                          }
                          onUploaded={() => router.refresh()}
                          disabled={deleted}
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
                    {!isLocalMode && !isLinked && !deleted && (
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
                        Link to org
                      </Button>
                    )}
                  </div>
                  {!isLocalMode && linkingSponsorId === sponsor.id && !deleted && (
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
                        disabled={deleted}
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
                    <Select
                      value={sponsor.tier}
                      onValueChange={(v) =>
                        handleUpdateTier(sponsor.id, v as SponsorTier)
                      }
                      disabled={deleted}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="none">No Tier</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                      disabled={deleted}
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
        <div className="flex gap-2">
          {hasChanges ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleUndoAll();
                closeDrawer();
              }}
            >
              Discard
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Done
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>{" "}
              save & next
            </span>
          </div>
          {saving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </p>
          )}
          {showSaved && (
            <p className="text-xs text-muted-foreground animate-in fade-in">Saved</p>
          )}
        </div>
      </div>
    </div>
  );
}
