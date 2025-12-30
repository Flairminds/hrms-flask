import { Calendar, Empty, Select, theme, Modal, Button } from 'antd';
import React, { useState, useEffect } from 'react';
import styles from "./LeaveTable.module.css";
import { getLeaveDetails, cancelLeave, getLeaveCardDetails } from '../../services/api';
import { tableHeaders } from '../../util/leavetableData';
import { getCookie } from '../../util/CookieSet';

const leaveOptions = [
  { value: 'Sick/Emergency Leave', label: 'Sick/Emergency Leave' },
  { value: 'Work From Home', label: 'Work From Home' },
  { value: 'Privilege Leave', label: 'Privilege Leave' },
  { value: 'Customer Approved Comp-off', label: 'Customer Approved Comp-off' },
  { value: 'Customer Approved Work From Home', label: 'Customer Approved Work From Home' },
  { value: 'Working Late Today', label: 'Working Late Today' },
  { value: 'Visiting Client Location', label: 'Visiting Client Location' },
  { value: 'Casual Leave', label: 'Casual Leave' },
  { value: 'Swap Leave', label: 'Swap Leave' },
  { value: 'Exempt Work From Home', label: 'Exempt Work From Home' },
  { value: 'Customer Holiday', label: 'Customer Holiday' },
  {value:"Missed Door Entry", label:'Missed Door Entry'},
];

const leaveStatusOptions = [
  { value: 'Approved', label: 'Approved' },
  { value: 'Cancel', label: 'Cancel' },
  { value: 'Reject', label: 'Reject' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Partial Approved', label: 'Partial Approved' },
];
const { Option } = Select;
export const LeaveTable = ({ setLeaveCardData, leaveDates, apiHolidays,
  selectedLeave, setSelectedLeave, selectedStatus, setSelectedStatus,
  employeeData, setEmployeeData, loadingLeaveTable, setLoadingLeaveTable,setLeaveDates
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);
  const[loader,setLoader]=useState(false)
  const yearRanges = ["2022-2023", "2023-2024", "2024-2025", "2025-2026"];
  const [selectedRange, setSelectedRange] = useState("2025");


  const handleChangeYear = (value) => {
    // setSelectedRange(value);

    // Extract the first year from the selected range
    const firstYear = value.split("-")[0];
    setSelectedRange(firstYear)
  };




  const leaveCardDetails = async () => {
    try {
      const employeeId = getCookie('employeeId');
      const res = await getLeaveCardDetails(employeeId);
   
      
      setLeaveCardData(res.data);
    } catch (err) {
      console.error('Error fetching leave card data:', err);
      toast.error('Failed to fetch leave card data');
    }
  };


  useEffect(() => {
    const fetchEmployeeData = async () => {
      const employeeId = getCookie('employeeId');
      if (employeeId) {
        try {
          const response = await getLeaveDetails(employeeId, selectedRange);
          setEmployeeData(response.data.data);
        } catch (error) {
          console.error('Failed to fetch employee data:', error);
        } finally {
          setLoadingLeaveTable(false);
        }
      } else {
        setLoadingLeaveTable(false);
      }
    };
  
    fetchEmployeeData();
  }, [selectedRange]);
  

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits for month
    const day = String(date.getDate()).padStart(2, '0'); // Ensure 2 digits for day
    return `${year}-${month}-${day}`;
  };

  const formatHolidayDate = (dateString) => {
    const [day, month, year] = dateString.split('-');
    return `${year}-${month}-${day}`;
  };

  const generateDateRange = (fromDate, toDate) => {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const dates = [];
  const holidayDates = apiHolidays.map(holiday => formatHolidayDate(holiday.holidayDate));
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const formattedDate = formatDate(currentDate);
    const dayOfWeek = currentDate.getDay();

    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 6 && dayOfWeek !== 0 && !holidayDates.includes(formattedDate)) {
      dates.push(formattedDate);
    }

    currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
  }

  return dates;
};
  // Create leaveDates object
  const generateLeaveDates = () => {
    return employeeData?.reduce((acc, leave) => {
      if (leave.leaveStatus === "Cancel" || leave.leaveStatus === "Reject") {
        return acc;
      }

      const fromDate = formatDate(leave.fromDate);
      const toDate = formatDate(leave.toDate);

      // Generate date range and assign leaveName to all dates in the range
      const dateRange = generateDateRange(fromDate, toDate);
      
      
      dateRange.forEach((date) => {
        acc[date] = leave.leaveName;
      });

      return acc;
    }, {});
  };
  // console.log(generateLeaveDates,"genrate");
  
  // useEffect to set leaveDates on component mount
  useEffect(() => {
    const leaveDatesObj = generateLeaveDates();
    setLeaveDates(leaveDatesObj);
  }, [employeeData]);
  // setLeaveDates(leaveDates)

  const filteredEmployeeData = employeeData?.filter(emp =>
    (selectedLeave.length === 0 || selectedLeave.includes(emp.leaveName)) &&
    (selectedStatus.length === 0 || selectedStatus.includes(emp.leaveStatus))
  );
  
  
  const handleLeaveChange = (value) => {
    setSelectedLeave(value);
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
  };

  const { token } = theme.useToken();

  
  const handleCancelLeave = async () => {
    if (!leaveToCancel) return;

    const payload = {
      leaveTranId: leaveToCancel,
      leaveStatus: "Cancel"
    };
    
    setLoader(true)
    try {
      const response = await cancelLeave(leaveToCancel);
   
      if (response.status === 200) {
        leaveCardDetails()
        setEmployeeData(prevData => prevData.map(employee =>
          employee.leaveTranId === leaveToCancel ? { ...employee, leaveStatus: "Cancel" } : employee
        ));
      } else {
        console.error('Failed to cancel leave: Unexpected status code', response.status);
      }
    } catch (error) {
      console.error('Failed to cancel leave:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
    } finally {
      setIsModalVisible(false);
      setLeaveToCancel(null);
      setLoader(false)
    }
  };

  const showModal = (leaveTranId) => {
    setLeaveToCancel(leaveTranId);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setLeaveToCancel(null);
  };

  const handleRowClick = (employee) => {
    setSelectedLeaveDetails(employee);
  };

  const handleDetailModalCancel = () => {
    setSelectedLeaveDetails(null);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending':
        return styles.pendingLeaveBox;
      case 'Approved':
        return styles.approvedLeaveBox;
      case 'Cancel':
        return styles.canceledLeaveBox;
      case 'Reject':
        return styles.rejectedLeaveBox;
      case 'Partial Approved':
        return styles.partialApprovedLeaveBox;
      default:
        return '';
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.leaveDiv} style={{paddingBottom:"0.7rem"}}>
        <div className={styles.headingSelectDiv}>
            <h5  style={{paddingRight:"0.5rem", paddingTop:"0.3rem", paddingLeft:"2rem"}} className={styles.heading}>Leave Type :</h5>
            <Select
              mode="multiple"
              placeholder="Search"
              onChange={handleLeaveChange}
              style={{ width: '60%' }}
              options={leaveOptions}
            />
        </div>

        <div className={styles.headingSelectDiv}>
            <h5 style={{paddingRight:"0.5rem", paddingTop:"0.3rem"}} className={styles.heading}>Leave Status :</h5>
            <Select
              mode="multiple"
              placeholder="Search"
              onChange={handleStatusChange}
              style={{ width: '60%' }}
              options={leaveStatusOptions}
            />
        </div>

        <div className={styles.headingSelectDiv}>
            <h5 style={{paddingRight:"0.5rem", paddingTop:"0.3rem"}} className={styles.heading}>Year:</h5>
            <Select
              value={selectedRange}
              onChange={handleChangeYear}
              placeholder="Select Year Range"
              style={{ width: 200 }}
            >
              {yearRanges.map((range) => (
                <Option key={range} value={range}>
                  {range}
                </Option>
              ))}
            </Select>
        </div>
        
        
      </div>
      <div className={styles.tableContainer}>
        {loadingLeaveTable ? (
          <div>Loading...</div>
        ) : (
          <table className={styles.employeeTable}>
            <thead>
              <tr className={styles.tableHead}>
                {tableHeaders.map((header, index) => (
                  <th key={index}>{header.displayName}</th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
  {filteredEmployeeData && filteredEmployeeData.length > 0 ? (
    filteredEmployeeData.map((employee, index) => (
      <tr key={index} onClick={() => handleRowClick(employee)}>
        {tableHeaders?.map((header, subIndex) => (
          <td key={subIndex}>
            <div
              className={`${
                header.key === "leaveStatus"
                  ? employee[header.key] === "Pending"
                    ? styles.pendingLeave
                    : employee[header.key] === "Approved"
                    ? styles.approvedLeave
                    : employee[header.key] === "Cancel"
                    ? styles.canceledLeave
                    : employee[header.key] === "Reject"
                    ? styles.rejectedLeave
                    : employee[header.key] === "Partial Approved"
                    ? styles.partialApprovedLeave
                    : ""
                  : ""
              }`}
            >
              {employee[header.key]}
            </div>
          </td>
        ))}
        <td>
          <button
            className={`${styles.cancelButton} ${
              employee.leaveStatus !== "Pending" ? styles.disabledButton : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              showModal(employee.leaveTranId);
            }}
            disabled={employee.leaveStatus !== "Pending"}
          >
            Cancel
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={tableHeaders.length + 1}>
        <Empty description="No data available" />
      </td>
    </tr>
  )}
</tbody>

          </table>
        )}
      </div>
      <Modal
        //  title={
        //   <div className={styles.titleDiv}>
        //     <span className={styles.titleHeading}>Cancel Leave</span>
        //   </div>
        // }
        visible={isModalVisible}
        onOk={handleCancelLeave}
        onCancel={handleModalCancel}
        footer={[
          <div key="footer-buttons" className={styles.btnDiv}>
            <Button key="cancel-button" className={styles.Nobtn} onClick={handleModalCancel}>
              No
            </Button>
            <Button key="apply-button" className={styles.btnStyle} loading={loader} onClick={handleCancelLeave}>
              Yes
            </Button>
          </div>
        ]}
      >

        <h3>Are you sure you want to cancel this leave?</h3>
      </Modal>
      <Modal
        visible={!!selectedLeaveDetails}
        onCancel={handleDetailModalCancel}
        footer={null}
        centered
      >
        {selectedLeaveDetails && (
          <div className={styles.leaveDetails}>
            <h4 className={styles.leaveDetailsTitle}>Leave Details</h4>
            <div className={styles.leaveDetailsRow}>
              <strong>Employee Name:</strong>
              <span>{selectedLeaveDetails.empName}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Application Date:</strong>
              <span>{selectedLeaveDetails.applicationDate}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>From Date:</strong>
              <span>{selectedLeaveDetails.fromDate}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>To Date:</strong>
              <span>{selectedLeaveDetails.toDate}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Applied Leave Count:</strong>
              <span>{selectedLeaveDetails.appliedLeaveCount}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Approved By:</strong>
              <span>{selectedLeaveDetails.approvedBy}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Description:</strong>
              <span>{selectedLeaveDetails.description}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Duration:</strong>
              <span>{selectedLeaveDetails.duration}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Leave Name:</strong>
              <span>{selectedLeaveDetails.leaveName}</span>
            </div>
            <div className={styles.leaveDetailsRow}>
              <strong>Leave Status:</strong>
              <span className={getStatusClass(selectedLeaveDetails.leaveStatus)}>
                {selectedLeaveDetails.leaveStatus}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
