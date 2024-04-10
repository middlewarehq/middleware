import { Octokit } from '@octokit/rest';

export const Github = new Octokit();
export type { GetResponseDataTypeFromEndpointMethod as GhType } from '@octokit/types';
