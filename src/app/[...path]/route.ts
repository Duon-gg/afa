import { proxyRequest } from "@/lib/un-proxy";

async function handle(request: Request, context: RouteContext<"/[...path]">) {
  const { path } = await context.params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export const GET = handle;
export const HEAD = handle;
