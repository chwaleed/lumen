import { mock } from "bun:test";

/**
 * A single shared axios mock.
 *
 * `mock.module` is process-global in bun, and every test file shares one module
 * registry — so each file registering its own mock would clobber the others
 * (and mocking `@/lib/http/client` would break the tests for that very module).
 * Mocking the outermost boundary once, here, keeps every test driving through
 * the real client code.
 */

export type MockedResponse = { status: number; data: unknown };

let nextResponse: MockedResponse | Error = { status: 200, data: null };
let queue: Array<MockedResponse | Error> = [];

export const axiosRequest = mock(async () => {
  const response = queue.length > 0 ? queue.shift()! : nextResponse;
  if (response instanceof Error) {
    throw response;
  }
  return response;
});

mock.module("axios", () => ({
  default: { create: () => ({ request: axiosRequest }) },
}));

/** Queues what the next axios call resolves to (or throws). */
export function respondWith(response: MockedResponse | Error) {
  nextResponse = response;
}

/** Queues a successful API envelope, the shape the backend normally returns. */
export function respondWithApi(
  status: number,
  body: { success?: boolean; message?: string | null; data?: unknown },
) {
  nextResponse = { status, data: body };
}

/**
 * Queues a sequence, one per call, for flows that make several requests --
 * such as the compile hook, which POSTs and then polls. Once the sequence is
 * exhausted the single `respondWith` value is used again.
 */
export function respondInOrder(responses: Array<MockedResponse | Error>) {
  queue = [...responses];
}

/** Queues a sequence of successful API envelopes. */
export function respondInOrderWithApi(
  responses: Array<{ status: number; data?: unknown; success?: boolean; message?: string | null }>,
) {
  queue = responses.map(({ status, ...body }) => ({ status, data: body }));
}

/** Call from beforeEach so state never bleeds between tests. */
export function resetAxiosMock() {
  nextResponse = { status: 200, data: null };
  queue = [];
  axiosRequest.mockClear();
}
