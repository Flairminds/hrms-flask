import React, { useState, useEffect } from "react";

import {
  Button,
  Modal,
  Select,
  DatePicker,
  Input,
  message,
  Tooltip,
} from "antd";

import stylesLeaveApplication from "../leaveApplicationModal/LeaveApplicationModal.module.css";

import {
  getLeaveCardDetails,
  getLeaveDetails,
  getTypeApprover,
  holidayListData,
  insertLeaveTransaction,
} from "../../../services/api";

import { ToastContainer, toast } from "react-toastify";

import moment from "moment";

import { getCookie } from "../../../util/CookieSet";

import GreenEllipse from "../../../assets/profile/GreenEllipse.svg";

import RedDot from "../../../assets/profile/redDotImg.png";

export const LeaveModal = ({
  setLeaveCardData,
  leaveCardData,
  leaveDates,
  selectedLeave,
  setSelectedLeave,
  selectedStatus,
  setSelectedStatus,
  employeeData,
  setEmployeeData,
  loadingLeaveTable,
  setLoadingLeaveTable,
  setLeaveModalOpen,
  isLeaveModalOpen,
  leaveName,
  leaveObj,
}) => {


  
  const [approver, setApprover] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(null);

  const [endDate, setEndDate] = useState(null);

  const [leaveDuration, setLeaveDuration] = useState(null);

  const [leaveDays, setLeaveDays] = useState(0);

  const [comments, setComments] = useState("");

  const [handOverComments, setHandOverComments] = useState("");

  const [duration, setDuration] = useState(null);

  const [compOffTransactions, setCompOffTransactions] = useState([]);

  const [customerHolidays, setCustomerHolidays] = useState({
    workedDate: null,
  });

  const [workingLates, setWorkingLates] = useState({
    fromtime: null,
    totime: null,
    reasonforworkinglate: "",
  });

  const [loader, setLoader] = useState(false);

  const [apiHolidays, setApiHolidays] = useState([]);

  const leaveCardDetails = async () => {
    try {
      const employeeId = getCookie("employeeId");

      const res = await getLeaveCardDetails(employeeId);

      setLeaveCardData(res.data);
    } catch (err) {
      console.error("Error fetching leave card data:", err);

      toast.error("Failed to fetch leave card data");
    }
  };
  const year =2025;
  const fetchEmployeeData = async () => {
    const employeeId = getCookie("employeeId");

    if (employeeId) {
      try {
        const response = await getLeaveDetails(employeeId,year);

        setEmployeeData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch employee data:", error);
      } finally {
        setLoadingLeaveTable(false);
      }
    } else {
      setLoadingLeaveTable(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    const fetchApprover = async () => {
      setLoading(true);

      try {
        const employeeId = getCookie("employeeId");

        const response = await getTypeApprover(employeeId);

        if (response.status === 200) {
          fetchEmployeeData();
        }

        setApprover(response.data.approver);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching approver:", error);

        setError(error.message || "Error fetching data");

        setLoading(false);
      }
    };

    fetchApprover();
  }, []);

  const handleOk = async () => {
    fetchEmployeeData();

    const employeeId = getCookie("employeeId");

    let leaveType;
   
    console.log(leaveName,"levaeName");
    
    if (leaveName === "Sick/Emergency Leave") {
      leaveType = 1;
    } else if (leaveName === "Privilege Leave") {
      leaveType = 2;
    } else if (leaveName === "Work From Home") {
      leaveType = 3;
    }else if(leaveName === "Missed Door Entry"){
      leaveType= 14;
    }

   
    

    const adjustDateByOneDay = (date) => {
      if (date) {
        return date.clone().add(1, "days").toISOString();
      }

      return "";
    };

    if (leaveType === 3 && leaveDays > 5) {
      toast.error("You cannot apply for more than 5 days of Work From Home.");

      return;
    }

    if (
      leaveType === 3 &&
          startDate && startDate.format('dddd') === "Monday" 
          // endDate && endDate.format('dddd') === "Monday"
        ) {      
          toast.error("You cannot apply for Work From Home on Monday.");
          resetFields();
          setLeaveModalOpen(false);
          return
        }

    const payload = {
      employeeId: employeeId,

      comments: comments,

      leaveType: leaveType,

      duration: leaveDuration,

      fromDate: adjustDateByOneDay(startDate),

      toDate: adjustDateByOneDay(endDate),

      handOverComments: handOverComments,

      noOfDays: leaveDays,

      approvedBy: approver,

      appliedBy: employeeId,

      compOffTransactions: compOffTransactions,

      customerHolidays: customerHolidays,

      workingLates: workingLates,
    };

    setLoader(true);

    try {
      const res = await insertLeaveTransaction(payload);

      if (res.status === 200 || res.status === 500) {
        leaveCardDetails();
      }

      setLeaveModalOpen(false);

      toast.success(res.data);

      resetFields();
    } catch (error) {
      console.error("Error inserting leave transaction:", error);

      toast.error(error.response?.data || "Error occurred");

      resetFields();

      setLeaveModalOpen(false);

      leaveCardDetails();
    } finally {
      await fetchEmployeeData();

      setLoader(false);
    }
  };

  const handleCancel = () => {
    resetFields();

    setLeaveModalOpen(false);
  };

  const resetFields = () => {
    setStartDate(null);

    setEndDate(null);

    setHandOverComments("");

    setLeaveDays(0);

    setComments("");

    setDuration(null);

    setCompOffTransactions([]);

    setCustomerHolidays({ workedDate: null });

    setWorkingLates({ fromtime: null, totime: null, reasonforworkinglate: "" });
  };

  const handleLeaveTypeChange = (value) => {
    setStartDate(null);

    setEndDate(null);
  };

  const handleDurationChange = (value) => {
    setLeaveDays(0);

    setLeaveDuration(value);

    setStartDate(null);

    setEndDate(null);

    if (value === "Half Day") {
      setEndDate(startDate);

      setLeaveDays(0.5);
    } else {
      setEndDate(null);
    }
  };

  const handleStartDateChange = (date) => {
    if (date) {
      const localDate = date.clone().startOf("day");

      setStartDate(localDate);

      calculateLeaveDays(localDate, endDate);

      if (leaveDuration === "Half Day") {
        setEndDate(localDate);

        setLeaveDays(0.5);
      }

      const today = moment().startOf("day");

      const selectedDate = date.toDate();

      if (
        selectedDate &&
        Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24)) === 7
      ) {
        // message.info("Please note: Privileged leave applications must be submitted at least 7 days in advance.");
      }
    } else {
      setStartDate(null);
    }
  };

  const cellRender = (current, info) => {
    const style = {};

    const formattedDate = current?.format("YYYY-MM-DD");
    console.log(formattedDate,"ff");
    

    const leaveType = leaveDates ? leaveDates[formattedDate] : undefined;
 // Get leave type for the current date

    // Check if the current date is a holiday by matching it with the holiday list from API

    const isHoliday = apiHolidays.some(
      (holiday) =>
        moment(holiday.holidayDate, "DD-MM-YYYY").format("YYYY-MM-DD") ===
        formattedDate
    );

    // If the current date is a holiday, find the holiday name

    const holidayName = isHoliday
      ? apiHolidays.find(
          (holiday) =>
            moment(holiday.holidayDate, "DD-MM-YYYY").format("YYYY-MM-DD") ===
            formattedDate
        ).holidayName
      : null;

    // Logging the holiday name for debugging

   

    // Check if the calendar cell is for a date and render accordingly

    if (info && info.type === "date") {
      return (
        <>
          {isHoliday ? (
            <Tooltip title={holidayName}>
              <div className="ant-picker-cell-inner" style={style}>
                {current.date()}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  {/* Render red dot for holidays */}

                  <img
                    src={RedDot}
                    alt="Holiday"
                    style={{ height: "10%", width: "10%" }}
                  />
                </div>
              </div>
            </Tooltip>
          ) : leaveType ? (
            <Tooltip title={leaveType}>
              <div className="ant-picker-cell-inner" style={style}>
                {current.date()}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  {/* Render green ellipse for leave days */}

                  <img
                    src={GreenEllipse}
                    alt="Leave Present"
                    style={{ height: "20%", width: "20%" }}
                  />
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="ant-picker-cell-inner" style={style}>
              {current.date()}

              <div
                style={{
                  visibility: "hidden",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {/* Hidden image for non-leave days */}

                <img
                  src={GreenEllipse}
                  alt="No Leave"
                  style={{ height: "30%", width: "30%" }}
                />
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  const handleEndDateChange = (date) => {
    if (date) {
      const localDate = date.clone().startOf("day"); // Set time to start of the day in local time zone

      setEndDate(localDate);

      calculateLeaveDays(startDate, localDate);
    } else {
      setEndDate(null);
    }
  };

  const getHolidayListApi = async () => {
    const res = await holidayListData();

    setApiHolidays(res.data);
  };

  useEffect(() => {
    getHolidayListApi();
  }, []);

  const calculateLeaveDays = (start, end) => {
    if (!start || !end) {
      setLeaveDays(0);

      return;
    }

    const holidayList = apiHolidays.map((holiday) => {
      const [day, month, year] = holiday.holidayDate.split("-");

      const formattedDate = new Date(`${year}-${month}-${day}`);

      return formattedDate.toDateString();
    });

    let count = 0;

    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();

      const currentDateString = currentDate.toDateString();

      if (
        dayOfWeek !== 0 &&
        dayOfWeek !== 6 &&
        !holidayList.includes(currentDateString)
      ) {
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setLeaveDays(count);
  };

  const disableDatesForPrivilegeLeave = (current) => {
    if (!current) return false;

    const today = new Date();

    const diffDays = Math.ceil(
      (current.toDate() - today) / (1000 * 60 * 60 * 24)
    );

    return leaveName === "Privilege Leave" && diffDays < 7;
  };

  const isDateDisabled = (current, type, startDate) => {
    if (!current) return false; // Ensure current is valid
  
    const today = moment(); // Use moment for consistent date operations
    const currentTime = moment(); // Current time
    const cutoffTime = moment().set({ hour: 9, minute: 30, second: 0 });
    const cutoffTimeHalfDay = moment().set({ hour: 11, minute: 59, second: 59 });
    console.log("Current Time:", today);


    // Common logic: Disable dates before startDate
    if (startDate && current.isBefore(startDate, "day")) {
      return true;
    }
  
    // Type-specific logic
    if (
      //  (
        type === "Work From Home" 
        // || type === "Sick/Emergency Leave") 
        && leaveDuration ==="Full Day") {
      // Disable today's date if it's past 9:30 AM
      if (current.isSame(today, "day") && currentTime.isAfter(cutoffTime)) {
        return true;
      }
      // Disable past dates
      return current.isBefore(today, "day");
    }

    if (
      // (
        type === "Work From Home" 
      // || type === "Sick/Emergency Leave") 
      && leaveDuration ==="Half Day") {
      // Disable today's date if it's past 9:30 AM
      if (current.isSame(today, "day") && currentTime.isAfter(cutoffTimeHalfDay)) {
        return true;
      }
      // Disable past dates
      return current.isBefore(today, "day");
    }
  
    if (type === "Privilege Leave") {
      const diffDays = current.diff(today, "days");
      return diffDays < 6; // Disable dates less than 7 days from today
    }
  
    return false; // Allow all other dates
  };
  

  const leaveOptions = [{ value: leaveName, label: leaveName }];

  

  const durationOptions = [
    { value: "Full Day", label: "Full Day" },

    { value: "Half Day", label: "Half Day" },
  ];

  const isFormValid = () => {
    return (
      leaveName &&
      startDate &&
      (leaveDuration === "Half Day" || endDate) &&
      comments &&
      handOverComments
    );
  };

  <DatePicker
  style={{ width: "100%" }}
  allowClear
  placeholder="End Date"
  onChange={handleEndDateChange}
  value={endDate}
  disabled={leaveDuration === "Half Day"}
  disabledDate={(current) => 
    isDateDisabled(current, leaveName, startDate)
  }
  cellRender={cellRender}
/>

// Combined logic for disabledDate
// const isDateDisabled = (current, type, startDate) => {
//   console.log(type,"type");
  
//   // Ensure `current` is a valid moment object
//   if (!current) return false;

//   // Work From Home date disabling logic
//   if (type === "Work From Home") {
//     console.log("Work From Home check", current, type, startDate);
//     try {
//       if (startDate && current && current.isBefore(startDate, "day")) {
//         return true;
//       }

//       if (!current) return false;

//       const today = new Date();

//       const diffDays = Math.ceil(
//         (current.toDate() - today) / (1000 * 60 * 60 * 24)
//       );

//       return type === "Work From Home" && diffDays < 1;
//     } catch (error) {
//       console.log("The error is ----> ", error);
//     }
//   }

//   // Privilege Leave end date logic
//   if (type === "Privilege Leave") {
//     console.log("type");
    
//     try {
//       if (startDate && current && current.isBefore(startDate, "day")) {
//         return true;
//       }

//       if (!current) return false;

//       const today = new Date();

//       const diffDays = Math.ceil(
//         (current.toDate() - today) / (1000 * 60 * 60 * 24)
//       );

//       return type === "Privilege Leave" && diffDays < 7;
//     } catch (error) {
//       console.log("The error is ----> ", error);
//     }
//   }

//   return false; // Allow all other dates
// };

  const disableDatesForPrivilegeLeaveEnd = (current, type, startDate) => {
    console.log("hi");
    
    try {
      if (startDate && current && current.isBefore(startDate, "day")) {
        return true;
      }

      if (!current) return false;

      const today = new Date();

      const diffDays = Math.ceil(
        (current.toDate() - today) / (1000 * 60 * 60 * 24)
      );

      return type === "Privilege Leave" && diffDays < 7;
    } catch (error) {
      console.log("The error is ----> ", error);
    }
  };

  return (
    <Modal
      centered
      visible={isLeaveModalOpen}
      title={
        <div className={stylesLeaveApplication.titleDiv}>
          <span className={stylesLeaveApplication.titleHeading}>
            Leave Form
          </span>
        </div>
      }
      onOk={handleOk}
      onCancel={handleCancel}
      width={"60%"}
      footer={[
        <div key="buttons" className={stylesLeaveApplication.btnDiv}>
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>

          <Button
            key="apply"
            className={stylesLeaveApplication.btnStyle}
            onClick={handleOk}
            loading={loader}
            disabled={!isFormValid()}
          >
            Apply
          </Button>
        </div>,
      ]}
    >
      <div className={stylesLeaveApplication.main}>
        {leaveObj.totalAllotedLeaves - leaveObj.totalUsedLeaves <= 0 && (
          <h3 className={stylesLeaveApplication.unpaidLeaveHeading}>
            *Since your leave balance is exhausted,{" "}
            {leaveName === "Work From Home"
              ? "You cannot apply for work from home"
              : "this leave will be considered as unpaid leave"}
            *
          </h3>
        )}

        <div className={stylesLeaveApplication.typeofLeaveDiv}>
          <span className={stylesLeaveApplication.heading}>
            Select type of leave*
          </span>

          <Select
            style={{ width: "100%" }}
            onChange={handleLeaveTypeChange}
            options={leaveOptions}
            placeholder={leaveName}
            disabled
          />

          <span className={stylesLeaveApplication.heading}>
            Select Leave Duration*
          </span>

          <Select
            style={{ width: "100%" }}
            onChange={handleDurationChange}
            options={durationOptions}
            placeholder="Leave Duration"
            value={leaveDuration}
          />
        </div>

        <div className={stylesLeaveApplication.datesContainer}>
          <div className={stylesLeaveApplication.dateDiv}>
            <span className={stylesLeaveApplication.heading}>Start Date*</span>

            <DatePicker
              style={{ width: "100%" }}
              allowClear
              placeholder="Start Date"
              onChange={handleStartDateChange}
              value={startDate}
              disabledDate={(current) => isDateDisabled(current, leaveName, null)}
              cellRender={cellRender}
            />
          </div>

          <div className={stylesLeaveApplication.dateDiv}>
            <span className={stylesLeaveApplication.heading}>End Date*</span>

            <DatePicker
              style={{ width: "100%" }}
              allowClear
              placeholder="End Date"
              onChange={handleEndDateChange}
              value={endDate}
              disabled={leaveDuration === "Half Day"}
              disabledDate={(current) =>
                isDateDisabled(current, leaveName, startDate)
              }
              cellRender={cellRender}
            />
          </div>

          <div className={stylesLeaveApplication.leaveDaysDiv}>
            <span className={stylesLeaveApplication.heading}>
              Number of Leave Days:
            </span>

            <span>{leaveDays}</span>
          </div>
        </div>

        <div className={stylesLeaveApplication.desDiv}>
          <span className={stylesLeaveApplication.heading}>
            Description/Notes/Comments*
          </span>

          <Input
            className={stylesLeaveApplication.inputDes}
            placeholder="Description"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className={stylesLeaveApplication.desDiv}>
          <span className={stylesLeaveApplication.heading}>
            Hand Over Comments*
          </span>

          <Input
            className={stylesLeaveApplication.inputDes}
            placeholder="Hand Over Comments"
            value={handOverComments}
            onChange={(e) => setHandOverComments(e.target.value)}
          />
        </div>

        <div className={stylesLeaveApplication.approverDiv}>
          <span className={stylesLeaveApplication.heading}>Approver</span>

          {loading ? (
            <Button className={stylesLeaveApplication.headingApprover} disabled>
              Loading...
            </Button>
          ) : error ? (
            <Button className={stylesLeaveApplication.headingApprover} disabled>
              Error: {error}
            </Button>
          ) : (
            <Button
              className={stylesLeaveApplication.headingApprover}
              disabled={!approver}
            >
              {approver}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
