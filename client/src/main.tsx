import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Global error handler to catch all errors
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler] Uncaught error:', event.error);
  console.error('[Global Error Handler] Error message:', event.message);
  console.error('[Global Error Handler] Error filename:', event.filename);
  console.error('[Global Error Handler] Error lineno:', event.lineno);
  console.error('[Global Error Handler] Error colno:', event.colno);
  console.error('[Global Error Handler] Error stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Rejection Handler] Unhandled promise rejection:', event.reason);
  console.error('[Global Rejection Handler] Promise:', event.promise);
});

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        try {
          console.log('[tRPC] Fetch input:', typeof input === 'string' ? input.substring(0, 200) : input);
          console.log('[tRPC] Fetch init body:', init?.body ? String(init.body).substring(0, 500) : 'none');
          
          const response = await globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
          
          console.log('[tRPC] Fetch response status:', response.status);
          
          return response;
        } catch (error) {
          console.error('[tRPC] Fetch error:', error);
          console.error('[tRPC] Fetch error name:', error instanceof Error ? error.name : 'unknown');
          console.error('[tRPC] Fetch error message:', error instanceof Error ? error.message : String(error));
          console.error('[tRPC] Fetch input that caused error:', input);
          throw error;
        }
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
