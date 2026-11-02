// Fictional seed data for the PolicyDesk demo. Shared by the migration generator and "Reset demo data".
const FOOT = "\n\n_Fictional company. Sample policy for demonstration only; not legal advice._";

export const HANDBOOK = "Bayanihan Digital Inc. — Employee Handbook (fictional)";
export const LEAVE = "Bayanihan Digital Inc. — Leave Policy (fictional)";
export const PAYROLL = "Bayanihan Digital Inc. — Payroll & Benefits Guide (fictional)";

export const SEED_DOCUMENTS: { title: string; content: string }[] = [
  {
    title: HANDBOOK,
    content: `# Employee Handbook

## Working Hours
The standard workday at Bayanihan Digital Inc. is 8 hours of work per day, Monday to Friday, plus a 1-hour unpaid lunch break. Employees may choose a flexible start time anywhere between 7:00 AM and 10:00 AM, provided they complete their 8 working hours. For example, an employee who starts at 7:00 AM ends the day at 4:00 PM, while an employee who starts at 10:00 AM ends at 7:00 PM. Your chosen start time should be agreed with your manager and kept reasonably consistent.

## Remote Work
Employees may work remotely for up to 3 days per week with their manager's approval. Remote work arrangements are reviewed every quarter. While working remotely, employees must be online and reachable during the core hours of 10:00 AM to 4:00 PM. Employees are responsible for a safe, quiet workspace and a stable internet connection. Confidential documents must not be printed or viewed in public places.

## Overtime
Overtime must be pre-approved in the HR system before the work is performed. Requests should state the reason and the expected number of hours. Approved overtime on regular working days is paid at 125% of the employee's hourly rate. Overtime that was not pre-approved in the HR system will not be paid, except in documented emergencies confirmed by the department head.

## Attendance
Employees working at the office clock in through a geofenced clock-in in the company app, which only works within the office premises. Employees working remotely check in via the app at the start of their workday. Repeated late arrivals or missed check-ins are reviewed by the manager and may lead to coaching or disciplinary action.

## Code of Conduct
All employees are expected to act with honesty, respect and professionalism. Harassment, discrimination and bullying of any kind are not tolerated. Employees must avoid conflicts of interest and disclose any outside business that may compete with the company. Company information is confidential and may not be shared outside the company without authorization. Violations may be reported to HR or through the anonymous ethics hotline.

## Equipment
Each employee receives a company laptop and the accessories needed for their role. Equipment remains company property and must be used mainly for work. Lost or damaged equipment must be reported to IT within 24 hours. Upon separation from the company, all equipment, including the company laptop, must be returned within 5 working days.${FOOT}`,
  },
  {
    title: LEAVE,
    content: `# Leave Policy

## Vacation Leave
Regular employees receive 15 days of vacation leave per year. Vacation leave is accrued monthly at a rate of 1.25 days per month. Vacation leave requests must be filed in the HR system at least 5 working days before the first day of leave, and are subject to manager approval based on team workload.

## Sick Leave
Employees receive 10 days of sick leave per year. Sick leave should be reported to the manager as early as possible on the first day of absence. Sick leave longer than 2 consecutive days requires a medical certificate, submitted in the HR system upon return to work.

## Conversion of Unused Leave
At the end of the calendar year, unused vacation leave of up to 5 days is converted to cash at the employee's daily basic rate. Unused vacation leave beyond 5 days is forfeited. Unused sick leave is not convertible to cash.

## Bereavement Leave
Employees are entitled to 3 days of paid bereavement leave upon the death of an immediate family member (spouse, child, parent or sibling). Bereavement leave should be filed in the HR system as soon as practical.

## Birthday Leave
Every employee receives 1 day of paid birthday leave each year. It may be taken on the birthday itself or within the same month.

## Filing and Approval
All leave types are filed and tracked in the HR system. Leave balances are visible in the employee's profile. Managers should act on leave requests within 2 working days.${FOOT}`,
  },
  {
    title: PAYROLL,
    content: `# Payroll & Benefits Guide

## Payroll Schedule
Salaries are paid twice a month: every 15th and on the last day of the month. If a payday falls on a weekend, salary is released on the Friday before. Salaries are credited directly to the employee's payroll bank account.

## Payslips
Payslips are available in the company app on each payday. Payslips show gross pay, overtime, deductions and net pay.

## 13th-Month Pay
All rank-and-file employees receive 13th-month pay equal to one-twelfth (1/12) of the total basic salary earned within the calendar year. The 13th-month pay is paid on or before December 24 each year. Employees who separate during the year receive a pro-rated amount with their final pay.

## Statutory Deductions
Statutory deductions are taken from salary each payroll period: SSS, PhilHealth, Pag-IBIG and withholding tax. Contribution rates follow the current government tables and may change when the government updates them; this guide does not list specific rates.

## Salary Disputes
If an employee believes their salary or payslip is incorrect, they must file a salary dispute with HR within 30 days of the payday concerned. HR will respond with findings and, where needed, a correction in the next payroll.

## HMO Coverage
Health maintenance organization (HMO) coverage starts after 3 months of employment. Coverage includes the employee plus 1 dependent. Additional dependents may be enrolled at the employee's own cost.${FOOT}`,
  },
];

export type SeedTest = {
  question: string;
  expected_facts: string;
  expected_source: string | null;
  should_abstain: boolean;
};

export const SEED_TESTS: SeedTest[] = [
  { question: "How many vacation leave days do I get per year?", expected_facts: "15 days per year, accrued 1.25 days per month", expected_source: LEAVE, should_abstain: false },
  { question: "How many sick leave days do I get?", expected_facts: "10 days of sick leave per year", expected_source: LEAVE, should_abstain: false },
  { question: "When do I need a medical certificate for sick leave?", expected_facts: "Sick leave longer than 2 consecutive days requires a medical certificate", expected_source: LEAVE, should_abstain: false },
  { question: "How far in advance must I file a vacation leave request?", expected_facts: "At least 5 working days ahead", expected_source: LEAVE, should_abstain: false },
  { question: "What happens to my unused vacation leave at the end of the year?", expected_facts: "Up to 5 unused days convert to cash at year end; the rest is forfeited", expected_source: LEAVE, should_abstain: false },
  { question: "Do I get leave for my birthday?", expected_facts: "Yes, 1 day of birthday leave per year", expected_source: LEAVE, should_abstain: false },
  { question: "When is the 13th-month pay released?", expected_facts: "On or before December 24; equal to one-twelfth of total basic salary earned in the year", expected_source: PAYROLL, should_abstain: false },
  { question: "When is payday if the 15th falls on a Saturday?", expected_facts: "Salary is released on the Friday before", expected_source: PAYROLL, should_abstain: false },
  { question: "When does my HMO coverage start and who is covered?", expected_facts: "After 3 months; covers the employee plus 1 dependent", expected_source: PAYROLL, should_abstain: false },
  { question: "Do I need approval before working overtime?", expected_facts: "Yes, overtime must be pre-approved in the HR system; paid at 125% of hourly rate on regular days", expected_source: HANDBOOK, should_abstain: false },
  { question: "How many days a week can I work from home?", expected_facts: "Up to 3 days per week with manager approval; core hours 10 AM–4 PM", expected_source: HANDBOOK, should_abstain: false },
  { question: "How long do I have to return my laptop after leaving the company?", expected_facts: "Within 5 working days of separation", expected_source: HANDBOOK, should_abstain: false },
  { question: "What is the company's stock option plan?", expected_facts: "Not covered — should abstain", expected_source: null, should_abstain: true },
  { question: "Can I bring my dog to the office?", expected_facts: "Not covered — should abstain", expected_source: null, should_abstain: true },
  { question: "What is the CEO's salary?", expected_facts: "Not covered — should abstain", expected_source: null, should_abstain: true },
];
