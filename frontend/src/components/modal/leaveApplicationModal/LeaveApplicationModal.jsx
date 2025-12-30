import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, DatePicker, Input, message, TimePicker,Tooltip  } from 'antd';
import stylesLeaveApplication from "./LeaveApplicationModal.module.css";
import { getLeaveCardDetails, getLeaveDetails, getTypeApprover, holidayListData, insertLeaveTransaction } from '../../../services/api';
import { CompOff } from '../../compOff/CompOff';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ToastContainer, toast } from 'react-toastify';
import { holidays } from '../../../util/holidaysList';
import { getCookie } from '../../../util/CookieSet';
import GreenEllipse from '../../../assets/profile/GreenEllipse.svg';
import moment from 'moment';
import RedDot from "../../../assets/profile/redDotImg.png"


dayjs.extend(customParseFormat);
 
export const LeaveApplicationModal = ({ setLeaveCardData, leaveCardData, leaveDates, apiHolidays, setApiHolidays,
  selectedLeave, setSelectedLeave, selectedStatus, setSelectedStatus,
  employeeData, setEmployeeData, loadingLeaveTable, setLoadingLeaveTable,
  setLeaveApplicationModal, isSetLeaveApplicationModal, leave, leaveObj,formattedLeaveData}) => {

  const employeeId = getCookie('employeeId');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  console.log(endDate?.format('dddd') === "Monday","ss")
  
  const [leaveDuration, setLeaveDuration] = useState(null);
  const [leaveType, setLeaveType] = useState(null);
  const [workedDate, setWorkedDate] = useState(null);
  const [workingLateReason, setWorkingLateReason] = useState("");
  const [leaveOptions, setLeaveOptions] = useState({ leaveTypes: [], approver: '' });
  const [leaveDays, setLeaveDays] = useState(0);
  const [comments, setComments] = useState('');
  const [handOverComments, setHandOverComments] = useState('');
  const [fromTime, setFromTime] = useState(null);
  const [toTime, setToTime] = useState(null);
  const [error, setError] = useState(null);
  const[errorMissedDoorEntry,setErrorMissedDoorEntry]=useState(false)
  const [showAlert, setShowAlert] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [compOffTransactions, setCompOffTransactions] = useState([]);
  const [alertLeaveType, setAlertLeaveType] = useState(null);
  const[loader,setLoader]=useState(false)
  const[alertMissedDoorCount,setAlertMissedDoorCount]=useState(false)
  const [isValidDescription, setIsValidDescription] = useState(false);
  // const[apiHolidays,setApiHolidays] = useState([])
 

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
  const year =2025;
  const fetchEmployeeData = async () => {
    const employeeId = getCookie('employeeId');
    if (employeeId) {
      try {
        const response = await getLeaveDetails(employeeId,year);
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
 
  useEffect(() => {
    fetchEmployeeData();
  }, []);
 
 
  const handleCancel = () => {
    setLeaveApplicationModal(false);
    setStartDate(null)
    setEndDate(null)
    setLeaveDuration(null)
    setLeaveType(null)
    setWorkedDate(null)
    setWorkingLateReason("")
    setLeaveDays(0)
    setComments("")
    setHandOverComments('')
    setFromTime(null)
    setToTime(null)
    setShowAlert(false);
    setAlertMissedDoorCount(false)
    setCompOffTransactions([])
  };
 
  const parseDate = dateStr => new Date(dateStr);
 
  let leaveTypeId;
  if (leaveType === 'Sick/Emergency Leave') leaveTypeId = 1;
  else if (leaveType === 'Privilege Leave') leaveTypeId = 2;
  else if (leaveType === 'Work From Home') leaveTypeId = 3;
  else if (leaveType === 'Customer Approved Comp-off') leaveTypeId = 4;
  else if (leaveType === 'Customer Approved Work From Home') leaveTypeId = 5;
  else if (leaveType === 'Customer Holiday') leaveTypeId = 6;
  else if (leaveType === 'Working Late Today') leaveTypeId = 7;
  else if (leaveType === 'Visiting Client Location') leaveTypeId = 8;
  else if (leaveType === "Missed Door Entry") leaveTypeId =14;
  
  const isHolidayWorkingHoursValid = (totalHours, leaveDuration) => {
    if (leaveDuration === 'Full Day') {
      return totalHours == 8;
    } else if (leaveDuration === 'Half Day') {
      return totalHours == 4;
    }
  };
  const handleFormSubmit = (data) => {
    const transactions = data.map(item => ({
      compOffDate: new Date(item.date),
      numberOfHours: item.hours
    }));
 
    const total = data.reduce((acc, item) => acc + item.hours, 0);
    setTotalHours(total);
    setCompOffTransactions(transactions)
  }
 
 
  const wfhBalance = leaveObj[2]?.totalAllotedLeaves - leaveObj[2]?.totalUsedLeaves

  const handleOk = async () => {
    // if (leaveTypeId === 4) {
    //   if ((leaveDuration === 'Full Day' && !isHolidayWorkingHoursValid(totalHours, leaveDuration)) ||
    //     (leaveDuration === 'Half Day' && !isHolidayWorkingHoursValid(totalHours, leaveDuration))) {
    //     toast.error(`The summation of holiday working hours must be at least ${leaveDuration === 'Full Day' ? 8 : 4} hours to apply for a ${leaveDuration.replace('_', ' ')} Comp-off leave.`);
    //     return;
    //   }
    // }
    if (leaveTypeId === 6 && workedDate && startDate && workedDate.isAfter(startDate)) {
      toast.error("Worked date should be earlier than the start date for a Customer Holiday.");
      return;
    }
    if (leaveTypeId === 3 && leaveDays > 5) {
      toast.error("You cannot apply for more than 5 days of Work From Home.");
      setLoader(false);
      setStartDate(null);
      setEndDate(null);
      setLeaveDuration(null);
      setLeaveType(null);
      setWorkedDate(null);
      setWorkingLateReason("");
      setLeaveDays(0);
      setComments("");
      setHandOverComments('');
      setFromTime(null);
      setToTime(null);
      setLeaveApplicationModal(false);
      setAlertMissedDoorCount(false);
      return;
    }

    

    if (
      leaveTypeId === 3 &&
      startDate && startDate.format('dddd') === "Monday" 
      // endDate && endDate.format('dddd') === "Monday"
    ) {      
      toast.error("You cannot apply for Work From Home on Monday.");
      setStartDate(null)
      setEndDate(null)
      setLeaveDuration(null)
      setLeaveType(null)
      setWorkedDate(null)
      setWorkingLateReason("")
      setLeaveDays(0)
      setComments("")
      setHandOverComments('')
      setFromTime(null)
      setToTime(null)
      setCompOffTransactions([])
      setLeaveApplicationModal(false);
      return
    }
    
      
    
    try {
      setLoader(true)
    const adjustDateByOneDay = (date) => {
  if (date) {
    return date.format('YYYY-MM-DD');
  }
  return '';
};

 
      const payload = {
        employeeId: employeeId,
        comments: comments,
        leaveType: leaveTypeId,
        duration: leaveDuration,
        fromDate: leaveTypeId === 4
  ? startDate.format('YYYY-MM-DD')
  : adjustDateByOneDay(startDate),

toDate: leaveTypeId === 4
  ? endDate.format('YYYY-MM-DD')
  : adjustDateByOneDay(endDate),
        handOverComments,
        noOfDays: leaveDays,
        approvedBy: leaveOptions.approver,
        appliedBy: employeeId,
        compOffTransactions: compOffTransactions,
        cutsomerHolidays: {
          workedDate: null
        },
        workingLates: {
          fromtime: null,
          totime: null,
          reasonforworkinglate: null,
        },
      };
 
      if (leaveTypeId === 4) {
        payload.compOffTransactions = compOffTransactions.map(transaction => ({
          compOffDate: dayjs(transaction.compOffDate).format('YYYY-MM-DD'),
          numberOfHours: transaction.numberOfHours,
        }));
      } else if (leaveTypeId === 6) {
        payload.cutsomerHolidays = {
          workedDate: workedDate.format('YYYY-MM-DD')
        };
      } else if (leaveTypeId === 7) {
        payload.workingLates = {
          fromtime: fromTime.format('HH:mm:ss'),
          totime: toTime.format('HH:mm:ss'),
          reasonforworkinglate: workingLateReason
        };
      }
 
      const res = await insertLeaveTransaction(payload);
      if (res.status === 200) {
        leaveCardDetails()
        setLeaveApplicationModal(false);
      }
      if (res.status === 500) {
        leaveCardDetails()
        setLeaveApplicationModal(false);
      }
 
     
      fetchEmployeeData();
      setStartDate(null);
      setEndDate(null);
      setLeaveDuration(null);
      setLeaveType(null);
      setWorkedDate(null);
      setWorkingLateReason("");
      setLeaveOptions((prevOptions) => ({
        ...prevOptions,
        leaveTypes: prevOptions.leaveTypes.map(type => ({ value: type.value, label: type.label }))
      }));
      setLeaveDays(0);
      setHandOverComments('');
      setFromTime(null);
      setToTime(null);
      setComments('');
      setLeaveApplicationModal(false);
        toast.success(res.data);
    } catch (error) {
      setLeaveApplicationModal(false);
      leaveCardDetails()
      fetchEmployeeData();
 
      
        toast.error(error.response.data);
      
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
      // setError(errorMessage);
    }finally {
      setLoader(false); 
       setStartDate(null)
      setEndDate(null)
      setLeaveDuration(null)
      setLeaveType(null)
      setWorkedDate(null)
      setWorkingLateReason("")
      setLeaveDays(0)
      setComments("")
      setHandOverComments('')
      setFromTime(null)
      setToTime(null)
      setLeaveApplicationModal(false);
      setAlertMissedDoorCount(false)
  }
  };
 
 
  const handleLeaveTypeChange = (value) => { 
    // setAlertMissedDoorCount(false)
    if(value === "Missed Door Entry"){
      setLeaveDuration("Full Day")
      setAlertMissedDoorCount(true)
    }
    if(value != "Missed Door Entry"){
      setAlertMissedDoorCount(false)
    }
    const selectedLeave = leaveObj.find(leave => leave.leaveName === value);
    if (selectedLeave) {
      if ((selectedLeave.totalAllotedLeaves - selectedLeave.totalUsedLeaves) <= 0) {
        if (['Sick/Emergency Leave', 'Privilege Leave'].includes(value)) {
          setShowAlert(true);
          setAlertLeaveType(value);
        }
      } else {
        setShowAlert(false);
        // setAlertMissedDoorCount(false)
        setAlertLeaveType(null);
      }
    } else {
      setShowAlert(false);
      // setAlertMissedDoorCount(false)
      setAlertLeaveType(null);
    }
    if (value !== alertLeaveType) {
      setAlertLeaveType(value);
    } else {
      setShowAlert(false);
      // setAlertMissedDoorCount(false)
      setAlertLeaveType(null);
    }
 
    setLeaveType(value);
    if (value === 'Working Late Today') {
      const today = dayjs().startOf('day');
      setStartDate(today);
      setEndDate(today);
    } else {
      setStartDate(null);
      setEndDate(null);
    }
    setLeaveDays(0);
  };
 
  const handleDurationChange = (value) => {
    setLeaveDuration(value);
    setLeaveDays(0);
    if (value === 'Full Day') {
      setEndDate(null);
      setStartDate(null);
    }
    if (value === 'Half Day') {
      setEndDate(startDate);
      setLeaveDays(0.5);
    }
  };
 
  const handleStartDateChange = (date) => {
    if (leaveType !== 'Working Late Today' && leaveType !== 'Customer Holiday') {
      setStartDate(date);
      calculateLeaveDays(date, endDate);
      if (leaveDuration === 'Half Day') {
        setEndDate(date);
        setLeaveDays(0.5);
      }
      const today = new Date();
      const selectedDate = date ? date.toDate() : null;
      if (selectedDate && Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24)) === 7) {
        // message.info("Please note: Privileged leave applications must be submitted at least 7 days in advance.");
      }
    } else if (leaveType === 'Customer Holiday') {
      setStartDate(date);
      setEndDate(date);
      if (leaveDuration == 'Half Day') {
        setLeaveDays(0.5);
      } else if (leaveDuration == 'Full Day') {
        setLeaveDays(1);
      }
    }
    
    // else if (leaveType !== 'Customer Approved Comp-off') {
    //   setStartDate(date);
    //   calculateLeaveDays(date, endDate);
    //   if (leaveDuration === 'Half Day') {
    //     setEndDate(date);
    //     setLeaveDays(0.5);
    //   }
    // }
    if(leaveType === "Missed Door Entry"){
      setLeaveDays(1);
      setStartDate(date);
      setEndDate(date);
    }
  };
 
  const cellRender = (current, info) => {
    const style = {};
    const formattedDate = current.format('YYYY-MM-DD');
    const leaveType = leaveDates ? leaveDates[formattedDate] : undefined;
  
    const isHoliday = apiHolidays.some(
      holiday => moment(holiday.holidayDate, 'DD-MM-YYYY').format('YYYY-MM-DD') === formattedDate
    );
    const holidayName = isHoliday ? apiHolidays.find(
      holiday => moment(holiday.holidayDate, 'DD-MM-YYYY').format('YYYY-MM-DD') === formattedDate
    ).holidayName : null;
  
    if (info && info.type === 'date') {
      return (
        <>
           {isHoliday ? (
          <Tooltip title={holidayName}>
            <div className="ant-picker-cell-inner" style={style}>
              {current.date()}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img src={RedDot} alt="Holiday" style={{ height: '10%', width: '10%' }} />
              </div>
            </div>
          </Tooltip>
        ) :leaveType ? (
            <Tooltip title={leaveType}>
              <div className="ant-picker-cell-inner" style={style}>
                {current.date()}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={GreenEllipse} alt="Leave Present" />
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="ant-picker-cell-inner" style={style}>
              {current.date()}
              <div style={{ visibility: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <img src={GreenEllipse} alt="No Leave" />
              </div>
            </div>
          )}
        </>
      );
    }
    return null;
  };

  const handleEndDateChange = (date) => {
    if (leaveType !== 'Working Late Today') {
      setEndDate(date);
      calculateLeaveDays(startDate, date);
    } if (leaveType == 'Customer Approved Comp-off') {
      setEndDate(date);
      calculateLeaveDays(startDate, date);
    }
  };

  const getHolidayListApi = async() =>{
    const res = await holidayListData();
    setApiHolidays(res.data)
  }
  useEffect(()=>{
    getHolidayListApi()
  },[])
 
  const calculateLeaveDays = (start, end) => {
    if (!start || !end) {
      setLeaveDays(0);
      return;
    }
    
    // const holidayList = holidays.map((date) => {
    //   return parseDate(date).toDateString();
    // });


    const holidayList = apiHolidays.map(holiday => {
      const [day, month, year] = holiday.holidayDate.split('-');
      const formattedDate = new Date(`${year}-${month}-${day}`);
      return formattedDate.toDateString();
    });
    
        let count = 0;
        let currentDate = new Date(start);
    
        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();
          const currentDateString = currentDate.toDateString();
    
          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayList.includes(currentDateString)) {
            count++;
          }
    
          currentDate.setDate(currentDate.getDate() + 1);
        }
        setLeaveDays(count);
      };
 
  useEffect(() => {
    const fetchLeaveOptions = async () => {
      try {
        const response = await getTypeApprover(employeeId);
        if (response.data.leaveTypes) {
          setLeaveOptions({
            leaveTypes: response.data.leaveTypes.map((type, index) => ({
              key: `${type}-${index}`,
              value: type,
              label: type
            })),
            approver: response.data.approver
          });
        }
      } catch (error) {
        console.log('Error fetching leave types:', error);
      }
    };
 
    fetchLeaveOptions();
  }, [employeeId]);
 
  const durationOptions = [
    { value: "Full Day", label: "Full Day" },
    { value: "Half Day", label: "Half Day" }
  ];
 
  const disableDateStart = (current, startDate) => {
    if (startDate > current) return false
    return true;
  }
 
  const disableDatesForPrivilegeLeave = (current) => {
    if (!current) return false;
    const today = new Date();
    const todayWFH = moment();
     const currentTime = moment();
    const cutoffTime = moment().set({ hour: 9, minute: 30, second: 0 });
    const cutoffTimeHalfDay = moment().set({ hour: 11, minute: 59, second: 59 });
    
    
    if (
      //  (
        leaveType === "Work From Home" 
      // || leaveType === "Sick/Emergency Leave") 
      && leaveDuration ==="Full Day") {

      
      // Disable today's date if it's past 9:30 AM
      if (current.isSame(todayWFH, "day") && currentTime.isAfter(cutoffTime)) {
        return true;
      }
      // Disable past dates
      return current.isBefore(todayWFH, "day"); 
    }

    if (
      // (
      leaveType === "Work From Home" 
      // || leaveType === "Sick/Emergency Leave") 
      && leaveDuration ==="Half Day") {
      
      // Disable today's date if it's past 9:30 AM
      if (current.isSame(todayWFH, "day") && currentTime.isAfter(cutoffTimeHalfDay)) {
        return true;
      }
      // Disable past dates
      return current.isBefore(todayWFH, "day"); 
    }
    if (leaveType === 'Privilege Leave') {
      const diffDays = Math.ceil((current.toDate() - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) return true;
    }
   
    if (leaveTypeId === 4) {
      const compOffDates = compOffTransactions.map(transaction => new Date(transaction.compOffDate));
      const threeMonthsFromCompOffDates = compOffDates.map(date => {
        const threeMonthsLater = new Date(date);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
        return threeMonthsLater;
      });
 
      const isAfterThreeMonths = threeMonthsFromCompOffDates.some(date => current.isAfter(date, 'day'));
      const isBeforeCompOffDates = compOffDates.some(date => current.isBefore(date, 'day'));
     
      return isAfterThreeMonths || isBeforeCompOffDates;
    }
 
    return false;
  };
 
 
  const disableDatesForPrivilegeLeaveEnd = (current, type, startDate) => {
    if (type === 'Customer Approved Comp-off') {
      let maxDate = null;
      const compOffDates = compOffTransactions.map(transaction => new Date(transaction.compOffDate));
     
      compOffDates.forEach(compOffDate => {
        const threeMonthsLater = new Date(compOffDate);
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
 
        if (!maxDate || threeMonthsLater > maxDate) {
          maxDate = threeMonthsLater;
        }
      });
 
      const isAfterMaxDate = maxDate ? current.isAfter(maxDate, 'day') : false;
      const isBeforeStartDate = startDate && current.isBefore(startDate, 'day');
      const isBeforeCompOffDates = compOffDates.some(date => current.isBefore(date, 'day'));
 
      return isAfterMaxDate || isBeforeStartDate || isBeforeCompOffDates;
    }
 
    if (startDate && current && current.isBefore(startDate, 'day')) {
      return true;
    }
   
    const today = new Date();
    const diffDays = Math.ceil((current.toDate() - today) / (1000 * 60 * 60 * 24));
    return type === 'Privilege Leave' && diffDays < 7;
  };
 
 
 
  const onChangeTimeFrom = (time, timeString) => {
    setFromTime(time);
  };
 
  const onChangeTimeTo = (time, timeString) => {
    setToTime(time);
  };
  const isFormValid = () => {
    try {
      if (leaveType === 'Customer Approved Comp-off') {
        const isCompOffValid = compOffTransactions.length > 0 &&
          compOffTransactions.every(transaction => transaction.compOffDate && transaction.numberOfHours > 0);
        return leaveType && leaveDuration && startDate && endDate && leaveDays > 0 && comments && handOverComments && leaveDuration && isCompOffValid;
      } else if (leaveType === 'Customer Holiday') {
        return leaveType && leaveDuration && startDate && endDate && leaveDays > 0 && comments && handOverComments && workedDate;
      } else if (leaveType === 'Working Late Today') {
        return leaveType &&
          fromTime &&
          toTime &&
          workingLateReason &&
          handOverComments &&
          comments;
      }
      else if (leaveType === 'Missed Door Entry') {
        return isValidDescription;
      }
       else {
        return leaveType && leaveDuration && startDate && endDate && leaveDays > 0 && comments && handOverComments;
      }
    } catch (error) {
      console.log("The errror is ---> ", error)
    }
 
  };
  const isLeaveExhausted = () => {
    if ((leaveTypeId === 1 || leaveTypeId === 2 || leaveTypeId === 3) && leave.totalAllotedLeaves - leave.totalUsedLeaves >= 0) {
      return true;
    }
  }
 
  return (
    <div>
      <Modal
        open={isSetLeaveApplicationModal}
        title={
          <div className={stylesLeaveApplication.titleDiv}>
            <span className={stylesLeaveApplication.titleHeading}>Leave Form</span>
          </div>
        }
        onOk={handleOk}
        centered
        onCancel={handleCancel}
        width={'60%'}
        closable={true}
        footer={[
          <div key="footer-buttons" className={stylesLeaveApplication.btnDiv}>
            <Button key="cancel-button" onClick={handleCancel}>
              Cancel
            </Button> 
            <Button key="apply-button" className={stylesLeaveApplication.btnStyle} onClick={handleOk} loading={loader}
              disabled={!isFormValid()}> 
              Apply
            </Button>
          </div>
        ]}
      >
        <div className={stylesLeaveApplication.main}>
          {showAlert && (
            <h3 className={stylesLeaveApplication.unpaidLeaveHeading}>
              *Since your leave balance is exhausted, {leaveType === 'Work From Home' ? 'You cannot apply for work from home' : 'this leave will be considered as unpaid leave'}*
            </h3>
          )}
          {alertMissedDoorCount && (
             <h3 className={stylesLeaveApplication.unpaidLeaveHeading}>
             Remaining missed door entries for this quarter is {3 - (formattedLeaveData?.[3]?.totalUsedLeaves || 0)}
           </h3>
          )}
          <div className={stylesLeaveApplication.typeofLeaveDiv}>
            <span className={stylesLeaveApplication.heading}>Select type of leave*</span>
            <Select
              style={{ width: '100%' }}
              onChange={handleLeaveTypeChange}
              options={leaveOptions.leaveTypes}
              placeholder="Select type of leave"
              value={leaveType}
            />
            <span className={stylesLeaveApplication.heading}>Select Leave Duration*</span>
            <Select
              style={{ width: '100%' }}
              onChange={handleDurationChange}
              options={durationOptions}
              placeholder="Leave Duration"
              disabled={leaveType === 'Working Late Today' || (leaveType === 'Missed Door Entry')}
              value={leaveDuration}
            />
          </div>
          <div className={stylesLeaveApplication.datesContainer}>
            <div className={stylesLeaveApplication.dateDiv}>
              <span className={stylesLeaveApplication.heading}>Start Date*</span>
              <DatePicker
                style={{ width: '100%' }}
                allowClear
                placeholder="Start Date"
                onChange={handleStartDateChange}
                value={startDate}
                disabled={leaveType === 'Working Late Today' || (leaveType === 'Customer Approved Comp-off' && compOffTransactions.length === 0)}
                disabledDate={disableDatesForPrivilegeLeave}
                cellRender={cellRender}
              />
            </div>
            <div className={stylesLeaveApplication.dateDiv}>
              <span className={stylesLeaveApplication.heading}>End Date*</span>
              <DatePicker
                style={{ width: '100%' }}
                allowClear
                placeholder="End Date"
                onChange={handleEndDateChange}
                value={endDate}
                disabledDate={(current) => disableDatesForPrivilegeLeaveEnd(current, leaveType, startDate)}
                disabled={leaveType === 'Working Late Today' || leaveDuration === 'Half Day' || leaveType === 'Customer Holiday' || (leaveType === 'Customer Approved Comp-off' && compOffTransactions.length === 0) || leaveType ==="Missed Door Entry"}
                cellRender={cellRender}
             />
            </div>
            <div className={stylesLeaveApplication.leaveDaysDiv}>
              <span className={stylesLeaveApplication.heading}>Number of Leave Days:</span>
              <span>{leaveDays}</span>
            </div>
            {leaveType === 'Working Late Today' && (
              <div className={stylesLeaveApplication.workingLateTimeDiv}>
                <div className={stylesLeaveApplication.fromTime}>
                  <span className={stylesLeaveApplication.heading}>From Time:*</span>
                  <TimePicker value={fromTime} format="HH:mm" showSecond={false} onChange={onChangeTimeFrom} />
                </div>
                <div className={stylesLeaveApplication.fromTime}>
                  <span className={stylesLeaveApplication.heading}>To Time:*</span>
                  <TimePicker value={toTime} format="HH:mm" showSecond={false} onChange={onChangeTimeTo} />
                </div>
              </div>
            )}
          </div>
 
          {leaveType === 'Working Late Today' && (
            <div className={stylesLeaveApplication.notesSection}>
              <p className={stylesLeaveApplication.heading} >Reason for Working Late*</p>
              <Input
                className={stylesLeaveApplication.inputReason}
                placeholder="Reason for working late"
                value={workingLateReason}
                onChange={(e) => setWorkingLateReason(e.target.value)}
              />
            </div>
          )}
          {leaveType === 'Customer Approved Comp-off' && (
            <div>
              <div><CompOff onSubmit={handleFormSubmit} /></div>
              <div className={stylesLeaveApplication.notesSection}>
                <span className={stylesLeaveApplication.heading}>Note for Applying for Comp-off:*</span>
                <ul className={stylesLeaveApplication.uL}>
                  <li>When applying full day comp off the logged time in zymmr for the day of compoff must be minimum of 8hrs</li>
                  <li>When applying half day comp off the logged time in zymmr for the day of compoff must be minimum of 4hrs</li>
                  <li>There must be approval from customer before applying compoff</li>
                </ul>
              </div>
            </div>
 
          )}
          {leaveType === 'Customer Holiday' && (
            <div className={stylesLeaveApplication.dateDiv}>
              <span className={stylesLeaveApplication.heading}>Worked Date*</span>
              <DatePicker
                style={{ width: '100%' }}
                allowClear
                placeholder="Worked Date"
                onChange={setWorkedDate}
                value={workedDate}
              />
            </div>
          )}
          <div className={stylesLeaveApplication.desDiv}>
            <span className={stylesLeaveApplication.heading}>Description/Notes/Comments*</span>
            <Input className={stylesLeaveApplication.inputDes}
              placeholder="Description"
              value={comments}
              onChange={(e) => {
                const value = e.target.value;
                setComments(value);
            
                // Check if the leave type is "Missed Door Entry" and if the description is valid
                if (leaveType === "Missed Door Entry") {
                  if (value.length >= 5) {
                    setIsValidDescription(true); 
                    setErrorMissedDoorEntry(""); 
                  } else {
                    setIsValidDescription(false); 
                    setErrorMissedDoorEntry("");
                  }
                } else {
                  setIsValidDescription(true); 
                  setErrorMissedDoorEntry(""); 
                }
              }}
              
            />
            {/* {leaveType === "Missed Door Entry" && !isValidDescription && (
                  <span className={stylesLeaveApplication.unpaidLeaveHeading}>
                    {errorMissedDoorEntry}
                  </span>
                )} */}
          </div>
          <div className={stylesLeaveApplication.desDiv}>
            <span className={stylesLeaveApplication.heading}>Hand Over Comments*</span>
            <Input
              className={stylesLeaveApplication.inputDes}
              placeholder="Hand Over Comments"
              value={handOverComments}
              onChange={(e) => setHandOverComments(e.target.value)}
            />
          </div>
          <div className={stylesLeaveApplication.approverDiv}>
            <span className={stylesLeaveApplication.heading}>Approver</span>
            <Button className={stylesLeaveApplication.headingApprover} disabled>{leaveOptions.approver}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
