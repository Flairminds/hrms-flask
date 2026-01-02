import React, { useState, useEffect } from 'react'
import styles from "./LeaveMangament.module.css"
import FM from "../../assets/leave/FM.png"
import { Button, Progress, Row, Col, List, Typography, Badge } from "antd";
import { LeaveApplicationModal } from '../../components/modal/leaveApplicationModal/LeaveApplicationModal';
import { getLeaveCards, holidayListData } from '../../services/api.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { LeaveTable } from '../../components/leaveTable/LeaveTable';
import WidgetCard from '../../components/common/WidgetCard';
import { PieChartOutlined, PushpinOutlined } from '@ant-design/icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const { Text } = Typography;
export const isDateOlderThanSixMonths = (dateStr, leaveType) => {
  if (leaveType !== 'Work From Home') {
    return false
  }
  const givenDate = new Date(dateStr);
  const currentDate = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
  if (givenDate < sixMonthsAgo && leaveType === 'Work From Home') {
    return false;
  } else {
    return true;
  }
}

export function LeaveManagementPage() {
  const { user } = useAuth();
  const [isSetLeaveApplicationModal, setLeaveApplicationModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState();
  const [leaveCardData, setLeaveCardData] = useState([]);
  const [holidayData, setHolidayData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedLeave, setSelectedLeave] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [loadingLeaveTable, setLoadingLeaveTable] = useState(true);
  const [unpaidLeave, setUnpaidLeave] = useState(0);
  const [size, setSize] = useState(90); // default size
  const [windowSize, setWindowSize] = useState(0);

  const [leaveDates, setLeaveDates] = useState({})


  useEffect(() => {
    const updateSize = () => {
      const newSize = window.innerWidth <= 1024 ? 80 : 100;
      setWindowSize(window.innerWidth);
      setSize(newSize);
    };

    // Add event listener for window resize
    window.addEventListener("resize", updateSize);

    // Call once on mount
    updateSize();

    // Cleanup on unmount
    return () => window.removeEventListener("resize", updateSize);
  }, [windowSize]);

  useEffect(() => {
    if (!isSetLeaveApplicationModal) {
      leaveCardDetails(user.employeeId);
    }
  }, [isSetLeaveApplicationModal])

  const leaveCardDetails = async (employeeId) => {
    try {
      setLoading(true);
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
        console.log(mappedData);
        setLeaveCardData(mappedData);
      }
    } catch (err) {
      console.error('Error fetching leave card data:', err);
      toast.error('Failed to fetch leave card data');
    } finally {
      setLoading(false);
    }
  };
  const fetchHolidayData = async () => {
    try {
      const res = await holidayListData();
      setHolidayData(res.data);
    } catch (err) {
      console.error('Error fetching holiday data:', err);
      toast.error('Failed to fetch holiday data');
    }
  };
  useEffect(() => {
    if (user?.employeeId) {
      leaveCardDetails(user.employeeId);
    }
    fetchHolidayData();
  }, [user]);

  const showModal = (leaveType) => {
    setSelectedLeaveType(leaveType);
    setLeaveApplicationModal(true);
  };

  const calculateLeavePercentages = (data) => {
    return data.map((item) => {
      let percentage;

      if (item.leaveName === "Privilege Leave") {
        // Use 12 as denominator if totalAllotedLeaves is greater than 12, else use totalAllotedLeaves
        const denominator = item.totalAllotedLeaves > 12 ? 12 : item.totalAllotedLeaves;
        percentage = ((item.totalAllotedLeaves - item.totalUsedLeaves) / denominator) * 100;
      } else {
        // Calculate percentage normally for other leave types
        percentage = ((item.totalAllotedLeaves - item.totalUsedLeaves) / item.totalAllotedLeaves) * 100;
      }

      return {
        ...item,
        percentage: percentage.toFixed(2),
      };
    });
  }

  const formattedLeaveData = calculateLeavePercentages(leaveCardData);

  function formatDate(dateStr) {
    const [day, month, year] = dateStr.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    };
    return date.toLocaleDateString("en-US", options).replace(/ /g, " ");
  }

  const getStrokeColor = (percentage) => {
    if (percentage < 50) {
      return "red";
    } else if (percentage >= 50 && percentage < 75) {
      return "orange";
    } else {
      return "green";
    }
  };

  const showApplyModal = () => {
    setSelectedLeaveType(null);
    setLeaveApplicationModal(true);
  }

  return (
    <>
      <div className={styles.mainContainer}>
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover={true}
          draggable
          pauseOnFocusLoss={false}
          newestOnTop
        />
        <div className={styles.rightDiv}>
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={24} lg={16}>
              <WidgetCard
                title="Leave Balance"
                icon={<PieChartOutlined />}
                iconColor="#1890ff"
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-around', alignItems: 'center' }}>
                  {formattedLeaveData
                    .filter(leave => leave.leaveCardsFlag && leave.leaveName !== 'Missed Door Entry')
                    ?.map((leave, index) => (
                      <div key={index} style={{ textAlign: 'center', minWidth: '100px' }}>
                        <Progress
                          onClick={() => showModal(leave?.leaveName)}
                          percent={leave.percentage}
                          type="circle"
                          strokeColor={
                            leave.type === "Unpaid Leaves"
                              ? "red"
                              : getStrokeColor(leave.percentage)
                          }
                          width={size}
                          style={{ cursor: 'pointer' }}
                          format={() => (
                            <div style={{ fontSize: '10px' }}>
                              <div style={{ color: '#8c8c8c' }}>Available</div>
                              <div style={{ fontWeight: 'bold', color: '#262626' }}>
                                {leave && leave.totalAllotedLeaves !== undefined && leave.totalUsedLeaves !== undefined
                                  ? (
                                    leave.leaveName === "Privilege Leave"
                                      ? ((leave.totalAllotedLeaves - leave.totalUsedLeaves).toFixed(1) + '/' + (leave.totalAllotedLeaves > 12 ? 12 : leave.totalAllotedLeaves).toFixed(1))
                                      : ((leave.totalAllotedLeaves - leave.totalUsedLeaves).toFixed(1) + '/' + (leave.totalAllotedLeaves).toFixed(1))
                                  )
                                  : "N/A"
                                }
                              </div>
                            </div>
                          )}
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500' }}>
                          {leave.leaveName === 'Sick/Emergency Leave' ? 'Sick/Emergency' : leave.leaveName}
                        </div>
                      </div>
                    ))}
                  <div style={{ padding: '10px' }}>
                    <Button type="primary" onClick={showApplyModal} style={{ borderRadius: '4px' }}>
                      Apply Leave
                    </Button>
                  </div>
                </div>
              </WidgetCard>
            </Col>

            <Col xs={24} lg={8} style={{ maxHeight: '250px' }}>
              <WidgetCard
                title="Upcoming Holidays"
                icon={<PushpinOutlined />}
                iconColor="#fa8c16"
              >
                <List
                  dataSource={holidayData}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Text strong>{item.holiday_name}</Text>}
                        description={formatDate(item.holiday_date)}
                      />
                    </List.Item>
                  )}
                  style={{ maxHeight: '150px', overflowY: 'auto' }}
                />
              </WidgetCard>
            </Col>
          </Row>

          {isSetLeaveApplicationModal && (
            <LeaveApplicationModal leaveDates={leaveDates}
              setLeaveCardData={setLeaveCardData} leaveCardData={leaveCardData}
              selectedLeave={selectedLeave} setSelectedLeave={setSelectedLeave} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} employeeData={employeeData} setEmployeeData={setEmployeeData} loadingLeaveTable={loadingLeaveTable} setLoadingLeaveTable={setLoadingLeaveTable}
              setLeaveApplicationModal={setLeaveApplicationModal} isSetLeaveApplicationModal={isSetLeaveApplicationModal} preSelectedLeaveType={selectedLeaveType} leaveObj={leaveCardData}
              formattedLeaveData={formattedLeaveData} holidayData={holidayData} />
          )}
          <div className={styles.leaveTable}>
            <LeaveTable leaveDates={leaveDates} holidayData={holidayData}
              setLeaveCardData={setLeaveCardData} setLeaveDates={setLeaveDates}
              selectedLeave={selectedLeave} setSelectedLeave={setSelectedLeave} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} employeeData={employeeData} setEmployeeData={setEmployeeData} loadingLeaveTable={loadingLeaveTable} setLoadingLeaveTable={setLoadingLeaveTable}
            />
          </div>
        </div>
      </div>
    </>
  );
}