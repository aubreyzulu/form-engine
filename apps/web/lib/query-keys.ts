export const formsKeys = {
  all: ['forms'] as const,
  list: () => [...formsKeys.all, 'list'] as const,
  detail: (key: string) => [...formsKeys.all, 'detail', key] as const,
  latest: (key: string) => [...formsKeys.detail(key), 'latest'] as const,
  versions: (key: string) => [...formsKeys.detail(key), 'versions'] as const,
  version: (key: string, version: number) => [...formsKeys.versions(key), version] as const,
  published: (key: string) => [...formsKeys.all, 'published', key] as const,
};

export const submissionsKeys = {
  byForm: (key: string) => ['submissions', 'form', key] as const,
};
