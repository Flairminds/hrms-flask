import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, DatePicker, Input } from 'antd';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './HRApplyLeaveModal.module.css';
import { getAllEmployeesList, getTypeApprover, holidayListData } from '../../../services/api';
import { hrApplyLeave } from '../../../services/api';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

dayjs.extend(customParseFormat);

const LEAVE_STATUS_OPTIONS = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
];

const DURATION_OPTIONS = [
    { value: 'Full Day', label: 'Full Day' },
    { value: 'Half Day', label: 'Half Day' },
];

export function HRApplyLeaveModal({ open, onClose, onSuccess }) {
    const { user } = useAuth();

    // Employee list
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    // Leave type info (fetched for the HR, used for the type list)
    const [leaveOptions, setLeaveOptions] = useState({ leaveTypes: [], approver: '', approverId: '' });

    // Form fields
    const [leaveType, setLeaveType] = useState(null);
    const [leaveDuration, setLeaveDuration] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [leaveDays, setLeaveDays] = useState(0);
    const [comments, setComments] = useState('');
    const [handOverComments, setHandOverComments] = useState('');
    const [leaveStatus, setLeaveStatus] = useState('Pending');
    const [holidayData, setHolidayData] = useState([]);

    const [loader, setLoader] = useState(false);

    // Fetch employees + leave types + holidays on open
    useEffect(() => {
        if (open) {
            fetchEmployees();
            fetchLeaveOptions();
            fetchHolidays();
        }
    }, [open]);

    const fetchEmployees = async () => {
        try {
            const res = await getAllEmployeesList();
            if (res.data) setEmployees(res.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
            toast.error('Failed to load employee list');
        }
    };

    const fetchLeaveOptions = async () => {
        try {
            const response = await getTypeApprover();
            if (response.data) {
                setLeaveOptions({
                    leaveTypes: response.data?.leave_types?.map((type, index) => ({
                        key: `${type.name}-${index}`,
                        value: type.name,
                        label: type.name,
                    })),
                    approver: response.data.approver_name,
                    approverId: response.data.approver_id,
                });
            }
        } catch (err) {
            console.error('Error fetching leave types:', err);
        }
    };

    const fetchHolidays = async () => {
        try {
            const res = await holidayListData();
            if (res.data) setHolidayData(res.data);
        } catch (err) {
            console.error('Error fetching holidays:', err);
        }
    };

    // Calculate working days excluding weekends and holidays (same logic as LeaveApplicationModal)
    const calculateLeaveDays = (start, end) => {
        if (!start || !end) {
            setLeaveDays(0);
            return;
        }
        const holidayList = holidayData.map(h => new Date(h.holiday_date).toDateString());
        let count = 0;
        let current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6 && !holidayList.includes(current.toDateString())) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        setLeaveDays(count);
    };

    const handleLeaveTypeChange = (value) => {
        setLeaveType(value);
        setStartDate(null);
        setEndDate(null);
        setLeaveDays(0);
    };

    const handleDurationChange = (value) => {
        setLeaveDuration(value);
        setLeaveDays(0);
        if (value === 'Half Day') {
            setEndDate(startDate);
            if (startDate) setLeaveDays(0.5);
        }
        if (value === 'Full Day') {
            setStartDate(null);
            setEndDate(null);
        }
    };

    const handleStartDateChange = (date) => {
        setStartDate(date);
        calculateLeaveDays(date, endDate);
        if (leaveDuration === 'Half Day') {
            setEndDate(date);
            setLeaveDays(0.5);
        }
    };

    const handleEndDateChange = (date) => {
        setEndDate(date);
        calculateLeaveDays(startDate, date);
    };

    const isFormValid = () => {
        return (
            selectedEmployeeId &&
            leaveType &&
            leaveDuration &&
            startDate &&
            endDate &&
            leaveDays > 0 &&
            comments &&
            handOverComments &&
            leaveStatus
        );
    };

    const handleOk = async () => {
        try {
            setLoader(true);

            const payload = {
                employeeId: selectedEmployeeId,
                leaveType,
                duration: leaveDuration,
                fromDate: startDate.format('YYYY-MM-DD'),
                toDate: endDate.format('YYYY-MM-DD'),
                noOfDays: leaveDays,
                comments,
                handOverComments,
                approvedBy: leaveOptions.approverId,
                hr_leave_status: leaveStatus,
                compOffTransactions: [],
                cutsomerHolidays: { workedDate: null },
                workingLates: { fromtime: null, totime: null, reasonforworkinglate: null },
            };

            const res = await hrApplyLeave(payload);

            if (res.status === 200 || res.status === 201) {
                toast.success('Leave applied successfully on behalf of employee!');
                // Delay closing so the toast is visible before the modal unmounts
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    handleCancel();
                }, 1500);
            } else {
                toast.info(res.data?.Message || 'Leave applied');
            }
        } catch (error) {
            const msg = error.response?.data?.Message || error.message || 'An unexpected error occurred';
            toast.error(msg);
        } finally {
            setLoader(false);
        }
    };

    const handleCancel = () => {
        setSelectedEmployeeId(null);
        setLeaveType(null);
        setLeaveDuration(null);
        setStartDate(null);
        setEndDate(null);
        setLeaveDays(0);
        setComments('');
        setHandOverComments('');
        setLeaveStatus('Pending');
        onClose();
    };

    return (
        <div>
            <Modal
                open={open}
                title={
                    <div className={styles.titleDiv}>
                        <span className={styles.titleHeading}>Apply Leave on Behalf of Employee</span>
                    </div>
                }
                centered
                onCancel={handleCancel}
                width="min(92vw, 680px)"
                closable={true}
                footer={[
                    <div key="footer-buttons" className={styles.btnDiv}>
                        <Button key="cancel-button" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button
                            key="apply-button"
                            className={styles.btnStyle}
                            onClick={handleOk}
                            loading={loader}
                            disabled={!isFormValid()}
                        >
                            Apply
                        </Button>
                    </div>
                ]}
            >
                <div className={styles.main}>

                    {/* Employee Selection */}
                    <div className={styles.typeofLeaveDiv}>
                        <span className={styles.heading}>Select Employee*</span>
                        <Select
                            showSearch
                            style={{ width: '100%' }}
                            placeholder="Search by name or employee ID..."
                            optionFilterProp="label"
                            value={selectedEmployeeId}
                            onChange={setSelectedEmployeeId}
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={employees.map(emp => ({
                                value: emp.employeeId,
                                label: `${emp.employeeName} (${emp.employeeId})`,
                            }))}
                        />
                    </div>

                    {/* Leave Type + Duration */}
                    <div className={styles.typeofLeaveDiv}>
                        <div className={styles.leaveTypeRow}>
                            <Select
                                className={styles.leaveTypeSelect}
                                onChange={handleLeaveTypeChange}
                                options={leaveOptions.leaveTypes}
                                placeholder="Type of Leave"
                                value={leaveType}
                            />
                            <Select
                                className={styles.leaveTypeSelect}
                                onChange={handleDurationChange}
                                options={DURATION_OPTIONS}
                                placeholder="Leave Duration"
                                value={leaveDuration}
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className={styles.datesContainer}>
                        <div className={styles.dateDiv}>
                            <span className={styles.heading}>Start Date*</span>
                            <DatePicker
                                style={{ width: '100%' }}
                                allowClear
                                placeholder="Start Date"
                                onChange={handleStartDateChange}
                                value={startDate}
                                disabledDate={(current) => {
                                    if (!endDate) return false;
                                    return current > endDate;
                                }}
                            />
                        </div>
                        <div className={styles.dateDiv}>
                            <span className={styles.heading}>End Date*</span>
                            <DatePicker
                                style={{ width: '100%' }}
                                allowClear
                                placeholder="End Date"
                                onChange={handleEndDateChange}
                                value={endDate}
                                disabled={leaveDuration === 'Half Day'}
                                disabledDate={(current) => {
                                    if (!startDate) return false;
                                    return current < startDate;
                                }}
                            />
                        </div>
                        <div className={styles.leaveDaysDiv}>
                            <span className={styles.heading}>Number of Leave Days:</span>
                            <span>{leaveDays}</span>
                        </div>
                    </div>

                    {/* Leave Status (HR only) */}
                    <div className={styles.desDiv}>
                        <span className={styles.heading}>Leave Status*</span>
                        <Select
                            className={styles.leaveStatusSelect}
                            onChange={setLeaveStatus}
                            options={LEAVE_STATUS_OPTIONS}
                            value={leaveStatus}
                            placeholder="Select status"
                        />
                    </div>

                    {/* Description */}
                    <div className={styles.desDiv}>
                        <span className={styles.heading}>Description/Notes/Comments*</span>
                        <Input
                            className={styles.inputDes}
                            placeholder="Reason for applying leave on behalf..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    {/* Hand Over Comments */}
                    <div className={styles.desDiv}>
                        <span className={styles.heading}>Hand Over Comments*</span>
                        <Input
                            className={styles.inputDes}
                            placeholder="Hand Over Comments"
                            value={handOverComments}
                            onChange={(e) => setHandOverComments(e.target.value)}
                        />
                    </div>

                    {/* Approver info */}
                    <div className={styles.approverDiv}>
                        <span className={styles.heading}>Approver: {leaveOptions.approver || '—'}</span>
                    </div>

                </div>
            </Modal>
            <ToastContainer position="top-right" autoClose={3000} />
        </div>
    );
}
