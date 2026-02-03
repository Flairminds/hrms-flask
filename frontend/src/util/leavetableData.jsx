export const tableHeaders = [
  { key: 'empName', displayName: 'Employee Name' },
  { key: 'description', displayName: 'Description' },
  { key: 'leaveName', displayName: 'Leave Type' },
  { key: 'duration', displayName: 'Duration' },
  { key: 'fromDate', displayName: 'From Date' },
  { key: 'toDate', displayName: 'To Date' },
  { key: 'applicationDate', displayName: 'Application Date' },
  { key: 'numberOfDays', displayName: 'Number of Days' },
  { key: 'leaveStatus', displayName: 'Leave Status' },
  { key: 'approvedBy', displayName: 'Approved By' },
  { key: 'approvalComment', displayName: 'Approval Comment' },
  // { key: 'isCommunicatedToTeam', displayName: 'Communicated to Team' },
  // { key: 'isCustomerApprovalRequired', displayName: 'Customer Approval Required' }
];

export const tableHeadersTM = [
  { key: "empName", displayName: "Employee Name" },
  // { key: "appliedBy", displayName: "Applied By" },
  { key: 'leaveName', displayName: 'Leave Type' },
  { key: 'fromDate', displayName: 'From Date', dataFormat: 'date' },
  { key: 'toDate', displayName: 'To Date', dataFormat: 'date' },
  { key: 'duration', displayName: 'Duration' },
  { key: 'applicationDate', displayName: 'Application Date', dataFormat: 'date' },
  { key: 'leaveStatus', displayName: 'Leave Status' },
  { key: "appliedLeaveCount", displayName: "No of Days" },
  // {key:'leaveStatus',displayName:'leaveStatus'},
  { key: 'comments', displayName: 'Description' },
  // { key: 'approvedBy', displayName: 'Approved By' },
  // { key: 'approvalComment', displayName: 'Approval Comment' },
  // {key:'attachments',displayName:'attachments'},
  // { key: "isBillable", displayName: "Is Billable" },
  // { key: "isCommunicatedToTeam", displayName: "Communicated to Team" },
  // { key: "isCustomerApprovalRequired", displayName: "Customer Approval Required" },
  // { key: "temp", displayName: "Temporary" },
  // { key: "fromTime", displayName: "From Time" },
  // { key: "toTime", displayName: "To Time" },
  // { key: "reasonForWorkingLate", displayName: "Reason for Working Late" },
  // { key: "compOffDetails", displayName: "Comp Off Details" },
  // { key: "workedDate", displayName: "Worked Date" },
  // { key: "handOverComments", displayName: "Hand Over Comments" },
];
export const allEmployeeLeaves = [
  { id: 1, employeeId: 'E001', leaveType: 'Sick Leave', startDate: '2024-01-01', endDate: '2024-01-03' },
  { id: 2, employeeId: 'E002', leaveType: 'Vacation', startDate: '2024-02-10', endDate: '2024-02-15' },
  { id: 3, employeeId: 'E001', leaveType: 'Sick Leave', startDate: '2024-03-01', endDate: '2024-03-03' },
  { id: 4, employeeId: 'E003', leaveType: 'Maternity Leave', startDate: '2024-04-01', endDate: '2024-07-01' },
  // ... more records
];

export const allLeavesData = [
  { key: "EmployeeId", displayName: "Emp Id" },
  { key: "EmployeeName", displayName: "Employee Name" },
  { key: "LeaveType", displayName: "Leave Type" },
  { key: 'fromDate', displayName: 'From Date' },
  { key: 'toDate', displayName: 'To Date' },
  { key: 'ApprovedBy', displayName: 'Approved By' },
  { key: 'LeaveStatus', displayName: 'Leave Status' },
  { key: 'WorkingDayLeaveCount', displayName: 'Working Day Leave Count' },
  { key: 'PrivilegeLeaveBalance', displayName: 'Privilege Leave Balance' },
  { key: 'SickLeaveBalance', displayName: 'Sick Leave Balance' },
  { key: 'CarryForwardBalance', displayName: 'Carry Forward Balance' },
  { key: 'WFHBalance', displayName: 'Work From Home Balance' }
];

