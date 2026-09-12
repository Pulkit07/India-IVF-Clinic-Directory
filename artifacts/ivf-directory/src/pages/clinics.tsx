import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { Clinic, Location } from "@workspace/api-client-react";
import {
  ClinicCard,
  Disclaimer,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageIntro,
  cityFor,
} from "@/components/directory";
import { Shell } from "@/components/site-shell";
import { getListClinicsQueryKey, useListClinics } from "@/lib/directory-hooks";

export default function Clinics() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined"
      ? window.location.search
      : location.split("?")[1] || "",
  );
  const [search, setSearch] = useState(params.get("q") || "");
  const [filters, setFilters] = useState({
    city: params.get("city") || "",
    location: params.get("location") || "",
  });
  const apiParams = useMemo(
    () => ({ q: search || undefined, location: filters.location || undefined }),
    [search, filters.location],
  );
  const result = useListClinics(apiParams, {
    query: { queryKey: getListClinicsQueryKey(apiParams) },
  });
  const data = result.data;
  const cities = [
    ...new Set((data?.availableLocations || []).map(cityFor)),
  ].sort();
  const localities = (data?.availableLocations || []).filter(
    (item) => !filters.city || cityFor(item) === filters.city,
  );
  const visibleClinics = (data?.items || []).filter(
    (clinic) => !filters.city || cityFor(clinic) === filters.city,
  );
  const update = (key: keyof typeof filters, value: string) => {
    const next = { ...filters, [key]: value };
    if (key === "city") next.location = "";
    setFilters(next);
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("q", search);
    Object.entries(next).forEach(([k, v]) => v && nextParams.set(k, v));
    setLocation(`/clinics${nextParams.toString() ? `?${nextParams}` : ""}`);
  };
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    Object.entries(filters).forEach(([k, v]) => v && next.set(k, v));
    setLocation(`/clinics${next.toString() ? `?${next}` : ""}`);
  };
  return (
    <Shell>
      <PageIntro
        eyebrow="Public directory"
        title="Find a clinic with context."
        description="Search published clinic records and read each observation on its own terms. There is no overall ranking here."
      />
      <div className="shell-inner directory-layout">
        <aside className="filter-panel">
          <div className="filter-header">
            <span className="eyebrow">Refine results</span>
          </div>
          <label className="field-label">
            City
            <select
              value={filters.city}
              onChange={(e) => update("city", e.target.value)}
              data-testid="select-filter-city"
            >
              <option value="">All cities</option>
              {cities.map((city) => (
                <option value={city} key={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Location
            <select
              value={filters.location}
              onChange={(e) => update("location", e.target.value)}
              data-testid="select-filter-location"
            >
              <option value="">All locations</option>
              {localities.map((item: Location) => (
                <option value={item.slug} key={item.slug}>
                  {item.city}
                </option>
              ))}
            </select>
          </label>
          <button
            className="clear-filters"
            onClick={() => {
              setFilters({ city: "", location: "" });
              setLocation(
                search
                  ? `/clinics?q=${encodeURIComponent(search)}`
                  : "/clinics",
              );
            }}
            data-testid="button-clear-filters"
          >
            Clear filters
          </button>
        </aside>
        <div className="directory-results">
          <div className="directory-toolbar">
            <form className="directory-search" onSubmit={submitSearch}>
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Clinic, city or location"
                aria-label="Search directory"
                data-testid="input-directory-search"
              />
              <button type="submit" data-testid="button-directory-search">
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
          <div className="results-meta">
            <span data-testid="text-results-count">
              {data
                ? `${visibleClinics.length} ${visibleClinics.length === 1 ? "clinic" : "clinics"}`
                : "Clinics"}
            </span>
            {Object.values(filters).some(Boolean) && (
              <span className="active-filter-note">
                Filtered results{" "}
                <button
                  onClick={() => {
                    setFilters({ city: "", location: "" });
                    setLocation("/clinics");
                  }}
                  data-testid="button-reset-active-filter"
                >
                  Reset
                </button>
              </span>
            )}
          </div>
          {result.isLoading ? (
            <LoadingBlock lines={5} />
          ) : result.isError ? (
            <ErrorBlock retry={() => result.refetch()} />
          ) : visibleClinics.length ? (
            <div className="clinic-list">
              {visibleClinics.map((clinic: Clinic) => (
                <ClinicCard clinic={clinic} key={clinic.id} />
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="No clinics match those filters."
              body="Try another city or location."
            />
          )}
        </div>
      </div>
      <div className="shell-inner directory-disclaimer">
        <Disclaimer compact />
      </div>
    </Shell>
  );
}
