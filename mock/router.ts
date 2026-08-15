// Minimal path-matching router for the mock API. Routes are tried in
// registration order — register more specific/static paths (e.g. "/me")
// before dynamic ones (e.g. "/:id") the same way an Express app would.

export interface MockRequest {
  method: string
  path: string // path only, no query string, no API base prefix
  params: Record<string, string>
  query: URLSearchParams
  body: any
  authUser: import("./session").DemoTokenPayload | null
}

export interface MockResponseInit {
  httpStatus?: number
  status?: "success" | "error"
  data?: unknown
  pagination?: unknown
  message?: string
  code?: string
}

export type Handler = (req: MockRequest) => MockResponseInit | Promise<MockResponseInit>

interface Route {
  method: string
  segments: string[]
  handler: Handler
}

const routes: Route[] = []

function splitPath(path: string): string[] {
  return path.split("?")[0].split("/").filter(Boolean)
}

export function route(method: string, pattern: string, handler: Handler) {
  routes.push({ method: method.toUpperCase(), segments: splitPath(pattern), handler })
}

export const get = (pattern: string, handler: Handler) => route("GET", pattern, handler)
export const post = (pattern: string, handler: Handler) => route("POST", pattern, handler)
export const patch = (pattern: string, handler: Handler) => route("PATCH", pattern, handler)
export const put = (pattern: string, handler: Handler) => route("PUT", pattern, handler)
export const del = (pattern: string, handler: Handler) => route("DELETE", pattern, handler)

function matchRoute(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
  const pathSegments = splitPath(path)
  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue
    if (r.segments.length !== pathSegments.length) continue
    const params: Record<string, string> = {}
    let ok = true
    for (let i = 0; i < r.segments.length; i++) {
      const rs = r.segments[i]
      const ps = pathSegments[i]
      if (rs.startsWith(":")) {
        params[rs.slice(1)] = decodeURIComponent(ps)
      } else if (rs !== ps) {
        ok = false
        break
      }
    }
    if (ok) return { handler: r.handler, params }
  }
  return null
}

export interface DispatchResult {
  httpStatus: number
  body: unknown
}

export async function dispatch(
  method: string,
  fullPath: string,
  opts: { body: any; authHeader: string | null }
): Promise<DispatchResult | null> {
  const [pathOnly, queryStr] = fullPath.split("?")
  const query = new URLSearchParams(queryStr || "")
  const matched = matchRoute(method, pathOnly)
  if (!matched) return null

  const { parseAuthHeader } = await import("./session")
  const authUser = parseAuthHeader(opts.authHeader)

  const req: MockRequest = {
    method: method.toUpperCase(),
    path: pathOnly,
    params: matched.params,
    query,
    body: opts.body,
    authUser,
  }

  try {
    const result = await matched.handler(req)
    const httpStatus = result.httpStatus ?? (result.status === "error" ? 400 : 200)
    const body: Record<string, unknown> = {
      status: result.status ?? "success",
      message: result.message ?? "OK",
    }
    if (result.data !== undefined) body.data = result.data
    if (result.pagination !== undefined) body.pagination = result.pagination
    if (result.code !== undefined) body.code = result.code
    return { httpStatus, body }
  } catch (err: any) {
    return {
      httpStatus: err?.httpStatus || 500,
      body: {
        status: "error",
        code: err?.code || "MOCK_ERROR",
        message: err?.message || "Mock handler error",
      },
    }
  }
}

export class MockError extends Error {
  httpStatus: number
  code: string
  constructor(httpStatus: number, code: string, message: string) {
    super(message)
    this.httpStatus = httpStatus
    this.code = code
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)
  return {
    items: pageItems,
    pagination: {
      total,
      page,
      pageSize,
      limit: pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}
