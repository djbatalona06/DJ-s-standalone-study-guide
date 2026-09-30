import type { PathNode } from '../domain/pathway/pathway';

/**
 * From a first A+ to a cloud role. Hours are rough estimates for someone
 * studying alongside other things, not measurements. Nothing here promises a
 * job: the point is a sensible order, and what is open next.
 *
 * Pay: only figures with a cited source and a retrieval date appear, and only
 * for occupations the source actually covers. The two below are from the US
 * Bureau of Labor Statistics' Occupational Outlook Handbook. Both show
 * employment projected to *decline*, and the screen says so. There is no
 * figure for the cloud role because no BLS occupation matches it closely, so
 * that field stays hidden rather than borrowing a nearby one.
 *
 * Certifier links: CompTIA's site could not be reached from the build
 * environment, so these pages were not opened to confirm the addresses. The
 * app links to them and books nothing itself. Confirm the current exam codes
 * and objectives on the certifier's own site before you study or book.
 */
const BLS = 'https://www.bls.gov/ooh/computer-and-information-technology';
const RETRIEVED = '2026-09-30';

export const PATHWAY: PathNode[] = [
  // ---- Foundations ----
  {
    id: 'cs50-intro', stage: 'Foundations', type: 'skill', title: 'Intro CS and web basics',
    summary: 'Binary and memory, C, data structures, then Python, SQL, HTML/CSS/JavaScript and Flask. It is the base for scripting, and it makes every later node easier to learn.',
    hours: 120, requires: [], trackId: 'cs50',
  },
  {
    id: 'aplus-core1', stage: 'Foundations', type: 'cert', title: 'CompTIA A+ Core 1',
    summary: 'Hardware, networking, mobile devices, virtualization and troubleshooting. Booked when your readiness and your last two practice exams are all at your bar.',
    hours: 80, requires: [], trackId: 'a1', officialUrl: 'https://www.comptia.org/certifications/a',
  },
  {
    id: 'aplus-core2', stage: 'Foundations', type: 'cert', title: 'CompTIA A+ Core 2',
    summary: 'Operating systems, security, software troubleshooting and operational procedures. Together with Core 1 it earns the A+ certification.',
    hours: 80, requires: [], trackId: 'a2', officialUrl: 'https://www.comptia.org/certifications/a',
  },
  {
    id: 'home-lab', stage: 'Foundations', type: 'project', title: 'Build and break a home lab',
    summary: 'Reimage a PC, install Linux beside Windows, set up a router, and break each on purpose so you fix it under no pressure. Write down what you did.',
    hours: 20, requires: [],
  },

  // ---- Help desk ----
  {
    id: 'role-help-desk', stage: 'Help desk', type: 'role', title: 'Help desk technician (tier 1)',
    summary: 'First contact for users: reset passwords, fix printers and connections, log every ticket clearly, and know when to escalate.',
    hours: 40, requires: ['aplus-core1', 'aplus-core2'], grants: 'Help desk',
    pay: {
      median: 62890, dataYear: 'May 2025', source: `${BLS}/computer-support-specialists.htm`,
      sourceName: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Computer Support Specialists',
      retrievedOn: RETRIEVED, outlook: { percent: -3, years: '2025–35' }, openingsPerYear: 48700,
    },
  },
  {
    id: 'linux-basics', stage: 'Help desk', type: 'skill', title: 'Linux command line',
    summary: 'Files and permissions, processes, packages, networking commands, and editing a config file over SSH. The Core 2 Linux cards are the start.',
    hours: 40, requires: ['aplus-core2'],
  },
  {
    id: 'ticket-log', stage: 'Help desk', type: 'project', title: 'A knowledge base of solved tickets',
    summary: 'Write up ten problems you solved as if for the next technician: symptom, cause, fix, and how you checked it worked.',
    hours: 15, requires: ['aplus-core2'],
  },

  // ---- Specialize ----
  {
    id: 'network-plus', stage: 'Specialize', type: 'cert', title: 'CompTIA Network+',
    summary: 'Deeper networking: subnetting, routing and switching, wireless, and troubleshooting a network layer by layer. Builds directly on Core 1.',
    hours: 100, requires: ['aplus-core1'], grants: 'Specialize', officialUrl: 'https://www.comptia.org/certifications/network',
  },
  {
    id: 'security-plus', stage: 'Specialize', type: 'cert', title: 'CompTIA Security+',
    summary: 'Threats, cryptography, identity and access, and incident response. Core 2’s security domain is the foundation.',
    hours: 100, requires: ['aplus-core2', 'network-plus'], officialUrl: 'https://www.comptia.org/certifications/security',
  },
  {
    id: 'cloud-fundamentals', stage: 'Specialize', type: 'cert', title: 'A cloud fundamentals certification',
    summary: 'A first vendor exam covering cloud concepts, pricing and core services, from Microsoft, Amazon or Google. Choose the provider your target employers use.',
    hours: 30, requires: ['aplus-core1'],
  },
  {
    id: 'scripting', stage: 'Specialize', type: 'skill', title: 'Scripting: PowerShell, Bash and Python',
    summary: 'Automate the boring parts: accounts, backups, reports. Python from the intro CS track carries straight over.',
    hours: 60, requires: ['cs50-intro', 'linux-basics'],
  },

  // ---- Sysadmin ----
  {
    id: 'role-sysadmin', stage: 'Sysadmin', type: 'role', title: 'Systems or network administrator',
    summary: 'Own servers, networks and accounts: patching, backups, monitoring, and the plan for when something breaks. More automation than help desk.',
    hours: 60, requires: ['role-help-desk', 'network-plus', 'linux-basics'], grants: 'Sysadmin',
    pay: {
      median: 99130, dataYear: 'May 2025', source: `${BLS}/network-and-computer-systems-administrators.htm`,
      sourceName: 'US Bureau of Labor Statistics, Occupational Outlook Handbook: Network and Computer Systems Administrators',
      retrievedOn: RETRIEVED, outlook: { percent: -4, years: '2025–35' }, openingsPerYear: 13400,
    },
  },
  {
    id: 'windows-server', stage: 'Sysadmin', type: 'skill', title: 'Windows Server and Active Directory',
    summary: 'Domains, group policy, DNS and DHCP on a real server, built in a virtual lab. Core 2’s operating systems domain shows why it matters.',
    hours: 60, requires: ['role-help-desk'],
  },
  {
    id: 'automation-project', stage: 'Sysadmin', type: 'project', title: 'Automate onboarding',
    summary: 'A script that creates an account, assigns groups, sets up a home folder and emails a summary, with logging and a way to undo it.',
    hours: 25, requires: ['scripting', 'windows-server'],
  },

  // ---- Cloud ----
  {
    id: 'cloud-associate', stage: 'Cloud', type: 'cert', title: 'A cloud associate-level certification',
    summary: 'Design and run real workloads on one provider: networking, identity, storage, compute and cost. Needs the fundamentals and solid networking.',
    hours: 120, requires: ['cloud-fundamentals', 'network-plus'],
  },
  {
    id: 'iac-project', stage: 'Cloud', type: 'project', title: 'Deploy an app with infrastructure as code',
    summary: 'Describe a small app’s network and servers in code, deploy it from a pipeline, break it, and rebuild it from scratch in minutes.',
    hours: 40, requires: ['cloud-associate', 'scripting'],
  },
  {
    id: 'role-cloud', stage: 'Cloud', type: 'role', title: 'Cloud engineer',
    summary: 'Build and run infrastructure on a cloud provider, mostly through code. Rests on the sysadmin fundamentals plus cloud and automation.',
    hours: 60, requires: ['role-sysadmin', 'cloud-associate', 'iac-project'], grants: 'Cloud',
  },
];
