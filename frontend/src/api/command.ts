import { CommandInsightsResponse } from '../types/command';

const buildCommandEndpoint = (apiBase: string) => {
  const trimmed = apiBase.replace(/\/$/, '');
  return `${trimmed}/api/command/insights`;
};

export const fetchCommandInsights = async (apiBase: string): Promise<CommandInsightsResponse> => {
  const response = await fetch(buildCommandEndpoint(apiBase));
  if (!response.ok) {
    throw new Error(`Failed to load command insights (${response.status})`);
  }
  return (await response.json()) as CommandInsightsResponse;
};
