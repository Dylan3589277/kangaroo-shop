export type ReviewPagination = {
  page: number;
  limit: number;
};

export type ReviewInput = {
  authorName?: unknown;
  rating?: unknown;
  title?: unknown;
  content?: unknown;
};

export type ValidReviewInput = {
  authorName: string;
  rating: number;
  title: string | null;
  content: string;
};

export type ReviewValidationResult =
  | { success: true; data: ValidReviewInput }
  | { success: false; error: string };

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function normalizeReviewPagination(
  pageParam: string | null,
  limitParam: string | null
): ReviewPagination {
  const page = parsePositiveInteger(pageParam, 1);
  const limit = Math.min(parsePositiveInteger(limitParam, 10), 50);

  return { page, limit };
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRating(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
}

export function validateReviewInput(input: ReviewInput): ReviewValidationResult {
  const authorName = trimString(input.authorName);
  const content = trimString(input.content);

  if (!authorName || !content || input.rating === undefined || input.rating === null) {
    return { success: false, error: 'Missing required fields' };
  }

  const rating = parseRating(input.rating);
  if (rating === null) {
    return { success: false, error: 'Rating must be 1-5' };
  }

  const title = trimString(input.title);

  return {
    success: true,
    data: {
      authorName,
      rating,
      title: title || null,
      content,
    },
  };
}
