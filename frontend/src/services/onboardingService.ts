import api from './api';

export async function completeOnboarding(payload: {
  jobRole: string;
  teamId: string | null;
  deptId: string | null;
  sections: string[];
}) {
  const { data } = await api.post('/onboarding/complete', payload);
  return data;
}

export async function fetchDepartments() {
  const { data } = await api.get('/departments');
  return data as { id: string; name: string; bu: { name: string } }[];
}

export async function fetchTeams(deptId: string) {
  const { data } = await api.get(`/teams?deptId=${deptId}`);
  return data as { id: string; name: string }[];
}
