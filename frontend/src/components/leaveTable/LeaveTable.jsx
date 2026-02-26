import { Calendar, Empty, Select, theme, Modal, Button, Row, Col, Space, Typography } from 'antd';
import React, { useState, useEffect } from 'react';
import styles from "./LeaveTable.module.css";
import { getLeaveDetails, cancelLeave, getLeaveCards } from '../../services/api';
import { tableHeaders } from '../../util/leavetableData';
import { getCookie } from '../../util/CookieSet';
import WidgetCard from '../common/WidgetCard';
import { FilterOutlined } from '@ant-design/icons';
import { LEAVE_STATUS, leaveStatusOptions } from "../../util/helper";

const { Text } = Typography;

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
  { value: "Missed Door Entry", label: 'Missed Door Entry' },
];

const { Option } = Select;
export const LeaveTable = ({ employeeId: propEmployeeId, setLeaveCardData, leaveDates, holidayData,
  selectedLeave, setSelectedLeave, selectedStatus, setSelectedStatus,
  employeeData, setEmployeeData, loadingLeaveTable, setLoadingLeaveTable, setLeaveDates,
  refreshTrigger
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);
  const [loader, setLoader] = useState(false)

  const yearRanges = Array.from({ length: new Date().getFullYear() - 2021 + 1 }, (_, i) => new Date().getFullYear() - i);
  const [selectedRange, setSelectedRange] = useState(new Date().getFullYear());


  const handleChangeYear = (value) => {
    // setSelectedRange(value);

    // Extract the first year from the selected range
    const firstYear = value.split("-")[0];
    setSelectedRange(firstYear)
  };




  const leaveCardDetails = async () => {
    try {
      const employeeId = propEmployeeId || getCookie('employeeId');
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


  useEffect(() => {
    const fetchEmployeeData = async () => {
      const employeeId = propEmployeeId || getCookie('employeeId');
      console.log('fetchEmployeeData called with employeeId:', employeeId, 'and selectedRange:', selectedRange);
      if (employeeId) {
        setLoadingLeaveTable(true);
        try {
          console.log(`Calling getLeaveDetails for ${employeeId} and year ${selectedRange}`);
          const response = await getLeaveDetails(employeeId, selectedRange);
          if (response.data) {
            const mappedData = response.data.map(item => ({
              ...item,
              leaveTranId: item.leave_tran_id,
              empName: item.emp_name,
              description: item.comments,
              leaveName: item.leave_name,
              fromDate: item.from_date,
              toDate: item.to_date,
              duration: item.duration,
              numberOfDays: item.no_of_days,
              appliedLeaveCount: item.no_of_days,
              applicationDate: item.application_date,
              leaveStatus: item.leave_status,
              approverName: item.approver_name,
              approvedBy: item.leave_status == LEAVE_STATUS.APPROVED ? item.approver_name : '',
              approvalComment: item.approval_comment
            }));
            setEmployeeData(mappedData);
          }
        } catch (error) {
          console.error('Failed to fetch employee data:', error);
        } finally {
          setLoadingLeaveTable(false);
        }
      } else {
        setLoadingLeaveTable(false);
      }
    };

    console.log('LeaveTable useEffect triggered. refreshTrigger:', refreshTrigger, 'selectedRange:', selectedRange);
    fetchEmployeeData();
  }, [selectedRange, propEmployeeId, refreshTrigger]);


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
    const holidayDates = holidayData.map(holiday => formatHolidayDate(holiday.holiday_date));
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
      if (leave.leaveStatus === LEAVE_STATUS.CANCELLED || leave.leaveStatus === LEAVE_STATUS.REJECTED) {
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

    setLoader(true)
    try {
      const response = await cancelLeave(leaveToCancel);

      if (response.status === 200) {
        leaveCardDetails()
        setEmployeeData(prevData => prevData.map(employee =>
          employee.leaveTranId === leaveToCancel ? { ...employee, leaveStatus: LEAVE_STATUS.CANCELLED } : employee
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
      case LEAVE_STATUS.PENDING: return styles.pendingLeaveBox;
      case LEAVE_STATUS.APPROVED: return styles.approvedLeaveBox;
      case LEAVE_STATUS.CANCELLED: return styles.canceledLeaveBox;
      case LEAVE_STATUS.REJECTED: return styles.rejectedLeaveBox;
      case LEAVE_STATUS.PARTIAL_APPROVED: return styles.partialApprovedLeaveBox;
      default: return '';
    }
  };

  return (
    <div className={styles.main}>
      <WidgetCard title="Leave Applications" icon={<FilterOutlined />} iconColor="#1890ff">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Filter Section */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Leave Type</Text>
                <Select
                  mode="multiple"
                  placeholder="Select leave types"
                  onChange={handleLeaveChange}
                  style={{ width: '100%' }}
                  options={leaveOptions}
                  allowClear
                />
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Leave Status</Text>
                <Select
                  mode="multiple"
                  placeholder="Select status"
                  onChange={handleStatusChange}
                  style={{ width: '100%' }}
                  options={leaveStatusOptions}
                  allowClear
                />
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Year</Text>
                <Select
                  value={selectedRange}
                  onChange={handleChangeYear}
                  placeholder="Select Year Range"
                  style={{ width: '100%' }}
                >
                  {yearRanges.map((range) => (
                    <Option key={range} value={range}>
                      {range}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
          </Row>

          {/* Table Section */}
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
                              className={header.key === "leaveStatus" ? getStatusClass(employee[header.key]) : ""}
                            >
                              {employee[header.key]}
                            </div>
                          </td>
                        ))}
                        <td>
                          <Button
                            danger
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              showModal(employee.leaveTranId);
                            }}
                            disabled={!(() => {
                              const fromDate = new Date(employee.fromDate);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              fromDate.setHours(0, 0, 0, 0);

                              const isTodayOrFuture = fromDate >= today;
                              const isCancellable = employee.leaveStatus !== LEAVE_STATUS.CANCELLED && employee.leaveStatus !== LEAVE_STATUS.REJECTED;

                              return isTodayOrFuture && isCancellable;
                            })()}
                          >
                            Cancel
                          </Button>
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
        </Space>
      </WidgetCard>
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
              <strong>Leave Approver:</strong>
              <span>{selectedLeaveDetails.approverName}</span>
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
    </div >
  );
};
