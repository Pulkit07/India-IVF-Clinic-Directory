import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import type { RateObservation, Service } from "@workspace/api-client-react";
import { AdminGate } from "@/components/admin-gate";
import {
  Button,
  EmptyBlock,
  Eyebrow,
  LoadingBlock,
} from "@/components/directory";
import { Shell } from "@/components/site-shell";
import {
  getGetAdminSummaryQueryKey,
  getListAdminClinicsQueryKey,
  getListAuditEventsQueryKey,
  getListRateObservationsQueryKey,
  getListServicesQueryKey,
  getListSourcesQueryKey,
  useArchiveClinic,
  useCreateClinic,
  useCreateService,
  useCreateSource,
  useGetAdminSummary,
  useListAdminClinics,
  useListAuditEvents,
  useListRateObservations,
  useListServices,
  useListSources,
  usePreviewImport,
  usePublishClinic,
  usePublishRateObservation,
  useUnpublishRateObservation,
  useUpdateClinic,
} from "@/lib/directory-hooks";

export default function Admin() {
  return (
    <AdminGate>
      <AdminDesk />
    </AdminGate>
  );
}

function AdminDesk() {
  const qc = useQueryClient();
  const summary = useGetAdminSummary({
    query: { queryKey: getGetAdminSummaryQueryKey() },
  });
  const clinics = useListAdminClinics({
    query: { queryKey: getListAdminClinicsQueryKey() },
  });
  const services = useListServices({
    query: { queryKey: getListServicesQueryKey() },
  });
  const sources = useListSources({
    query: { queryKey: getListSourcesQueryKey() },
  });
  const observations = useListRateObservations({
    query: { queryKey: getListRateObservationsQueryKey() },
  });
  const audits = useListAuditEvents({
    query: { queryKey: getListAuditEventsQueryKey() },
  });
  const createClinic = useCreateClinic();
  const updateClinic = useUpdateClinic();
  const archiveClinic = useArchiveClinic();
  const publishClinic = usePublishClinic();
  const createService = useCreateService();
  const createSource = useCreateSource();
  const publishObservation = usePublishRateObservation();
  const unpublishObservation = useUnpublishRateObservation();
  const previewImport = usePreviewImport();
  const [tab, setTab] = useState("overview");
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [clinicForm, setClinicForm] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    address: "",
    regulator: "",
    licensingStatus: "",
    phone: "",
    email: "",
    website: "",
  });
  const [serviceName, setServiceName] = useState("");
  const [sourceForm, setSourceForm] = useState({
    title: "",
    sourceType: "Registry",
    url: "",
    publisher: "",
    publishedOn: "",
    notes: "",
  });
  const [csvText, setCsvText] = useState("");
  const saveClinic = (event: React.FormEvent) => {
    event.preventDefault();
    const data = {
      ...clinicForm,
      address: clinicForm.address || null,
      regulator: clinicForm.regulator || null,
      licensingStatus: clinicForm.licensingStatus || null,
      phone: clinicForm.phone || null,
      email: clinicForm.email || null,
      website: clinicForm.website || null,
    };
    const onSuccess = () => {
      setShowClinicForm(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: getListAdminClinicsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    };
    editing
      ? updateClinic.mutate({ id: editing.id, data }, { onSuccess })
      : createClinic.mutate({ data }, { onSuccess });
  };
  const addService = () => {
    if (!serviceName.trim()) return;
    createService.mutate(
      {
        data: {
          name: serviceName,
          slug: serviceName.toLowerCase().trim().replaceAll(/\s+/g, "-"),
          description: null,
        },
      },
      {
        onSuccess: () => {
          setServiceName("");
          qc.invalidateQueries({ queryKey: getListServicesQueryKey() });
        },
      },
    );
  };
  const addSource = (event: React.FormEvent) => {
    event.preventDefault();
    createSource.mutate(
      {
        data: {
          ...sourceForm,
          publisher: sourceForm.publisher || null,
          publishedOn: sourceForm.publishedOn || null,
          notes: sourceForm.notes || null,
        },
      },
      {
        onSuccess: () => {
          setSourceForm({
            title: "",
            sourceType: "Registry",
            url: "",
            publisher: "",
            publishedOn: "",
            notes: "",
          });
          qc.invalidateQueries({ queryKey: getListSourcesQueryKey() });
        },
      },
    );
  };
  const isBusy = summary.isLoading || clinics.isLoading;
  return (
    <Shell>
      <div className="admin-shell">
        <div className="shell-inner admin-head">
          <div>
            <Eyebrow>Protected workspace</Eyebrow>
            <h1>Directory desk</h1>
            <p>Review records, publish carefully, keep an audit trail.</p>
          </div>
          <div className="admin-lock">
            <ShieldCheck size={17} />
            Editor surface
          </div>
        </div>
        <div className="shell-inner admin-tabs" role="tablist">
          {[
            "overview",
            "clinics",
            "observations",
            "sources",
            "import",
            "audit",
          ].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={tab === item ? "active" : ""}
              role="tab"
              data-testid={`tab-admin-${item}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="shell-inner admin-content">
          {[
            createClinic,
            updateClinic,
            archiveClinic,
            publishClinic,
            createService,
            createSource,
            publishObservation,
            unpublishObservation,
          ].some((mutation) => mutation.isError) && (
            <p role="alert" className="form-error">
              The change could not be saved. Check the fields, duplicate names
              or URLs, and your administrator access.
            </p>
          )}
          {isBusy ? (
            <LoadingBlock lines={5} />
          ) : summary.isError ? (
            <div className="state-card">
              <p className="eyebrow">Workspace unavailable</p>
              <h2>We could not load the editor workspace.</h2>
              <p>
                Try refreshing the page or signing in again. If this continues,
                check your administrator access and Firestore rules.
              </p>
              <Link href="/about" className="text-link">
                Read the project scope <ArrowRight size={15} />
              </Link>
            </div>
          ) : tab === "overview" ? (
            <>
              <div className="metric-grid">
                <div>
                  <span>Clinic records</span>
                  <strong>{summary.data?.clinicCount ?? 0}</strong>
                  <small>All statuses</small>
                </div>
                <div>
                  <span>Published observations</span>
                  <strong>
                    {summary.data?.publishedObservationCount ?? 0}
                  </strong>
                  <small>Visible publicly</small>
                </div>
                <div>
                  <span>Draft observations</span>
                  <strong>{summary.data?.draftObservationCount ?? 0}</strong>
                  <small>Awaiting review</small>
                </div>
                <div>
                  <span>Corrections pending</span>
                  <strong>{summary.data?.pendingCorrectionCount ?? 0}</strong>
                  <small>Need attention</small>
                </div>
              </div>
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <Eyebrow>Recent activity</Eyebrow>
                    <h2>Audit trail</h2>
                  </div>
                  <button
                    className="text-link-button"
                    onClick={() => setTab("audit")}
                    data-testid="button-view-audit"
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>
                {summary.data?.recentAuditEvents?.length ? (
                  summary.data.recentAuditEvents.slice(0, 6).map((event) => (
                    <div className="audit-row" key={event.id}>
                      <span className="audit-action">{event.action}</span>
                      <span>
                        {event.entityType} · {event.entityId}
                      </span>
                      <time>
                        {new Date(event.createdAt).toLocaleDateString("en-IN")}
                      </time>
                    </div>
                  ))
                ) : (
                  <EmptyBlock
                    title="No recent activity."
                    body="Changes will appear here as records move through review."
                  />
                )}
              </section>
            </>
          ) : tab === "clinics" ? (
            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <Eyebrow>Records workflow</Eyebrow>
                  <h2>Clinics</h2>
                </div>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setClinicForm({
                      name: "",
                      slug: "",
                      city: "",
                      state: "",
                      address: "",
                      regulator: "",
                      licensingStatus: "",
                      phone: "",
                      email: "",
                      website: "",
                    });
                    setShowClinicForm(true);
                  }}
                  data-testid="button-add-clinic"
                >
                  <Plus size={16} /> Add clinic
                </Button>
              </div>
              {showClinicForm && (
                <form className="admin-form" onSubmit={saveClinic}>
                  <div className="form-grid">
                    {(
                      [
                        "name",
                        "slug",
                        "city",
                        "state",
                        "address",
                        "regulator",
                        "licensingStatus",
                        "phone",
                        "email",
                        "website",
                      ] as const
                    ).map((field) => (
                      <label className="field-label" key={field}>
                        {field}
                        <input
                          required={["name", "slug", "city", "state"].includes(
                            field,
                          )}
                          value={clinicForm[field]}
                          onChange={(e) =>
                            setClinicForm({
                              ...clinicForm,
                              [field]: e.target.value,
                            })
                          }
                          data-testid={`input-admin-clinic-${field}`}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="form-actions">
                    <Button
                      type="submit"
                      disabled={
                        createClinic.isPending || updateClinic.isPending
                      }
                      data-testid="button-save-clinic"
                    >
                      {editing ? "Save changes" : "Create draft"}
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => setShowClinicForm(false)}
                      data-testid="button-cancel-clinic"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              {clinics.data?.map((clinic: any) => (
                <div className="admin-record-row" key={clinic.id}>
                  <div>
                    <strong>{clinic.name}</strong>
                    <span>
                      {clinic.city}, {clinic.state} · {clinic.recordStatus}
                    </span>
                  </div>
                  <div className="row-actions">
                    {clinic.recordStatus !== "published" && (
                      <button
                        className="icon-text-button"
                        disabled={publishClinic.isPending}
                        onClick={() => publishClinic.mutate({ id: clinic.id })}
                      >
                        Publish clinic
                      </button>
                    )}
                    <button
                      className="icon-text-button"
                      onClick={() => {
                        setEditing(clinic);
                        setClinicForm({
                          name: clinic.name,
                          slug: clinic.slug,
                          city: clinic.city,
                          state: clinic.state,
                          address: clinic.address || "",
                          regulator: clinic.regulator || "",
                          licensingStatus: clinic.licensingStatus || "",
                          phone: clinic.phone || "",
                          email: clinic.email || "",
                          website: clinic.website || "",
                        });
                        setShowClinicForm(true);
                      }}
                      data-testid={`button-edit-clinic-${clinic.id}`}
                    >
                      Edit
                    </button>
                    <button
                      className="icon-text-button danger-text"
                      onClick={() => {
                        if (window.confirm("Archive this clinic record?"))
                          archiveClinic.mutate(
                            { id: clinic.id },
                            {
                              onSuccess: () => {
                                qc.invalidateQueries({
                                  queryKey: getListAdminClinicsQueryKey(),
                                });
                                qc.invalidateQueries({
                                  queryKey: getGetAdminSummaryQueryKey(),
                                });
                              },
                            },
                          );
                      }}
                      data-testid={`button-archive-clinic-${clinic.id}`}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : tab === "observations" ? (
            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <Eyebrow>Rate records</Eyebrow>
                  <h2>Observation queue</h2>
                </div>
                <span className="panel-count">
                  {observations.data?.length || 0} records
                </span>
              </div>
              {observations.data?.map((observation: RateObservation) => (
                <div className="admin-record-row" key={observation.id}>
                  <div>
                    <strong>
                      {observation.outcomeType} · {observation.yearLabel}
                    </strong>
                    <span>
                      {observation.outcomeDefinition} ·{" "}
                      {observation.publicationStatus}
                    </span>
                  </div>
                  <div className="row-actions">
                    {observation.publicationStatus === "published" ? (
                      <button
                        className="icon-text-button"
                        onClick={() =>
                          unpublishObservation.mutate(
                            { id: observation.id },
                            {
                              onSuccess: () =>
                                qc.invalidateQueries({
                                  queryKey: getListRateObservationsQueryKey(),
                                }),
                            },
                          )
                        }
                        data-testid={`button-unpublish-${observation.id}`}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        className="icon-text-button"
                        onClick={() =>
                          publishObservation.mutate(
                            { id: observation.id },
                            {
                              onSuccess: () => {
                                qc.invalidateQueries({
                                  queryKey: getListRateObservationsQueryKey(),
                                });
                                qc.invalidateQueries({
                                  queryKey: getGetAdminSummaryQueryKey(),
                                });
                              },
                            },
                          )
                        }
                        data-testid={`button-publish-${observation.id}`}
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ) : tab === "sources" ? (
            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <Eyebrow>Evidence library</Eyebrow>
                  <h2>Sources and services</h2>
                </div>
              </div>
              <form className="admin-form" onSubmit={addSource}>
                <div className="form-grid">
                  {(
                    [
                      "title",
                      "sourceType",
                      "url",
                      "publisher",
                      "publishedOn",
                    ] as const
                  ).map((field) => (
                    <label className="field-label" key={field}>
                      {field}
                      <input
                        required={["title", "sourceType", "url"].includes(
                          field,
                        )}
                        value={sourceForm[field]}
                        onChange={(e) =>
                          setSourceForm({
                            ...sourceForm,
                            [field]: e.target.value,
                          })
                        }
                        data-testid={`input-admin-source-${field}`}
                      />
                    </label>
                  ))}
                </div>
                <label className="field-label">
                  notes
                  <textarea
                    value={sourceForm.notes}
                    onChange={(e) =>
                      setSourceForm({ ...sourceForm, notes: e.target.value })
                    }
                    data-testid="textarea-admin-source-notes"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={createSource.isPending}
                  data-testid="button-create-source"
                >
                  <Plus size={16} /> Add source
                </Button>
              </form>
              <div className="admin-subsection">
                <p className="eyebrow">Services</p>
                <div className="service-add">
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="New service name"
                    data-testid="input-admin-service-name"
                  />
                  <Button
                    onClick={addService}
                    disabled={createService.isPending}
                    data-testid="button-create-service"
                  >
                    Add
                  </Button>
                </div>
                {services.data?.map((service: Service) => (
                  <div className="small-record" key={service.id}>
                    <span>{service.name}</span>
                    <code>{service.slug}</code>
                  </div>
                ))}
              </div>
              <div className="admin-subsection">
                <p className="eyebrow">Sources</p>
                {sources.data?.map((source: any) => (
                  <div className="small-record" key={source.id}>
                    <span>{source.title}</span>
                    <code>{source.sourceType}</code>
                  </div>
                ))}
              </div>
            </section>
          ) : tab === "import" ? (
            <ImportPanel
              csvText={csvText}
              setCsvText={setCsvText}
              previewImport={previewImport}
            />
          ) : (
            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <Eyebrow>Immutable history</Eyebrow>
                  <h2>Audit events</h2>
                </div>
              </div>
              {audits.data?.map((event) => (
                <div className="audit-row" key={event.id}>
                  <span className="audit-action">{event.action}</span>
                  <span>
                    {event.entityType} · {event.entityId}
                  </span>
                  <time>
                    {new Date(event.createdAt).toLocaleString("en-IN")}
                  </time>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}

function ImportPanel({
  csvText,
  setCsvText,
  previewImport,
}: {
  csvText: string;
  setCsvText: (value: string) => void;
  previewImport: ReturnType<typeof usePreviewImport>;
}) {
  const [preview, setPreview] = useState<any>(null);
  const runPreview = () =>
    previewImport.mutate(
      { data: { csvText, mapping: {} } },
      { onSuccess: setPreview },
    );
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <Eyebrow>Validation only</Eyebrow>
          <h2>Preview a CSV import</h2>
        </div>
      </div>
      <p className="panel-copy">
        Paste CSV text to validate rows before anything is written. This step
        does not create records.
      </p>
      <textarea
        className="csv-input"
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder="clinic_name,city,state&#10;Example Clinic,Delhi,Delhi"
        data-testid="textarea-import-csv"
      />
      <Button
        onClick={runPreview}
        disabled={!csvText.trim() || previewImport.isPending}
        data-testid="button-preview-import"
      >
        {previewImport.isPending ? "Checking…" : "Check rows"}{" "}
        <ArrowRight size={16} />
      </Button>
      {preview && (
        <div className="import-result">
          <div>
            <strong>{preview.validRows}</strong>
            <span>valid rows</span>
          </div>
          <div>
            <strong>{preview.invalidRows}</strong>
            <span>invalid rows</span>
          </div>
          <div>
            <strong>{preview.duplicateRows}</strong>
            <span>duplicates</span>
          </div>
          {preview.errors?.length > 0 && (
            <div className="import-errors">
              {preview.errors.map((error: any) => (
                <p key={`${error.rowNumber}-${error.field}`}>
                  Row {error.rowNumber} · {error.field}: {error.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
