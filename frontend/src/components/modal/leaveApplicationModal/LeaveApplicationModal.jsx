import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, DatePicker, Input, message, TimePicker, Tooltip } from 'antd';
import stylesLeaveApplication from "./LeaveApplicationModal.module.css";
import { getLeaveCards, getLeaveDetails, getTypeApprover, holidayListData, insertLeaveTransaction } from '../../../services/api';
import { CompOff } from '../../compOff/CompOff';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ToastContainer, toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import GreenEllipse from '../../../assets/profile/GreenEllipse.svg';
import RedDot from "../../../assets/profile/redDotImg.png"
import LEAVE_CONDITIONS from '../../../util/leaveConditions';


dayjs.extend(customParseFormat);

export const LeaveApplicationModal = ({ setLeaveCardData, leaveCardData, leaveDates, holidayData,
  selectedLeave, setSelectedLeave, selectedStatus, setSelectedStatus,
  employeeData, setEmployeeData, loadingLeaveTable, setLoadingLeaveTable,
  setLeaveApplicationModal, isSetLeaveApplicationModal, preSelectedLeaveType, leaveObj, formattedLeaveData,
  setRefreshTrigger }) => {

  const { user } = useAuth();
  const employeeId = user?.employeeId;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [leaveDuration, setLeaveDuration] = useState(null);
  const [leaveType, setLeaveType] = useState(null);
  const [workedDate, setWorkedDate] = useState(null);
  const [workingLateReason, setWorkingLateReason] = useState("");
  const [leaveOptions, setLeaveOptions] = useState({ leaveTypes: [], approver: '', approverId: '' });
  const [leaveDays, setLeaveDays] = useState(0);
  const [comments, setComments] = useState('');
  const [handOverComments, setHandOverComments] = useState('');
  const [fromTime, setFromTime] = useState(null);
  const [toTime, setToTime] = useState(null);
  const [error, setError] = useState(null);
  const [errorMissedDoorEntry, setErrorMissedDoorEntry] = useState(false)
  const [showAlert, setShowAlert] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [compOffTransactions, setCompOffTransactions] = useState([]);
  const [alertLeaveType, setAlertLeaveType] = useState(null);
  const [loader, setLoader] = useState(false)
  const [alertMissedDoorCount, setAlertMissedDoorCount] = useState(false)
  const [isValidDescription, setIsValidDescription] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const leaveCardDetails = async () => {
    try {
      if (!employeeId) return;
      const res = await getLeaveCards(employeeId);
      if (res.data) {
        // Map backend snake_case to frontend camelCase
        const mappedData = res.data.map(item => ({
          ...item,
          totalAllotedLeaves: item.total_alloted_leaves,
          totalUsedLeaves: item.total_used_leaves,
          leaveCardsFlag: item.leave_cards_flag,
          leaveName: item.leave_name
        }));
        setLeaveCardData(mappedData);
      }
    } catch (err) {
      console.error('Error fetching leave card data:', err);
      toast.error('Failed to fetch leave card data');
    }
  };



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

  const handleFormSubmit = (data) => {
    const transactions = data.map(item => ({
      compOffDate: new Date(item.date),
      numberOfHours: item.hours
    }));

    const total = data.reduce((acc, item) => acc + item.hours, 0);
    setTotalHours(total);
    setCompOffTransactions(transactions)
  }

  const handleOk = async () => {
    try {
      setLoader(true)

      const payload = {
        employeeId: employeeId,
        comments: comments,
        duration: leaveDuration,
        leaveType: leaveType,
        fromDate: startDate.format('YYYY-MM-DD'),
        toDate: endDate.format('YYYY-MM-DD'),
        handOverComments,
        noOfDays: leaveDays,
        approvedBy: leaveOptions.approverId,
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

      if (leaveType === 'Customer Approved Comp-off') {
        payload.compOffTransactions = compOffTransactions.map(transaction => ({
          compOffDate: dayjs(transaction.compOffDate).format('YYYY-MM-DD'),
          numberOfHours: transaction.numberOfHours,
        }));
      } else if (leaveType === 'Customer Holiday') {
        payload.cutsomerHolidays = {
          workedDate: workedDate.format('YYYY-MM-DD')
        };
      } else if (leaveType === 'Working Late Today') {
        payload.workingLates = {
          fromtime: fromTime.format('HH:mm:ss'),
          totime: toTime.format('HH:mm:ss'),
          reasonforworkinglate: workingLateReason
        };
      }

      const res = await insertLeaveTransaction(payload);

      if (res.status === 200) {
        toast.success(res.data || "Leave applied successfully");

        // Only close and reset on success
        setLeaveApplicationModal(false);

        // Reset fields
        setStartDate(null);
        setEndDate(null);
        setLeaveDuration(null);
        setLeaveType(null);
        setWorkedDate(null);
        setWorkingLateReason("");
        setLeaveDays(0);
        setHandOverComments('');
        setFromTime(null);
        setToTime(null);
        setComments('');
        setAlertMissedDoorCount(false);

        // Refresh data
        if (setRefreshTrigger) {
          console.log('Calling setRefreshTrigger to increment refresh counter');
          setRefreshTrigger(prev => {
            console.log('Current refreshTrigger:', prev, '-> New:', prev + 1);
            return prev + 1;
          });
        } else {
          console.warn('setRefreshTrigger is not available!');
        }
        leaveCardDetails();
      } else {
        // Handle non-200 but not caught by Axios catch (if any)
        toast.info(res.data.Message);
      }
      setLeaveApplicationModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.Message || error.message || 'An unexpected error occurred';
      toast.error(errorMsg);
    } finally {
      setLoader(false);
    }
  };


  const handleLeaveTypeChange = (value) => {
    // setAlertMissedDoorCount(false)
    if (value === "Missed Door Entry") {
      setLeaveDuration("Full Day")
      setAlertMissedDoorCount(true)
    }
    if (value != "Missed Door Entry") {
      setAlertMissedDoorCount(false)
    }
    const selectedLeave = leaveObj.find(leave => leave.leaveName === value);
    if (selectedLeave) {
      if ((selectedLeave.totalAllotedLeaves - selectedLeave.totalUsedLeaves) <= 0) {
        if (['Sick/Emergency Leave'].includes(value)) {
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
    if (leaveType === "Missed Door Entry") {
      setLeaveDays(1);
      setStartDate(date);
      setEndDate(date);
    }
  };

  const cellRender = (current, info) => {
    const style = {};
    const formattedDate = current.format('YYYY-MM-DD');
    const leaveType = leaveDates ? leaveDates[formattedDate] : undefined;

    const isHoliday = holidayData.some(
      holiday => dayjs(holiday.holiday_date, 'DD-MM-YYYY').format('YYYY-MM-DD') === formattedDate
    );
    const holidayName = isHoliday ? holidayData.find(
      holiday => dayjs(holiday.holiday_date, 'DD-MM-YYYY').format('YYYY-MM-DD') === formattedDate
    ).holiday_name : null;

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
          ) : leaveType ? (
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

  const calculateLeaveDays = (start, end) => {
    if (!start || !end) {
      setLeaveDays(0);
      return;
    }

    // const holidayList = holidays.map((date) => {
    //   return parseDate(date).toDateString();
    // });


    const holidayList = holidayData.map(holiday => {
      return (new Date(holiday.holiday_date)).toDateString();
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
        const response = await getTypeApprover();
        if (response.data) {
          setLeaveOptions({
            leaveTypes: response.data?.leave_types?.map((type, index) => ({
              key: `${type.name}-${index}`,
              value: type.name,
              label: type.name
            })),
            approver: response.data.approver_name,
            approverId: response.data.approver_id
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
    // All date validations removed - backend will handle
    return false;
  };



  const disableDatesForPrivilegeLeaveEnd = (current, type, startDate) => {
    // All date validations removed - backend will handle
    return false;
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
        // For Missed Door Entry: need leave type, duration (Full Day), start date, and comments
        return leaveType && leaveDuration && startDate && comments && handOverComments;
      }
      else {
        return leaveType && leaveDuration && startDate && endDate && leaveDays > 0 && comments && handOverComments;
      }
    } catch (error) {
      console.log("The errror is ---> ", error)
    }
  };

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
          <div className={stylesLeaveApplication.typeofLeaveDiv}>
            {/* <span className={stylesLeaveApplication.heading}>Select type of leave*</span> */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Select
                style={{ width: '45%' }}
                onChange={handleLeaveTypeChange}
                options={preSelectedLeaveType ? [{ value: preSelectedLeaveType, label: preSelectedLeaveType }] : leaveOptions.leaveTypes}
                placeholder="Type of Leave"
                value={leaveType}
                disabled={!!preSelectedLeaveType}
              />
              <Select
                style={{ width: '45%' }}
                onChange={handleDurationChange}
                options={durationOptions}
                placeholder="Leave Duration"
                disabled={leaveType === 'Working Late Today' || (leaveType === 'Missed Door Entry')}
                value={leaveDuration}
              />
            </div>
            {LEAVE_CONDITIONS[leaveType] && (
              <div className={stylesLeaveApplication.leaveConditions}>
                <ul>
                  {LEAVE_CONDITIONS[leaveType].map((condition, index) => (
                    <li key={index}>{condition}</li>
                  ))}
                </ul>
              </div>
            )}
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
                disabled={leaveType === 'Working Late Today' || leaveDuration === 'Half Day' || leaveType === 'Customer Holiday' || (leaveType === 'Customer Approved Comp-off' && compOffTransactions.length === 0) || leaveType === "Missed Door Entry"}
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
            <span className={stylesLeaveApplication.heading}>Approver: {leaveOptions.approver}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
