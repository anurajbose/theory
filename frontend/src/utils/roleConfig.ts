export type JobRoleKey =
  | 'BA' | 'DEVELOPER' | 'QA' | 'PM'
  | 'RISK_ORM' | 'IT_GRC' | 'INFOSEC' | 'COMPLIANCE'
  | 'SALES' | 'COLLECTIONS' | 'HR' | 'CUSTOM';

interface RoleConfig {
  label: string;
  description: string;
  icon: string;
  sections: string[];
}

export const ROLE_CONFIG: Record<JobRoleKey, RoleConfig> = {
  BA: {
    label: 'Business Analyst',
    description: 'CRs, tickets, stakeholder tracking',
    icon: '📋',
    sections: ['CRs', 'L3 Tickets', 'Follow-ups', 'Enhancements', 'Stakeholders'],
  },
  DEVELOPER: {
    label: 'Developer',
    description: 'Tasks, bugs, PRs, deployments',
    icon: '💻',
    sections: ['Tasks', 'Bugs', 'PRs', 'Tech Debt', 'Deployments'],
  },
  QA: {
    label: 'QA Engineer',
    description: 'Test cases, defects, UAT sign-offs',
    icon: '🧪',
    sections: ['Test Cases', 'Defects', 'UAT Sign-offs', 'Test Plans'],
  },
  PM: {
    label: 'Project Manager',
    description: 'Milestones, RAID log, resources',
    icon: '📌',
    sections: ['Milestones', 'RAID Log', 'Resources', 'Stakeholders'],
  },
  RISK_ORM: {
    label: 'Risk / ORM',
    description: 'Risk register, incidents, RCSA',
    icon: '⚠️',
    sections: ['Risk Register', 'Incident Log', 'RCSA Tracker', 'Control Testing'],
  },
  IT_GRC: {
    label: 'IT GRC',
    description: 'Audit findings, compliance calendar',
    icon: '🔒',
    sections: ['Audit Findings', 'Compliance Calendar', 'Policy Compliance', 'Vendor Risk'],
  },
  INFOSEC: {
    label: 'Infosec',
    description: 'Vulnerability tracking, SOC alerts',
    icon: '🛡️',
    sections: ['Vulnerability Tracker', 'Incidents', 'Pen Test Findings', 'SOC Alerts'],
  },
  COMPLIANCE: {
    label: 'Compliance',
    description: 'Regulatory tracker, KYC/AML',
    icon: '⚖️',
    sections: ['Regulatory Tracker', 'Breach Log', 'Compliance Calendar', 'KYC/AML'],
  },
  SALES: {
    label: 'Sales',
    description: 'Lead pipeline, proposals, targets',
    icon: '📈',
    sections: ['Lead Pipeline', 'Follow-ups', 'Proposals', 'Target vs Actuals'],
  },
  COLLECTIONS: {
    label: 'Collections',
    description: 'Bucket management, case tracker',
    icon: '💼',
    sections: ['Bucket Mgmt', 'Case Tracker', 'Legal Cases', 'Recovery Targets'],
  },
  HR: {
    label: 'Human Resources',
    description: 'Onboarding, interviews, L&D',
    icon: '👥',
    sections: ['Onboarding', 'Interviews', 'L&D Plans', 'Exit Tracker'],
  },
  CUSTOM: {
    label: 'Custom',
    description: 'Configure your own board sections',
    icon: '⚙️',
    sections: [],
  },
};

export const JOB_ROLES = Object.entries(ROLE_CONFIG) as [JobRoleKey, RoleConfig][];
