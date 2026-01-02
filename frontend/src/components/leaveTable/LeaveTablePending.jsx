import React, { useState, useEffect } from "react";
import { Select, Empty } from "antd";
import styles from "./LeaveTable.module.css";
import { LeaveStatusPending } from "../modal/leaveStatusPending/LeaveStatusPending";
import { LeaveStatusApproved } from "../modal/leaveStatusApproved/LeaveStatusApproved";
import { getLeaveTransactionsByApprover } from "../../services/api";
// import {tableHeadersTM} from "../../util/leavetableData"
import { tableHeadersTM } from "../../util/leavetableData"
import { getCookie } from "../../util/CookieSet";
import { useAuth } from "../../context/AuthContext";
import { convertDate } from "../../util/helperFunctions";

const leaveStatusOptions = [
  // ... (rest of imports and leaveStatusOptions)
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Cancel", label: "Cancel" },
  { value: "Reject", label: "Reject" },
  { value: 'Partial Approved', label: 'Partial Approved' },
];

const leaveTypeMaster = {
  1: "Sick/Emergency Leave",
  2: "Privilege Leave",
  3: "Work From Home",
  4: "Customer Approved Comp-off",
  5: "Customer Approved Work From Home",
  6: "Customer Holiday",
  7: "Working Late Today",
  8: "Visiting Client Location",
  9: "Casual Leave",
  10: "Swap Leave",
  11: "Exempt Work From Home",
  12: "Unpaid Sick Leave",
  13: "Unpaid Privilege Leave",
  14: "Missed Door Entry"
};

const getLeaveTypeName = (id) => {

  return leaveTypeMaster[id] || "Unknown Leave Type";
};

export const LeaveTablePending = ({ isRole }) => {
  const { user } = useAuth();
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveStatus, setSelectedLeaveStatus] = useState(['Pending']);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [myEmployeeData, setMyEmployeeData] = useState([]);
  const [myEmployeeFilteredData, setMyEmployeeFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeNames, setEmployeeNames] = useState([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

  const yearRanges = ["2022-2023", "2023-2024", "2024-2025", "2025-2026"];
  const [selectedRange, setSelectedRange] = useState("2025");


  const handleChangeYear = (value) => {
    // setSelectedRange(value);

    // Extract the first year from the selected range
    const firstYear = value.split("-")[0];
    setSelectedRange(firstYear)
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (user.employeeId) {
        try {
          const response = await getLeaveTransactionsByApprover(user.employeeId, selectedRange);
          if (response.data) {
            // sort the data by from date (descending order)
            // date format from api is dd-mm-yyyy
            const sortedData = response.data.sort((a, b) => {
              let dateA = a.fromDate.split('-');
              dateA = new Date(dateA[2], dateA[1] - 1, dateA[0]);
              let dateB = b.fromDate.split('-');
              dateB = new Date(dateB[2], dateB[1] - 1, dateB[0]);
              // console.log(dateA, dateB);
              return dateB - dateA;
            });
            setMyEmployeeData(sortedData);
            const uniqueEmployeeNames = [...new Set(sortedData.map((emp) => emp.empName))];
            const employeeNamesOptions = uniqueEmployeeNames.map((emp) => {
              return {
                value: emp,
                label: emp
              }
            });
            setEmployeeNames(employeeNamesOptions);
          } else {
            setMyEmployeeData([]);
          }
          setLoading(false);
        } catch (error) {
          console.error('Failed to fetch employee data:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, [selectedRange, user.employeeId]);

  useEffect(() => {
    const filtered = myEmployeeData?.filter((emp) => {
      const statusMatch = selectedLeaveStatus.length > 0 ? selectedLeaveStatus.includes(emp.leaveStatus) : true;
      const nameMatch = selectedEmployeeName.length > 0 ? selectedEmployeeName.includes(emp.empName) : true;
      return statusMatch && nameMatch;
    });
    setMyEmployeeFilteredData(filtered);
  }, [myEmployeeData, selectedLeaveStatus, selectedEmployeeName]);

  const handlePendingStatus = (employee) => {
    setSelectedEmployee(employee);
    setLeaveModalOpen(true);
  };

  const handleStatusChange = (newStatus) => {
    setMyEmployeeData((prevData) =>
      prevData.map((emp) =>
        emp.LeaveTranId === selectedEmployee.leaveTranId
          ? { ...emp, LeaveStatus: newStatus }
          : emp
      )
    );
    setSelectedEmployee((prev) => ({ ...prev, leaveStatus: newStatus }));
  };
  const handleApprovedStatus = (employee) => {
    const transformedEmployee = {
      ...employee,
      leaveTypeName: getLeaveTypeName(employee.leaveType),
    };
    setSelectedEmployee(transformedEmployee);
    setLeaveModalOpen(true);
  };

  const handleLeaveStatusChange = (value) => {
    setSelectedLeaveStatus(value);
  };

  const handleEmployeeNameChange = (value) => {
    setSelectedEmployeeName(value);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "2.5rem 2rem 0 2rem" }} className={styles.main}>
      <div className={styles.leaveDiv} style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ display: "flex", width: "100%" }}>
          <h5 style={{ paddingTop: "10px", paddingRight: "5px" }} className={styles.heading}>Leave Status :</h5>
          <Select
            mode="multiple"
            placeholder="Search"
            onChange={handleLeaveStatusChange}
            style={{ width: '70%' }}
            options={leaveStatusOptions}
            value={selectedLeaveStatus}
          />
        </div>

        {/* filter by employee name also */}
        <div style={{ display: "flex", width: "100%" }}>
          <h5 style={{ paddingTop: "10px", paddingRight: "5px" }} className={styles.heading}>Employee Name :</h5>
          <Select
            placeholder="Search"
            onChange={handleEmployeeNameChange}
            style={{ width: '60%' }}
            options={employeeNames}
            value={selectedEmployeeName}
          />
        </div>

        <div style={{ display: "flex", width: "100%" }}>
          <h5 style={{ paddingTop: "10px", paddingRight: "5px" }} className={styles.heading}>Year :</h5>
          <Select
            value={selectedRange}
            onChange={handleChangeYear}
            placeholder="Select Year Range"
            style={{ width: '70%' }}
          >
            {yearRanges.map((range) => (
              <Option key={range} value={range}>
                {range}
              </Option>
            ))}
          </Select>
        </div>
      </div>
      <div
        style={{ maxHeight: "75vh", maxWidth: "178vh" }}
        className={styles.tableContainer}>
        <table className={styles.employeeTable}>
          <thead>
            <tr className={styles.tableHead}>
              {tableHeadersTM.map((header, index) => (
                <th key={index}>{header.displayName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myEmployeeFilteredData.map((employee, index) => (
              <tr key={index} onClick={() => {
                if ((employee['leaveStatus'] === "Pending") || (employee['leaveStatus'] === "Partial Approved")) {
                  handlePendingStatus(employee);
                } else if (employee['leaveStatus'] === "Approved" || employee['leaveStatus'] === "Reject") {
                  handleApprovedStatus(employee);
                }
              }}>
                {tableHeadersTM.map((header, subIndex) => (
                  <td key={subIndex}>
                    <div className={`${header.key === "leaveStatus" ? styles.rejectedLeave : ""}`}>
                      {header.key === "leaveType" ? getLeaveTypeName(employee[header.key]) : header.dataFormat === "date" ? convertDate(employee[header.key]) : employee[header.key]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {myEmployeeFilteredData.length === 0 && (
              <tr>
                <td colSpan={tableHeadersTM.length}>
                  <Empty description="No data available" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {
        selectedEmployee && (selectedEmployee.leaveStatus === "Partial Approved") && (user.role !== "Lead") && (
          <LeaveStatusPending
            setMyEmployeeData={setMyEmployeeData} setLoading={setLoading}
            isLeaveApprovalModalOpen={isLeaveModalOpen}
            setIsLeaveApprovalModalOpen={setLeaveModalOpen}
            employee={selectedEmployee}
            onStatusChange={handleStatusChange}
            selectedRange={selectedRange}
          />
        )
      }
      {selectedEmployee && (selectedEmployee.leaveStatus === "Pending") && (
        <LeaveStatusPending
          setMyEmployeeData={setMyEmployeeData} setLoading={setLoading}
          isLeaveApprovalModalOpen={isLeaveModalOpen}
          setIsLeaveApprovalModalOpen={setLeaveModalOpen}
          employee={selectedEmployee}
          onStatusChange={handleStatusChange}
          selectedRange={selectedRange}
        />
      )}
      {selectedEmployee && (selectedEmployee.leaveStatus === "Approved" || selectedEmployee.leaveStatus === "Reject" || (selectedEmployee.leaveStatus === "Partial Approved" && user.role === "Lead")) && (
        <LeaveStatusApproved
          isLeaveApprovalModalOpen={isLeaveModalOpen}
          setIsLeaveApprovalModalOpen={setLeaveModalOpen}
          employee={selectedEmployee}
          onStatusChange={handleStatusChange}
          selectedRange={selectedRange}
        />
      )}
    </div>
  );
};
