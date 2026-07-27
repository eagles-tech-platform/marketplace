import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { ReactNode } from "react";

// NOTE: This is a compatibility shim. The old backend (Hono + tRPC + Drizzle/MySQL,
// tightly coupled to Kimi's auth) has been replaced by /backend (Express + MongoDB).
// Auth-related pages (Login, Signup, useAuth) now call the new REST API directly
// via src/lib/api.ts. Pages still using `trpc.*.useQuery(...)` below (Services,
// Bookings, Chat, Cart, Admin panels, etc.) have NOT been migrated yet — there is
// no tRPC server running, so those calls will fail/hang until real REST routes and
// matching frontend calls are built for them. See WORK_IN_PROGRESS.md for the plan.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>() as any;

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
