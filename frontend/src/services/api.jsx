import OTP from 'antd/es/input/OTP';
import axios from 'axios';
import moment from "moment";

// Use environment variable for API base URL
// In development: http://localhost:5000/api (via proxy)
// In production: /api (relative path, same origin)
// export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_BASE_URL = 'http://localhost:5000/api';

// Axios instance using environment-based API base URL
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 1.Login Api:- Authenticates a user with username and password. Returns a login token/session on success.
export const loginUser = (username, password) => {
  const res = axios.post(`${API_BASE_URL}/account/login`, {
    username: username,
    password: password
  });
  return res
}

// 2.Get Employee Details :-Fetches detailed information for a given employee by their ID.
export const getEmployeeDetails = (employeeId) => {
  return axios.get(`${API_BASE_URL}/EmployeesDetails/${employeeId}`);
};

// 3.Get Cards Details - Retrieves leave card details for a specific employee (leave balances, history, etc).
export const getLeaveCardDetails = (employeeId) => {
  const res = axios.get(`${API_BASE_URL}/Leave/LeavesCard/${employeeId}`)
  return res;
}

// Submits a new leave application/transaction for an employee.
export const insertLeaveTransaction = async (payload) => {
  const defaultApprover = "Parag Khandekar";
  const res = await axios.post(`${API_BASE_URL}/Leave/InsertLeaveTransaction`, {
    "employeeId": payload.employeeId,
    "comments": payload.comments,
    "leaveType": payload.leaveType,
    "duration": payload?.duration,
    "fromDate": payload.fromDate,
    "toDate": payload.toDate,
    "handOverComments": payload.handOverComments,
    "noOfDays": payload.noOfDays,
    "approvedBy": payload.appliedBy !== payload.employeeId ? defaultApprover : payload.approvedBy,
    "appliedBy": payload.appliedBy,
    "compOffTransactions": payload?.compOffTransactions?.length > 0
      ? payload.compOffTransactions.map(transaction => ({
        compOffDate: transaction.compOffDate,
        numberOfHours: transaction.numberOfHours
      }))
      : [{
        compOffDate: "2024-07-23T17:38:07.199Z",
        numberOfHours: 0
      }],
    "cutsomerHolidays": {
      workedDate: payload?.cutsomerHolidays?.workedDate || "2024-07-23"
    },
    "workingLates": {
      fromtime: payload?.workingLates?.fromtime || "string",
      totime: payload?.workingLates?.totime || "string",
      reasonforworkinglate: payload?.workingLates?.reasonforworkinglate || "string"
    }
  });
  return res;
};

// Gets available leave types and the approver for a given employee.
export const getTypeApprover = (employeeId) => {
  const res = axios.get(`${API_BASE_URL}/Leave/LeaveTypesAndApprover/`, {
    params: { "EmpId": `${employeeId}` }
  });
  return res;
};

// 5.Get Leave Details- Retrieves all leave details for an employee for a given year (used for leave history/report).
export const getLeaveDetails = (employeeId, year) => {
  return axios.get(`${API_BASE_URL}/Leave/GetLeaveDetails/${employeeId}?year=${year}`, {
    headers: {
      'Accept': '*/*'
    }
  });
};


// 6.Get Holid  ay details- Retrieves the list of company holidays.
export const holidayListData = () => {
  const res = axios.get(`${API_BASE_URL}/Leave/GetHolidays`)
  return res;
}

// 7.GetTeamLead :  Gets the team lead for a specific employee and year.
export const getTeamLead = (employeeId, year) => {
  return axios.get(`${API_BASE_URL}/Leave/teamlead/${employeeId}?year=${year}`);
};


// 8.Leave transaction
export const leaveTransaction = (employeeId, comments, leaveType, fromDate, toDate, handOverComments, leaveStatus) => {
  const res = axios.post(`${API_BASE_URL}/Leave/teamlead/`, {
    "employeeId": employeeId,
    "comments": `${comments}`,
    "leaveType": num,
    "fromDate": fromDate,
    "toDate": toDate,
    "handOverComments": handOverComments,
    "leaveStatus": `${leaveStatus}`
  }
  )
  return res;
}

// 9.update Leave status - Updates the status of a leave transaction (approve, reject, etc) by the approver.
export const updateLeaveStatus = (leaveTranId, leaveStatus, approverComment, isBillable, isCommunicatedToTeam, isCustomerApprovalRequired, approvedById) => {
  const res = axios.put(`${API_BASE_URL}/Leave/UpdateStatus/`, {
    "leaveTranId": leaveTranId,
    "leaveStatus": `${leaveStatus}`,
    "approverComment": `${approverComment}`,
    "isBillable": isBillable,
    "isCommunicatedToTeam": isCommunicatedToTeam,
    "isCustomerApprovalRequired": isCustomerApprovalRequired,
    "approvedById": approvedById
  })
  return res;
}

// export const leaveTransaction = (employeeId) =>{
//   const res = axios.post(`${API_BASE_URL}/Leave/teamlead/`,{
//     params : {"EmpId" : `${employeeId}`}
//   })
//   return res;
// }

/// 11. Cancel Leave : Cancels a leave request for a given leave transaction ID.
export const cancelLeave = (leaveTranId) => {
  return axiosInstance.patch('/EmployeesDetails/CancelLeave', {
    leaveTranId,
    leaveStatus: "Cancel"
  });
};



// 12. Assign Lead to Employee : Assigns a team lead to an employee.
export const postEmployeeId = (selectedEmployee, selectedLead) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/AssignLeadToEmp`, {
    empId: selectedEmployee,
    leadId: selectedLead
  });
  return res;
};

// 13. Get Employee Report : Retrieves an employee's performance report.
export const GetEmployeeReport = (employeeId) => {
  const res = axios.get(`${API_BASE_URL}/LeadFunctionality/GetEmpReport`, {
    params: { empid: employeeId }
  });
  return res
}

// Submits a new employee report form (lead functionality).
export const postForm = (formData) => {
  const res = axios.post(`${API_BASE_URL}/LeadFunctionality/AddEmpReport`,
    formData
  );
  return res
}

// 15. Get Latency Data : Retrieves lateral hire data for employees.
export const getLatencyData = () => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/lateralhires`)
  return res
}

// Updates the lateral hire status for an employee.
export const updateLateralStatus = (employeeId, checked) => {
  return axiosInstance.put('/HRFunctionality/Updatelateralhire', {
    employeeId: employeeId,
    lateralHire: checked
  });
};

// Adds an exempt leave entry for an employee (special leave cases).
export const addExemptLeave = (payload) => {
  return axiosInstance.post('/HRFunctionality/addexempt', payload);
};

// Retrieves all exempt leave records.
export const getExemptData = () => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/exemptdata`)
  return res
}

// Retrieves all leave records for a given year.
export const allLeaveRecords = async (year) => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/allleaverecords/?year=${year}`)
  return res;
}

// Updates the team lead for an employee.
export const updateApprover = async (employeeId, teamLeadId) => {
  const res = await axios.put(`${API_BASE_URL}/HRFunctionality/updateApprover`, {
    employeeId: employeeId,
    teamLeadId: teamLeadId
  });
  return res;
}

// Retrieves accessibility details for employees.
export const getaccessbilitydetails = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getaccessbilitydetails`)
  return res;

}

// Adds accessibility details for an employee.
export const addAccessibility = (payload) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/accessbility`, payload)
  return res;
};

// Retrieves all company bands.
export const getCompanyBands = () => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/getbands`)
  return res;
}

// Retrieves all company roles.
export const getCompanyRoles = () => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/getsubrole`)
  return res;
}

// Inserts a new employee record.
export const insertEmployee = async (payload) => {
  const res = await axios.post(`${API_BASE_URL}/EmployeesDetails/InsertEmployee`, payload)
  return res;
}

// Retrieves all company bands.
export const getBands1 = () => {
  const res = axios.get(`${API_BASE_URL}/EmployeesDetails/Bands`)
  return res;
}

// Retrieves all company roles.
export const getRoles1 = () => {
  const res = axios.get(`${API_BASE_URL}/EmployeesDetails/SubRoles`)
  return res;
}

// Retrieves all LOB leads.
export const getLobLead = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getlobleads`)
  return res;
}

// Adds a new LOB lead.
export const addLobLead = (payload) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/lobleads`, payload)
  return res;
};

// Retrieves all company bands.
export const getBands = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getbands`)
  return res;
}

// Adds a new band (level/grade) to the company.
export const addBands = (Band) => {
  const payload = { Band };
  return axios.post(`${API_BASE_URL}/HRFunctionality/AddBand`, payload);
};

// Adds a new holiday to the company holiday list.
export const addHolidays = (payload) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/AddHoliday`, payload)
  return res;
};

// Retrieves the list of company subroles (HR view).
export const getRoles = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getsubrole`)
  return res;
}

// Adds a new subrole to the company.
export const addRole = (roleName) => {
  const payload = { subRole: roleName };
  return axios.post(`${API_BASE_URL}/HRFunctionality/addsubrole`, payload);
};

// Retrieves the list of team leads.
export const getTeamLeadList = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getteamlead`)
  return res;
}

// Adds a new team lead to the company.
export const addTeamLead = (payload) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/addteamlead`, payload)
  return res;
}

// Retrieves all employee data.
export const getAllEmployeeData = () => {
  // debugger;
  const res = axios.get(`${API_BASE_URL}/EmployeesDetails/AllEmployeeDetails2`)
  return res;
}

// Updates personal details for an employee (self-service).
export const editPersonalDetails = (payload, employeeId) => {
  const res = axios.put(`${API_BASE_URL}/EmployeesDetails/UpdateEmployeeDetailsBySelf/${employeeId}`, payload
  );
  return res;
}

// Updates employee details for an employee (HR service).
export const updateEmployeeDetailsByHR = async (payload, employeeId) => {
  const updatedPayload = {
    updateEmployeeDetails: {
      ...payload,
      dateOfResignation: payload.dateOfResignation ? moment(payload.dateOfResignation).format('YYYY-MM-DD') : null,
      internshipEndDate: payload.internshipEndDate ? moment(payload.internshipEndDate).format('YYYY-MM-DD') : null,
      lwd: payload.lwd ? moment(payload.lwd).format('YYYY-MM-DD') : null,
      probationEndDate: payload.probationEndDate ? moment(payload.probationEndDate).format('YYYY-MM-DD') : null,
    }
  };

  //console.log("Formatted Payload:", updatedPayload);
  //console.log("payload ID:", payload);

  try {
    const res = await axios.put(`${API_BASE_URL}/HRFunctionality/UpdateEmployeeDetailsByHR/${employeeId}`, payload);
    // console.log("✅ Backend Response:", res.data); // <-- log it here
    return res;
  } catch (error) {

    throw error;
  }
};



// Retrieves the list of project names for HR.
export const getProjectNameForHR = async () => {
  const res = await axios.get(`${API_BASE_URL}/HRFunctionality/getprojectname`)
  return res;
}

// Retrieves the monthly report for a given month and year.
export const getMonthlyReport = (month, year) => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/monthly-report?month=${month}&year=${year}`)
  return res;
}

// Gets the list of all employee skills.
export const getAllEmployeeSkills = () => {
  return axiosInstance.get('/EmployeesDetails/Skills/All');
};

// Gets the list of all projects.
export const getProjectsDetails = () => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/getallprojectdetails`);
  return res;
};

// Adds a new project to the company.
export const addProjects = (payload) => {
  const res = axios.post(`${API_BASE_URL}/HRFunctionality/AddProject`, payload)
  return res;
}

// Updates a project's details.
export const updateProject = (payload, projectId) => {
  const res = axios.put(`${API_BASE_URL}/HRFunctionality/UpdateProjectDetails/${projectId}`, payload
  );
  return res;
}

// Gets the roles of an employee.
export const getEmployeeRoles = (employeeId) => {
  const res = axios.get(`/Leave/employee-roles`, {
    params: { employeeId },
  });
  return res;
};

// Resets a user's password.
export const resetPassword = (email, OTP, password) => {
  const formData = {
    "username": email,
    "otp": OTP,
    "newPassword": password
  }
  console.log("formData", formData);
  const res = axios.post(`${API_BASE_URL}/Account/ResetPassword`, formData);
  return res;
}
export const sendOTP = (username) => {
  return axios.post(`${API_BASE_URL}/Account/SendOtp`, { username });
};
export const VerifyOtp = (otp) => {
  return axios.post(`${API_BASE_URL}/Account/VerifyOtp`, { otp });
};
export const ResetPassword = (newPassword) => {
  return axios.post('/api/Account/ResetPassword', {
    newPassword
  });
};

// Retrieves salary data for a given month and year.
export const viewSalaryData = (month, year) => {
  const res = axios.post(`https://salary-slip-backend.azurewebsites.net/api/retrieve_by_month`, {
    year: year,
    month: month
  })
  return res;
}

// Uploads a salary slip file.
export const uploadSalarySlip = (selectedFiles) => {
  const formData = new FormData();
  formData.append('file', selectedFiles);
  const res = axios.post(`https://salary-slip-backend.azurewebsites.net/api/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // This is automatically set when using FormData
    },
  });
  return res;
}

// Downloads a salary slip in PDF format.
export const downloadSalarySlip = (employeeId, month, year) => {
  const res = axios.post(`https://salary-slip-backend.azurewebsites.net/api/download_employee_details_viaPDF`, {
    year: year,
    month: month,
    employee_id: employeeId
  })
  return res;
}

// Downloads a salary slip via email.
export const downloadSalarySlipViaEmail = (employeeId, month, year) => {
  const res = axios.post(`https://salary-slip-backend.azurewebsites.net/api/download_employee_details_email`, {
    year: year,
    month: month,
    employee_id: employeeId
  })
  return res;
}

// Adds or updates a skill for an employee.
export const addUpdateSkill = (payload) => {
  const res = axios.post(`https://hrms-flask.azurewebsites.net/api/add-update-skills`, payload, {
    headers: {
      // "Accept":"application/json",
      // "Content-Type": "application/x-www-form-urlencoded", // Avoid "application/json"
    }
  });
  return res
};

// Gets the skills of an employee.
export const getSkillsForEmp = (employeeId) => {
  const res = axios.get(`https://hrms-flask.azurewebsites.net/api/employee-skills/${employeeId}`
  );
  return res;
}

// Gets the skills of all employees.
export const getSkillsForAllEmp = () => {
  const res = axios.get(`https://hrms-flask.azurewebsites.net/api/employees`
  );
  return res;
}

// Gets the documents of an employee.
export const getDocuments = (employeeId, docType) => {
  return axios.get(`https://hrms-flask.azurewebsites.net/api/get-document/${employeeId}/${docType}`, {
    responseType: "blob",
  });
};

// Deletes a document for an employee.
export const deleteDocument = (employeeId, docType) => {
  const res = axios.delete("https://hrms-flask.azurewebsites.net/api/delete-document", {
    // headers: { "Content-Type": "application/json" },
    withCredentials: true,
    params: { employeeId, docType }, // Sending as query params
  });
  return res;
};

// Gets the document status of an employee.
export const getDocStatus = (employeeId) => {
  const res = axios.get(`https://hrms-flask.azurewebsites.net/api/document-status/${employeeId}`,
  );
  return res;
};

// Gets the document records of all employees.
export const getEmpDocRecords = () => {
  const res = axios.get("https://hrms-flask.azurewebsites.net/api/all-employees",
  );
  return res;
};

// Updates the policy acknowledgment for an employee.
export const updatePolicyAcknowledgment = (employeeId, policyName) => {
  return axios.post('https://hrms-flask.azurewebsites.net/api/policy-acknowledgment', {
    employeeId,
    policyName,
    acknowledged: true
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true
  });
};

// Updates the warning count for an employee.
export const updateWarningCount = (employeeId) => {
  return axios.post('https://hrms-flask.azurewebsites.net/api/update-warning-count', {
    employeeId
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true
  });
};

// Gets the warning count of an employee.
export const getWarningCount = (employeeId) => {
  return axios.get(`https://hrms-flask.azurewebsites.net/api/warning-count/${employeeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true
  });
};

// Gets the complete employee details.
export const getCompleteEmployeeDetails = (employeeId) => {
  return axios.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    withCredentials: true
  });
};

// ==============================================================================================



// Assign multiple evaluators to an employee
export const assignEvaluators = (empId, evaluatorIds) => {
  return axios.post(`${API_BASE_URL}/HRFunctionality/AssignEvaluatorsToEmp`, {
    empId,
    evaluatorIds
  })
}


export const getAllEmployeeEvaluators = () => {
  return axios.get(`${API_BASE_URL}/HRFunctionality/GetAllEmployeeEvaluators`);
};

// DELETE evaluator mapping for an employee
export const deleteEvaluators = (empId) => {
  return axios.delete(`${API_BASE_URL}/HRFunctionality/DeleteEvaluators`, {
    data: { empId }  // `data` is required for DELETE body
  });
};



// Enhanced getAssignedEmployeesSkills to include assigned employees and grouped skills
export const getAssignedEmployeesSkills = () => {
  const res = axios.get(`${API_BASE_URL}/employees/skills`);
  return res;
};

// New API: Submit evaluator review for each skill
export const submitSkillReview = (payload) => {
  return axios.post(`${API_BASE_URL}/skills/review`, payload);
};

// New API: Submit evaluator review for each skill
export const submitSkillReviewBatch = (payload) => {
  return axios.post(`${API_BASE_URL}/reviews/submit-batch`, payload);
};

// New API: Add new skill to an employee
export const addNewSkill = (payload) => {
  return axios.post(`${API_BASE_URL}/skills/add`, payload);
};

// New API: Fetch review statuses for skills
export const getSkillReviewStatuses = (employeeId, evaluatorId) => {
  return axios.get(`${API_BASE_URL}/skills/review/status`, {
    params: { employeeId, evaluatorId }  // ✅ pass both
  });
};



// New API: Update review status for a skill
export const updateSkillReviewStatus = (payload) => {
  return axios.put(`${API_BASE_URL}/skills/review/status`, payload);
};


export const sendEvaluatorReminder = (empId, evaluatorIds) => {
  return axios.post(`${API_BASE_URL}/HRFunctionality/SendEvaluatorReminder`, { empId, evaluatorIds });
};



// ==================================================================

// 10.Get Employee List : Retrieves a list of all employees.
// export const getEmployeeList = () => {
//   const res = axios.get(`${API_BASE_URL}/HRFunctionality/GetAllEmployees`)
//   return res
// }

// 10.Get Employee List : Retrieves a list of all employees.
export const getEmployeeList = () => {
  const res = axios.get(`https://hrms.flairminds.com/api/HRFunctionality/GetAllEmployees`)
  return res
}

export const getEmployeeListForEvaluators = (EvaluatorId) => {
  const res = axios.get(`${API_BASE_URL}/HRFunctionality/GetAllEmployeesForEvaluators/${EvaluatorId}`)
  return res
}

export const createGoal = (payload) => {
  return axiosInstance.post(`${API_BASE_URL}/goals`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

export const getEmployeeGoals = (employeeId) => {
  return axiosInstance.get(`${API_BASE_URL}/goals/employee/${employeeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

export const updateGoal = (goalId, payload) => {
  return axiosInstance.put(`${API_BASE_URL}/goals/${goalId}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

export const deleteGoal = (goalId) => {
  return axiosInstance.delete(`${API_BASE_URL}/goals/${goalId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// =======================================================================================================================

// Get Assigned Capability Leads: Retrieves a list of all assigned capability leads
export const getAssignedCapabilityLeads = () => {
  return axios.get(`${API_BASE_URL}/assigned-capability-leads`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Create Assigned Capability Lead: Creates a new assigned capability lead
export const createAssignedCapabilityLead = (payload) => {
  return axios.post(`${API_BASE_URL}/assigned-capability-leads`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Update Assigned Capability Lead: Updates an existing assigned capability lead
export const updateAssignedCapabilityLead = (id, payload) => {
  return axios.put(`${API_BASE_URL}/assigned-capability-leads/${id}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Delete Assigned Capability Lead: Deletes an assigned capability lead
export const deleteAssignedCapabilityLead = (id) => {
  return axios.delete(`${API_BASE_URL}/assigned-capability-leads/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Get Capability Leads: Fetches all capability development leads
export const getCapabilityLeads = () => {
  return axios.get(`${API_BASE_URL}/capability-leads`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Create Capability Lead: Adds a new capability development lead
export const createCapabilityLead = (leadData) => {
  return axios.post(`${API_BASE_URL}/capability-leads`, leadData, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};


// // Update Capability Lead: Updates an existing capability development lead
// export const updateCapabilityLead = (id, leadData) => {
//   return axios.put(`${API_BASE_URL}/capability-leads/${id}`, leadData, {
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json',
//     },
//   });
// };

// Delete Capability Lead: Deletes a capability development lead
export const deleteCapabilityLead = (id) => {
  return axios.delete(`${API_BASE_URL}/capability-leads/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};


// ==============================================================================================





// Fetch employee details for relieving letter dropdown
export const getEmployeeDetailsForRelievingLetter = () => {
  return axios.get(`${API_BASE_URL}/employeeDetailsForRelievingLetter`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Fetch all relieving letters for HR
export const getHrRelievingLetters = () => {
  return axios.get(`${API_BASE_URL}/hrRelievingLetters`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Fetch all generated relieving letters
export const getRelievingLetters = () => {
  return axios.get(`${API_BASE_URL}/relieving-letters`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Create a new relieving letter
export const createRelievingLetter = (letterData) => {
  return axios.post(`${API_BASE_URL}/create-relieving-letter`, letterData, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Update an existing relieving letter
export const updateRelievingLetter = (letterId, letterData) => {
  return axios.put(`${API_BASE_URL}/relievingLetter/${letterId}`, letterData, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Send relieving letter email
export const sendRelievingLetterEmail = (letterId) => {
  return axios.post(`${API_BASE_URL}/sendRelievingLetterEmail/${letterId}`, {}, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};



// Download a relieving letter PDF
export const downloadRelievingLetter = (id) => {
  return axios.get(`${API_BASE_URL}/download-relieving-letter/${id}`, {
    responseType: 'blob',
    headers: {
      'Accept': 'application/pdf',
    },
  });
};

// Get all PCs
export const getAllPCs = () => {
  const res = axios.get(`${API_BASE_URL}/PCs`);
  return res;
};

//Update PC
export const updatePC = (pcId, pcData) => {
  const res = axios.put(`${API_BASE_URL}/PCs`, pcData);
  return res;
};

//  Delete PC
export const deletePC = (pcId) => {
  const res = axios.delete(`${API_BASE_URL}/PCs/${pcId}`);
  return res;
};

//handle edit
export const handleEdit = (pcId) => {
  const res = axios.delete(`${API_BASE_URL}/PCs}`);
  return res;
};


//  Fetch all assignments
export const fetchAssignments = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/Assignments`);
    return res.data;
  } catch (err) {
    console.error("Error fetching assignments:", err);
    throw err;
  }
};

//  Add a new assignment
export const addAssignment = async (assignmentData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/Assignments`, assignmentData);
    return res.data;
  } catch (err) {
    console.error("Error adding assignment:", err);
    throw err;
  }
};

// Update an assignment
export const updateAssignment = async (assignmentID, assignmentData) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/api/Assignments/${assignmentID}`, assignmentData);
    return res.data;
  } catch (err) {
    console.error("Error updating assignment:", err);
    throw err;
  }
};

//  Delete an assignment
export const deleteAssignment = async (assignmentID) => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/api/Assignments/${assignmentID}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting assignment:", err);
    throw err;
  }
};


export default axiosInstance;
