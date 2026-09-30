import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getFirebase, getFirebaseDb } from "./firebase";
import { createDirectoryStore, previewImport } from "./directory-store";
import type {
  ClinicInput,
  ClinicUpdate,
  ServiceInput,
  SourceInput,
  RateObservationInput,
  CorrectionInput,
  ListClinicsParams,
  ImportPreviewInput,
} from "@workspace/api-client-react";
let publicStore: Promise<ReturnType<typeof createDirectoryStore>> | undefined;
async function store() {
  return (publicStore ??= getFirebaseDb().then((db) =>
    createDirectoryStore(db, () => undefined),
  ));
}
async function authenticatedStore() {
  const { db, auth } = await getFirebase();
  return createDirectoryStore(db, () => auth.currentUser?.uid);
}
type Options<T> = { query?: Partial<UseQueryOptions<T>> };
const root = ["firestore-directory"] as const;
export const getListAdminClinicsQueryKey = () =>
  [...root, "listAdminClinics"] as const;
export function useListAdminClinics(
  options?: Options<
    Awaited<
      ReturnType<ReturnType<typeof createDirectoryStore>["listAdminClinics"]>
    >
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListAdminClinicsQueryKey(),
    queryFn: async () => (await store()).listAdminClinics(),
    staleTime: 30_000,
  });
}
export const getListLocationsQueryKey = () =>
  [...root, "listLocations"] as const;
export function useListLocations(
  options?: Options<
    Awaited<
      ReturnType<ReturnType<typeof createDirectoryStore>["listLocations"]>
    >
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListLocationsQueryKey(),
    queryFn: async () => (await store()).listLocations(),
    staleTime: 30_000,
  });
}
export const getListServicesQueryKey = () => [...root, "listServices"] as const;
export function useListServices(
  options?: Options<
    Awaited<ReturnType<ReturnType<typeof createDirectoryStore>["listServices"]>>
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListServicesQueryKey(),
    queryFn: async () => (await store()).listServices(),
    staleTime: 30_000,
  });
}
export const getListSourcesQueryKey = () => [...root, "listSources"] as const;
export function useListSources(
  options?: Options<
    Awaited<ReturnType<ReturnType<typeof createDirectoryStore>["listSources"]>>
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListSourcesQueryKey(),
    queryFn: async () => (await store()).listSources(),
    staleTime: 30_000,
  });
}
export const getListRateObservationsQueryKey = () =>
  [...root, "listRateObservations"] as const;
export function useListRateObservations(
  options?: Options<
    Awaited<
      ReturnType<
        ReturnType<typeof createDirectoryStore>["listRateObservations"]
      >
    >
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListRateObservationsQueryKey(),
    queryFn: async () => (await store()).listRateObservations(),
    staleTime: 30_000,
  });
}
export const getListAuditEventsQueryKey = () =>
  [...root, "listAuditEvents"] as const;
export function useListAuditEvents(
  options?: Options<
    Awaited<
      ReturnType<ReturnType<typeof createDirectoryStore>["listAuditEvents"]>
    >
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListAuditEventsQueryKey(),
    queryFn: async () => (await store()).listAuditEvents(),
    staleTime: 30_000,
  });
}
export const getGetAdminSummaryQueryKey = () =>
  [...root, "getAdminSummary"] as const;
export function useGetAdminSummary(
  options?: Options<
    Awaited<
      ReturnType<ReturnType<typeof createDirectoryStore>["getAdminSummary"]>
    >
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getGetAdminSummaryQueryKey(),
    queryFn: async () => (await store()).getAdminSummary(),
    staleTime: 30_000,
  });
}
export const getListClinicsQueryKey = (params?: ListClinicsParams) =>
  [...root, "listClinics", params ?? {}] as const;
export function useListClinics(
  params?: ListClinicsParams,
  options?: Options<
    Awaited<ReturnType<ReturnType<typeof createDirectoryStore>["listClinics"]>>
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getListClinicsQueryKey(params),
    queryFn: async () => (await store()).listClinics(params),
    staleTime: 30_000,
  });
}
export const getGetClinicQueryKey = (slug: string) =>
  [...root, "getClinic", slug] as const;
export function useGetClinic(
  slug: string,
  options?: Options<
    Awaited<ReturnType<ReturnType<typeof createDirectoryStore>["getClinic"]>>
  >,
) {
  return useQuery({
    ...options?.query,
    queryKey: getGetClinicQueryKey(slug),
    queryFn: async () => (await store()).getClinic(slug),
    staleTime: 30_000,
  });
}
function useDirectoryMutation<T, R>(
  action: (
    input: T,
    directory: ReturnType<typeof createDirectoryStore>,
  ) => Promise<R>,
) {
  const cache = useQueryClient();
  return useMutation<R, Error, T>({
    mutationFn: async (input) => action(input, await authenticatedStore()),
    onSuccess: () => cache.invalidateQueries({ queryKey: root }),
  });
}
export function useCreateClinic() {
  return useDirectoryMutation(
    async ({ data }: { data: ClinicInput }, directory) =>
      directory.createClinic(data),
  );
}
export function useCreateService() {
  return useDirectoryMutation(
    async ({ data }: { data: ServiceInput }, directory) =>
      directory.createService(data),
  );
}
export function useCreateSource() {
  return useDirectoryMutation(
    async ({ data }: { data: SourceInput }, directory) =>
      directory.createSource(data),
  );
}
export function useCreateRateObservation() {
  return useDirectoryMutation(
    async ({ data }: { data: RateObservationInput }, directory) =>
      directory.createRateObservation(data),
  );
}
export function useSubmitCorrection() {
  return useDirectoryMutation(
    async ({ data }: { data: CorrectionInput }, directory) =>
      directory.submitCorrection(data),
  );
}
export function useUpdateClinic() {
  return useDirectoryMutation(
    async ({ id, data }: { id: string; data: ClinicUpdate }, directory) =>
      directory.updateClinic(id, data),
  );
}
export function useArchiveClinic() {
  return useDirectoryMutation(async ({ id }: { id: string }, directory) =>
    directory.archiveClinic(id),
  );
}
export function usePublishClinic() {
  return useDirectoryMutation(async ({ id }: { id: string }, directory) =>
    directory.publishClinic(id),
  );
}
export function usePublishRateObservation() {
  return useDirectoryMutation(async ({ id }: { id: string }, directory) =>
    directory.publishRateObservation(id),
  );
}
export function useUnpublishRateObservation() {
  return useDirectoryMutation(async ({ id }: { id: string }, directory) =>
    directory.unpublishRateObservation(id),
  );
}
export function usePreviewImport() {
  return useMutation({
    mutationFn: ({ data }: { data: ImportPreviewInput }) => previewImport(data),
  });
}
