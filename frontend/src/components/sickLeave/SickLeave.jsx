import React, { useEffect, useState } from 'react';
import { Button, Select, DatePicker, Input } from 'antd';
import moment from 'moment';
import stylesSickLeave from './SickLeave.module.css';
import { getEmployeeList, getTypeApprover, insertLeaveTransaction } from '../../services/api';
import { holidays } from '../../util/holidaysList';
import { getCookie } from '../../util/CookieSet';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const durationOptions = [
  { value: 'half day', label: 'Half Day' },
  { value: 'Full Day', label: 'Full Day' },
  // other options
];

const parseDate = (dateString) => new Date(dateString);

const SickLeave = () => {
  const [activeTab, setActiveTab] = useState('sickLeave');
  const [leaveDuration, setLeaveDuration] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [leaveDays, setLeaveDays] = useState(0);
  const [approver, setApprover] = useState('');
  const [error, setError] = useState('');
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const fetchApprover = async () => {
      try {
        const employeeId = getCookie('employeeId');
        const response = await getTypeApprover(employeeId);
        setApprover(response.data.approver);
      } catch (error) {
        console.error('Error fetching approver:', error);
        setError(error.message || 'Error fetching data');
      }
    };

    fetchApprover();
  }, []);

  const handleEmployeeList = async () => {
    try {
      const response = await getEmployeeList();
      setEmployeeList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    handleEmployeeList();
  }, []);

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  const calculateLeaveDays = (start, end) => {
    if (!start || !end) {
      setLeaveDays(0);
      return;
    }

    const holidayList = holidays.map((date) => parseDate(date).toDateString());
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
    if (leaveDuration === 'half day' && startDate) {
      setEndDate(startDate);
      setLeaveDays(0.5);
    } else if (startDate && endDate) {
      calculateLeaveDays(parseDate(startDate), parseDate(endDate));
    }
  }, [startDate, endDate, leaveDuration]);

  const handleDurationChange = (value) => {
    setLeaveDuration(value);
    if (value === 'half day') {
      setEndDate(startDate);
      setLeaveDays(0.5);
    } else {
      setEndDate(null); // Reset endDate for full day
      setLeaveDays(0);  // Reset leaveDays initially
    }
  };

  const handleEmployeeSelect = (value) => {
    setSelectedEmployeeId(value);
    setStartDate(null);
    setEndDate(null);
  };

  const isFormValid = () => {
    return selectedEmployeeId && leaveDuration && startDate && (endDate || leaveDuration === 'half day') && reason;
  };

  const handleApply = async () => {
    setIsApplying(true);
    const payload = {
      employeeId: selectedEmployeeId,
      comments: reason,
      leaveType: 1,
      duration: leaveDuration,
      fromDate: startDate,
      toDate: endDate,
      handOverComments: '',
      noOfDays: leaveDays,
      approvedBy: approver,
      appliedBy: getCookie('employeeId'),
      compOffTransactions: [],
      cutsomerHolidays: {},
      workingLates: {}
    };

    try {
      const response = await insertLeaveTransaction(payload); 
      if(response.status === 200) {
        toast.success('Leave applied successfully!');
        
      }
      if(response.status === 500){
        toast.info("Your all leaves are applied as an Unpaid Leaves")
      }
      setLeaveDuration(null);
      setStartDate(null);
      setEndDate(null);
      setReason('');
      setLeaveDays(0);
      setSelectedEmployeeId(null);
    } catch (error) {
      if (error.response.status === 500) {
        toast.info("Your all leaves are applied as Unpaid Leaves");
      } else {
        toast.error('Failed to apply leave. Please try again.');
      }
      
      console.error('Error applying leave:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDateChange = (type, dateString) => {
    if (type === 'start') {
      if (startDate === dateString) {
        setStartDate(null);
      } else {
        setStartDate(dateString);
        if (leaveDuration === 'half day') {
          setEndDate(dateString);
        }
      }
    } else if (type === 'end') {
      if (endDate === dateString) {
        setEndDate(null);
      } else {
        setEndDate(dateString);
      }
    }
  };
  const handleEndChange=()=>{
    setEndDate(null)
  }

  const handleStartChange =() =>{
    setStartDate(null)
    
  }


  const renderLeaveForm = () => (
    <div className={stylesSickLeave.main}>
      <div className={stylesSickLeave.dateDiv}>
        <span style={{paddingBottom:"0.5rem"}} className={stylesSickLeave.heading}>Employee Name*</span>
        <Select
          className={stylesSickLeave.employeeBox}
          showSearch
          placeholder="Search employee to select"
          optionFilterProp="label"
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
          }
          options={employeeOptions}
          onChange={handleEmployeeSelect}
          value={selectedEmployeeId}
        />
      </div>
      <div className={stylesSickLeave.typeofLeaveDiv}>
        <span className={stylesSickLeave.heading}>Leave Type</span>
        <Button className={stylesSickLeave.headingApprover} disabled>Sick Leave</Button>
        <span className={stylesSickLeave.levdue}>Select Leave Duration*</span>
        <Select
          className={stylesSickLeave.employeeBox}
          onChange={handleDurationChange}
          options={durationOptions}
          placeholder="Leave Duration"
          value={leaveDuration}
        />
      </div>
      <div className={stylesSickLeave.datesContainer}>
        <div className={stylesSickLeave.dateDiv}>
          <span style={{paddingBottom:"0.5rem"}} className={stylesSickLeave.heading}>Start Date*</span>
          <DatePicker
            className={stylesSickLeave.employeeBox}
            allowClear
            placeholder="Start Date"
            onChange={(date, dateString) => handleDateChange('start', dateString)}
            value={startDate ? moment(startDate) : null}
            onClick={handleStartChange}
          />
        </div>
        <div className={stylesSickLeave.desDiv}>
          <span className={stylesSickLeave.heading}>End Date*</span>
          <DatePicker
            className={stylesSickLeave.employeeBox}
            allowClear
            placeholder="End Date"
            onChange={(date, dateString) => handleDateChange('end', dateString)}
            value={endDate ? moment(endDate) : null}
            onClick={handleEndChange}
            disabledDate={(current) => {
              return current && current < moment(startDate).startOf('day');
            }}
            disabled={leaveDuration === 'half day'}
          />
        </div>
      </div>
      <div className={stylesSickLeave.desDiv}>
        <span className={stylesSickLeave.heading}>Reason*</span>
        <Input
          className={stylesSickLeave.inputDes}
          placeholder="Write Here"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className={stylesSickLeave.footerButtons}>
        <Button
          className={stylesSickLeave.approveButton}
          onClick={handleApply}
          disabled={isApplying || !isFormValid()}
          loading={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </Button>
      </div>
      <ToastContainer />
    </div>
  );

  return (
    <div>
      <div className={stylesSickLeave.content}>
        {activeTab === 'sickLeave' && renderLeaveForm()}
      </div>
    </div>
  );
};

export default SickLeave;
