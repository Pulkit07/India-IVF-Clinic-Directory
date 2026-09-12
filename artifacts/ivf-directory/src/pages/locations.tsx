import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Location } from "@workspace/api-client-react";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageIntro,
  cityFor,
} from "@/components/directory";
import { Shell } from "@/components/site-shell";
import {
  getListLocationsQueryKey,
  useListLocations,
} from "@/lib/directory-hooks";

export default function Locations() {
  const locations = useListLocations({
    query: { queryKey: getListLocationsQueryKey() },
  });
  const [city, setCity] = useState("");
  const cities = [...new Set((locations.data || []).map(cityFor))].sort();
  const localities = (locations.data || []).filter(
    (item) => !city || cityFor(item) === city,
  );
  return (
    <Shell>
      <PageIntro
        eyebrow="Browse by place"
        title="Find care by city and location."
        description="Choose a city to see the localities where clinics are listed."
      />
      <div className="shell-inner locations-page">
        <div className="location-city-filter">
          <label className="field-label">
            City
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              data-testid="select-locations-city"
            >
              <option value="">All cities</option>
              {cities.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {locations.isLoading ? (
          <LoadingBlock lines={4} />
        ) : locations.isError ? (
          <ErrorBlock retry={() => locations.refetch()} />
        ) : localities.length ? (
          <div className="location-directory">
            {localities.map((item: Location, index) => (
              <Link
                key={item.slug}
                href={`/clinics?city=${encodeURIComponent(cityFor(item))}&location=${item.slug}`}
                className="location-row"
                data-testid={`link-location-${item.slug}`}
              >
                <span className="location-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{item.city}</strong>
                  <small>
                    {cityFor(item)} · {item.state}
                  </small>
                </span>
                <span className="location-count">
                  {item.clinicCount}{" "}
                  {item.clinicCount === 1 ? "clinic" : "clinics"}
                </span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyBlock
            title="No locations found in this city."
            body="Choose another city to continue browsing."
          />
        )}
      </div>
    </Shell>
  );
}
