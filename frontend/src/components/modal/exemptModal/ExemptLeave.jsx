import React, { useEffect, useState } from 'react';

import { Button, Select, DatePicker, TimePicker, message } from 'antd';

import stylesLeaveApplication from './ExemptLeave.module.css';

import { getEmployeeList, addExemptLeave } from '../../../services/api';

import moment from 'moment';



const ExemptLeave = ({ selectedEmployee, onApply,fetchData }) => {

  const [employeeList, setEmployeeList] = useState([]);

  const [employeeId, setEmployeeId] = useState(selectedEmployee?.employeeId || null);

  const [employeeName, setEmployeeName] = useState(selectedEmployee?.empName || null);

  const [startDate, setStartDate] = useState(null);

  const [endDate, setEndDate] = useState(null);

  const [time, setTime] = useState(null);

  const [isApplying, setIsApplying] = useState(false);



  useEffect(() => {

    handleEmployeeList();

  }, []);



  useEffect(() => {

    if (selectedEmployee) {

      setEmployeeId(selectedEmployee.employeeId);

      setEmployeeName(selectedEmployee.empName);

    }

  }, [selectedEmployee]);



  const handleEmployeeList = async () => {

    try {

      const response = await getEmployeeList();

      setEmployeeList(response.data);

    } catch (error) {

      console.error(error);

      message.error('Failed to fetch employee list');

    }

  };



  const employeeOptions = employeeList.map(employee => ({

    value: employee.employeeId,

    label: `${employee.firstName} ${employee.lastName}`,

  }));



  const handleApply = async () => {

    if (!employeeId || !startDate || !endDate || !time) {

      message.error('Please fill in all required fields');

      return;

    }



    setIsApplying(true);

    const payload = {

      employeeId,

      empName: employeeName,

      fromDate: startDate,

      toDate: endDate,

      shiftStartFromTime: time,

    };



    try {

      const response = await addExemptLeave(payload);

      console.log('Exempt leave applied successfully:', response.data);

      message.success('Exempt leave applied successfully');

      fetchData()

      setEmployeeId(null);

      setEmployeeName(null);

      setStartDate(null);

      setEndDate(null);

      setTime(null);

      onApply();

    } catch (error) {

      console.error('Error applying exempt leave:', error);

      message.error('Failed to apply exempt leave');

      fetchData()

      onApply();

    } finally {

      setIsApplying(false);

      onApply();

    }

  };



  const handleStartDate =() =>{

  setStartDate(null)

  }



  const handleEndDate =() =>{

    setEndDate(null)

  }

  const renderExemptLeaveForm = () => (

    <div className={stylesLeaveApplication.main}>

      <div className={stylesLeaveApplication.dateDiv}>

        <span className={stylesLeaveApplication.titleHeading}>Exempt Leave</span>

        </div>

      <div className={stylesLeaveApplication.dateDiv}>

        <span className={stylesLeaveApplication.heading}>Employee Name</span>

        <Select

          className={stylesLeaveApplication.employeeName}

          showSearch

          placeholder="Search employee to select"

          optionFilterProp="label"

          filterSort={(optionA, optionB) =>

            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())

          }

          options={employeeOptions}

          onChange={(value, option) => {

            setEmployeeId(value);

            setEmployeeName(option.label);

          }}

          value={employeeId}

        />

      </div>

      <div className={stylesLeaveApplication.datesContainer}>

        <div className={stylesLeaveApplication.dateDiv}>

          <span className={stylesLeaveApplication.heading}>Start Date</span>

          <DatePicker

            className={stylesLeaveApplication.employeeBox}

            allowClear

            placeholder="Start Date"

            onChange={(date, dateString) => setStartDate(dateString)}

            value={startDate ? moment(startDate) : null}

            onClick={handleStartDate}

          />

        </div>

        <div className={stylesLeaveApplication.dateDiv}>

          <span className={stylesLeaveApplication.heading}>End Date</span>

          <DatePicker

            className={stylesLeaveApplication.employeeBox}

            allowClear

            placeholder="End Date"

            onChange={(date, dateString) => setEndDate(dateString)}

            value={endDate ? moment(endDate) : null}

            onClick={handleEndDate}

          />

        </div>

      </div>

      <div className={stylesLeaveApplication.dateDiv}>

        <span className={stylesLeaveApplication.heading}>Shift Time Starts From</span>

        <TimePicker

          className={stylesLeaveApplication.Timebox}

          allowClear

          placeholder="Shift Time Starts From"

          onChange={(time, timeString) => setTime(timeString)}

          value={time ? moment(time, 'HH:mm') : null}

        />

      </div>

      <div className={stylesLeaveApplication.footerButtons}>

        <Button

          className={stylesLeaveApplication.approveButton}

          onClick={handleApply}

          disabled={isApplying}

          loading={isApplying}

        >

          {isApplying ? 'Applying...' : 'Apply'}

        </Button>

      </div>

    </div>

  );



  return (

    <div>

      {renderExemptLeaveForm()}

    </div>

  );

};



export default ExemptLeave;

