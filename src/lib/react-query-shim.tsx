import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type QueryKey = readonly unknown[] | string | undefined;
type InvalidateFilters = {
  queryKey?: QueryKey;
};

type QueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
};

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables) => void | Promise<void>;
};

const normalizeKey = (key?: QueryKey) => {
  if (Array.isArray(key)) return key;
  if (typeof key === "undefined") return [];
  return [key];
};

const serializeKey = (key?: QueryKey) => JSON.stringify(normalizeKey(key));

const isPrefixMatch = (queryKey: unknown[], partialKey: unknown[]) => {
  if (partialKey.length === 0) return true;
  if (partialKey.length > queryKey.length) return false;

  return partialKey.every((segment, index) => {
    return JSON.stringify(segment) === JSON.stringify(queryKey[index]);
  });
};

export class QueryClient {
  private listeners = new Set<(filters?: InvalidateFilters) => void>();

  subscribe(listener: (filters?: InvalidateFilters) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async invalidateQueries(filters: InvalidateFilters = {}) {
    this.listeners.forEach((listener) => listener(filters));
  }
}

const defaultQueryClient = new QueryClient();

const QueryClientContext = createContext<QueryClient>(defaultQueryClient);

export const QueryClientProvider = ({
  client,
  children,
}: {
  client: QueryClient;
  children: React.ReactNode;
}) => {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
};

export const useQueryClient = () => useContext(QueryClientContext);

export function useQuery<TData>({ queryKey, queryFn, enabled = true }: QueryOptions<TData>) {
  const queryClient = useQueryClient();
  const keyParts = useMemo(() => normalizeKey(queryKey), [serializeKey(queryKey)]);
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const runQuery = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      return result;
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, queryFn, serializeKey(queryKey)]);

  useEffect(() => {
    runQuery().catch(() => undefined);
  }, [runQuery]);

  useEffect(() => {
    return queryClient.subscribe((filters) => {
      const filterKey = normalizeKey(filters?.queryKey);
      if (isPrefixMatch(keyParts, filterKey)) {
        runQuery().catch(() => undefined);
      }
    });
  }, [keyParts, queryClient, runQuery]);

  return {
    data,
    isLoading,
    error,
    refetch: runQuery,
  };
}

export function useMutation<TData = unknown, TVariables = void>({
  mutationFn,
  onSuccess,
  onError,
}: MutationOptions<TData, TVariables>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        if (onSuccess) {
          await onSuccess(result, variables);
        }
        return result;
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        if (onError) {
          await onError(normalizedError, variables);
        }
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onError, onSuccess]
  );

  return {
    mutate,
    isPending,
    error,
  };
}
