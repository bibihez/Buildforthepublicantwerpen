import type {
  Answer,
  AnswerResponse,
  ApiError,
  ApproveRequest,
  Casus,
  CreateAnswerRequest,
  DraftCaseRequest,
  RerunRequest,
  SourceListItem,
  UpdateAnswerRequest,
} from "./types";

export class ClientError extends Error {
  status: number;
  details: ApiError | null;

  constructor(status: number, details: ApiError | null) {
    super(details?.error || `The request failed (${status}).`);
    this.name = "ClientError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData
      ? init.headers
      : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    let details: ApiError | null = null;
    try {
      details = (await response.json()) as ApiError;
    } catch {
      // The fallback message below deliberately avoids hiding a non-JSON server failure.
    }
    throw new ClientError(response.status, details);
  }

  return (await response.json()) as T;
}

export const answerClient = {
  draftCase(body: DraftCaseRequest) {
    return request<{ casus: Casus }>("/api/cases/draft", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  create(body: CreateAnswerRequest) {
    return request<AnswerResponse>("/api/answers", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  get(id: string) {
    return request<AnswerResponse>(`/api/answers/${id}`);
  },
  list() {
    return request<{ answers: Answer[] }>("/api/answers");
  },
  update(id: string, body: UpdateAnswerRequest) {
    return request<AnswerResponse>(`/api/answers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  rerun(id: string, body: RerunRequest) {
    return request<AnswerResponse>(`/api/answers/${id}/rerun`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  approve(id: string, body: ApproveRequest) {
    return request<AnswerResponse>(`/api/answers/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  newVersion(id: string) {
    return request<AnswerResponse>(`/api/answers/${id}/new-version`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

export const sourceClient = {
  list() {
    return request<{ sources: SourceListItem[] }>("/api/sources");
  },
  upload(formData: FormData) {
    return request<{ source: SourceListItem; passages: number }>("/api/sources", {
      method: "POST",
      body: formData,
    });
  },
  setActive(id: string, active: boolean, reason: string, by: string) {
    return request<{ source: SourceListItem }>(`/api/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active, reason, by }),
    });
  },
};
