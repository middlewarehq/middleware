import { last } from 'ramda';

import { handleRequest } from '@/api-helpers/axios';
import { merge } from '@/utils/datatype';
import { staticArray } from '@/utils/mock';

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  page_size: number;
  total_count: number;
};

export const paginatedRequest = async <T = any>(
  url: string,
  params: { page: number; page_size: number }
): Promise<PaginatedResponse<T>> => {
  const response = await handleRequest<PaginatedResponse<T>>(url, { params });
  const totalResultsSoFar =
    (response.page - 1) * params.page_size + response.data.length;

  if (response.total_count < totalResultsSoFar) return response;

  response.data = response.data.concat(
    ...(await paginatedRequest(url, {
      ...params,
      page: params.page + 1
    }).then((r) => r.data))
  );

  return response;
};

export const batchPaginatedRequest = async <T = any>(
  url: string,
  params: { page: number; page_size: number } = { page: 1, page_size: 100 },
  batch_size = 5
): Promise<PaginatedResponse<T>> => {
  const pages = staticArray(batch_size, (n) => n + params.page);

  const response = await Promise.all(
    pages.map((page) =>
      handleRequest<PaginatedResponse<T>>(url, {
        params: { ...params, page }
      })
    )
  ).then(
    (row) =>
      ({
        ...last(row),
        data: row.flatMap((r) => r.data)
      }) as PaginatedResponse<T>
  );

  const totalResultsSoFar =
    (params.page - 1) * params.page_size + response.data.length;

  if (response.total_count <= totalResultsSoFar) return response;

  response.data = response.data.concat(
    ...(await batchPaginatedRequest(
      url,
      merge(params, { page: params.page + batch_size }),
      batch_size
    ).then((r) => r.data))
  );

  return response;
};

export const batchPaginatedListsRequest = async <T = any>(
  url: string,
  params: { page: number; page_size: number } = { page: 1, page_size: 100 },
  batch_size = 5
): Promise<T[]> => {
  const pages = staticArray(batch_size, (n) => n + params.page);

  let response = await Promise.all(
    pages.map((page) =>
      handleRequest<T[]>(url, {
        params: { ...params, page, page_size: params.page_size }
      })
    )
  ).then((row) => row.flat());

  const endOfResults = response.length < params.page_size * batch_size;

  if (endOfResults) return response;

  response = response.concat(
    ...(await batchPaginatedListsRequest(
      url,
      merge(params, { page: params.page + batch_size }),
      batch_size
    ))
  );

  return response;
};
