import { EmbedBuilder } from 'discord.js';

export const ACCENT_BLUE = 0x2e51a2;

export const RANK_OPTIONS = [
  'PO',
  'PO2',
  'PO3',
  'CPL',
  'SGT',
  'SSGT',
  'SGM',
  'LT',
  'HLT',
  'CPT',
  'HCPT',
  'MJR',
  'HMJR',
  'CMDR',
  'WCMDR',
];

export const RANK_LABELS = {
  PO: 'Police Officer',
  PO2: 'Police Officer Second Class',
  PO3: 'Police Officer Third Classa',
  CPL: 'Corporal',
  SGT: 'Sergeant',
  SSGT: 'Staff Sergeant',
  SGM: 'Sergeant Major',
  LT: 'Lieutenant',
  HLT: 'Head Lieutenant',
  CPT: 'Captain',
  HCPT: 'Head Captain',
  MJR: 'Major',
  HMJR: 'Head Major',
  CMDR: 'Commander',
  WCMDR: 'Watch Commander',
};

export const RANK_REQUIREMENTS = {
  PO: {
    title: 'Your Rank is PO',
    nextRank: 'PO2',
    requirements: [
      'Have a official Callsign and be rostered',
      'Complete and pass your Basic Training',
      'Complete and pass a Ride-Along',
      'Must be SOP Certified',
    ],
  },
  PO2: {
    title: 'Your Rank is PO2',
    nextRank: 'PO3',
    requirements: [
      'Have a minimum of 8 hours logged every 14 days (4 hours a week)',
      'Have a minimum of 5 reports (Warnings, Citations, Arrest Reports combined) logged',
      'Have minimum of 14 days Time In Grade',
    ],
  },
  PO3: {
    title: 'Your Rank is PO3',
    nextRank: 'Corporal',
    requirements: [
      'Have a minimum of 8 hours logged every 14 days (4 hours a week)',
      'Have a minimum of 5 reports (Warnings, Citations, Arrest Reports combined) logged',
      'Have minimum of 14 days Time In Grade',
    ],
  },
  CPL: {
    title: 'Your Rank is Corporal',
    nextRank: 'Sergeant',
    requirements: [
      'Must become a fully certified Field Training Officer by witnessing and hosting a basic training',
      'Host a basic Ride-Along for a PO',
      'Have a minimum of 8 hours every 14 days (4 hours a week)',
      'Complete and pass a Supervisor RA with a SGM or above',
      'Have a minimum of 14 days Time In Grade',
    ],
  },
  SGT: {
    title: 'Your Rank is Sergeant',
    nextRank: 'Staff Sergeant',
    requirements: [
      'Officer Must Oversee Patrols & Report Any Problems To The Command Staff',
      'Minimum of 8 hours every 14 days Time In Grade (4 hours a week)',
      'Officer Must Host Or Co-Host 1-2 Trainings & Complete 1-2 Basic Police Ride-Along For A Police Officer First Class',
      'Officer Must Adhere To & Enforce The Los Santos Police Department Standard Operating Procedures (SOP) & The Global Standard Operating Procedures (SOP)',
      'Officer Must Mentor & Guide Officers That Require Your Assistance When On Patrol',
      'Officer Must Have A Minimum Of Fourteen (14) Days Time In Grade (TIG) To Be Eligible For Promotion To Staff Sergeant Per GSOP.',
    ],
  },
  SSGT: {
    title: 'Your Rank is Staff Sergeant',
    nextRank: 'Sergeant Major',
    requirements: [
      'Officer Must Oversee Patrols & Report Any Problems To The Command Staff',
      'Officer Must Have A Minimum Of 8 Hours Logged Every 14 Days Within The Department (4 Hours Per Week) To Be Considered Eligible For A Promotion To Sergeant Major.',
      'Officer Must Host Or Co-Host 1-2 Trainings & Complete 1-2 Basic Police Ride Along For A Police Officer First Class',
      'Officer Must Adhere To & Enforce The Los Santos Police Department Standard Operating Procedures (SOP) & The Global Standard Operating Procedures (SOP)',
      'Officer Must Mentor & Guide Officers That Require Your Assistance When On Patrol',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Sergeant Major Per GSOP.',
    ],
  },
  SGM: {
    title: 'Your Rank is Sergeant Major',
    nextRank: 'Lieutenant & Head Lieutenant',
    requirements: [
      'Officer Must Oversee Patrols & Report Any Problems To The Command Staff',
      'Officer Must Have A Minimum Of 8 Hours Logged Every 14 Days Within The Department (4 Hours Per Week) To Be Considered Eligible For A Promotion To Lieutenant.',
      'Officer Must Host Or Co-Host 1-2 Trainings & Complete 1-2 Basic Police Ride Along For A Police Officer First Class',
      'Officer Must Adhere To & Enforce The Los Santos Police Department Standard Operating Procedures (SOP)',
      'Officer Must Mentor & Guide Officers That Require Your Assistance When On Patrol',
      'Officer Must Pass & Complete 2 Command Ride-Along With A Lieutenant+ To Be Considered Eligible For A Promotion To Lieutenant.',
      'Officer Must Pass And Complete The Command Examination To Be Considered Eligible For A Promotion To Lieutenant.',
      'Officer Must Have A Minimum Of Twenty Eight (28) Days Time In Grade (TIG) To Be Eligible For Promotion To Lieutenant.',
    ],
  },
  LT: {
    title: 'Your Rank is Lieutenant or Head Lieutenant',
    nextRank: 'Captain',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Captain.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Captain Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  HLT: {
    title: 'Your Rank is Lieutenant or Head Lieutenant',
    nextRank: 'Captain',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Captain.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Captain Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  CPT: {
    title: 'Your Rank is Captain or Head Captain',
    nextRank: 'Major',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Major.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Major Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  HCPT: {
    title: 'Your Rank is Captain or Head Captain',
    nextRank: 'Major',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Major.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Major Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  MJR: {
    title: 'Your Rank is Major',
    nextRank: 'Commander & Watch Commander',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Commander.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Commander Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  HMJR: {
    title: 'Your Rank is Major',
    nextRank: 'Commander & Watch Commander',
    requirements: [
      'Officer Must Consistently Fulfill Their Command Role And Responsibilities As Outlined In Command Information To Be Considered Eligible For A Promotion To Commander.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To Commander Per GSOP.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  CMDR: {
    title: 'Your Rank is Commander or Watch Commander',
    nextRank: 'High Command',
    requirements: [
      'Officer Must Follow Their Primary Role Found In Command Information At All Times To Be Considered Eligible For A Promotion To High Command.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To High Command Per GSOP.',
      'Officer Must Complete And Pass An Interview With The High Command Team, To Be Eligible For Promotion To High Command.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
  WCMDR: {
    title: 'Your Rank is Commander or Watch Commander',
    nextRank: 'High Command',
    requirements: [
      'Officer Must Follow Their Primary Role Found In Command Information At All Times To Be Considered Eligible For A Promotion To High Command.',
      'Fulfil All Command Staff Duties To A High Standard',
      'Officer Must Have A Minimum Of 14 Days Time In Grade (TIG) To Be Eligible For Promotion To High Command Per GSOP.',
      'Officer Must Complete And Pass An Interview With The High Command Team, To Be Eligible For Promotion To High Command.',
      'High Command’s Discretion Based On Performance For Command Staff Promotions',
    ],
  },
};

export function buildRankEmbed(rank) {
  const data = RANK_REQUIREMENTS[rank];
  if (!data) return null;

  const requirements = data.requirements
    .map((item) => `• ${item}`)
    .join('\n');

  const description = [
    data.title,
    '',
    `To be promoted to **${data.nextRank}** you have to complete the following:`,
    requirements,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle('Rank Requirements')
    .setDescription(description)
    .setFooter({ text: `Rank: ${RANK_LABELS[rank]}` })
    .setTimestamp();
}
