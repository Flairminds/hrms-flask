import React, { useState , useEffect} from 'react'
import styles from "./LeaveMangament.module.css"
import FM from "../../assets/leave/FM.png"
import { Button, Progress } from "antd";
import { LeaveApplicationModal } from '../../components/modal/leaveApplicationModal/LeaveApplicationModal';
import { getLeaveCardDetails , holidayListData} from '../../services/api.jsx';
import { LeaveModal } from '../../components/modal/leaveModal/LeaveModal.jsx'
import { LeaveTable } from '../../components/leaveTable/LeaveTable';
// import { LeaveApplicationModal } from '../../components/modal/leaveApplicationModal/LeaveApplicationModal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCookie } from '../../util/CookieSet.jsx';
export const isDateOlderThanSixMonths = (dateStr , leaveType)=> {
  if(leaveType !== 'Work From Home'){
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
 
  const [isSetLeaveApplicationModal, setLeaveApplicationModal] = useState(false);
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState();
  const [leaveCardData, setLeaveCardData] = useState([]);
  const [holidayData, setHolidayData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
 
  const [selectedLeave, setSelectedLeave] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [loadingLeaveTable, setLoadingLeaveTable] = useState(true);
  const [unpaidLeave , setUnpaidLeave] = useState(0);
  const [size, setSize] = useState(90); // default size
  const [windowSize, setWindowSize] = useState(0); 

  const[leaveDates,setLeaveDates] = useState({})
  const[apiHolidays,setApiHolidays] = useState([])


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


  

  
 
  useEffect(()=>{
   
  },[employeeData])
 
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
    leaveCardDetails();
    fetchHolidayData();
  }, []);

  const showModal = (leaveType, leave) => {
    setLeaveModalOpen(true);
    setUnpaidLeave(leave)
    setSelectedLeaveType(leaveType)
  };
  const handleOk = () => {
    setLeaveModalOpen(false);
  };
  const handleCancel = () => {
    setLeaveModalOpen(false);
  };
  const holidays = [
    { date: "01-05-2024", name: "Maharashtra Day" },
    { date: "17-06-2024", name: "Bakri Eid" },
    { date: "15-08-2024", name: "Independence Day" },
    { date: "17-09-2024", name: "Anant Chaturthi" },
    { date: "02-10-2024", name: "Gandhi Jayanti" },
    { date: "12-10-2024", name: "Dussehra" },
    { date: "31-10-2024", name: "Diwali" },
    { date: "01-11-2024", name: "Diwali" },
    { date: "01-01-2025", name: "New Year" },
    { date: "26-01-2025", name: "Republic Day" },
  ];
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
  console.log(formattedLeaveData,"formattedLeaveData");
  
  
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
  const today = new Date();
  const upcomingHolidays = holidayData.filter((holiday) => {
    const [day, month, year] = holiday.holidayDate.split("-");
    const holidayDate = new Date(`${year}-${month}-${day}`);
    return holidayDate >= today;
  });
  const getStrokeColor = (percentage) => {
    if (percentage < 50) {
      return "red";
    } else if (percentage >= 50 && percentage < 75) {
      return "orange";
    } else {
      return "green";
    }
  };
 
  const showApplyModal =() =>{
    setLeaveApplicationModal(true)
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
          <div className={styles.firstRow}>
          
            <div className={styles.leaveContainer}>
              {formattedLeaveData
              .filter(leave => leave.leaveCardsFlag && leave.leaveName !== 'Missed Door Entry')
              ?.map((leave, index) => (
                
                <div key={index} className={styles.progressGroup } style={{ paddingTop: (windowSize === 1440  && leave.leaveName ==="Sick/Emergency Leave" ? '0.8rem' : '') }} >
                  <div className={styles.progressWrapper}>
                    <Progress onClick={() => showModal(leave?.leaveName , leave)}
                      percent={leave.percentage}
                      type="circle"
                      strokeColor={
                        leave.type === "Unpaid Leaves"
                          ? "red"
                          : getStrokeColor(leave.percentage)
                      }
                        width={size} 
                        style={{
                          fontSize: "1vw",
                        }}
                    
                        format={() => (
                          <div>
                            <div className={styles.insideText}>Available</div>
                            <div className={styles.leaveNumber}>
                              {
                                // Check if 'leave' and the required properties are defined
                                leave && leave.totalAllotedLeaves !== undefined && leave.totalUsedLeaves !== undefined 
                                ? (
                                    // For "Privilege Leave"
                                    leave.leaveName === "Privilege Leave"
                                      ? (
                                          // Use 12 as denominator if totalAllotedLeaves is greater than 12, otherwise use totalAllotedLeaves
                                          (leave.totalAllotedLeaves - leave.totalUsedLeaves).toFixed(1) 
                                          + '/' + 
                                          (leave.totalAllotedLeaves > 12 ? 12 : leave.totalAllotedLeaves).toFixed(1)
                                        )
                                      : (
                                          // For other leave types, just display the regular calculation
                                          (leave.totalAllotedLeaves - leave.totalUsedLeaves).toFixed(1) 
                                          + '/' + 
                                          (leave.totalAllotedLeaves).toFixed(1)
                                        )
                                  )
                                  : (
                                    // If 'leave' or its properties are undefined, display a fallback value
                                    "Data not available"
                                  )
                              }
                            </div>
                          </div>
                        )}
                        
                        
                      />
                  </div>
                  {/* <div className={styles.progressText}> */}
                  {leave.leaveName !== 'Missed Door Entry' && (
                    <div className={styles.progressText}>
                      {leave.leaveName === 'Sick/Emergency Leave'
                        ? 'Sick/Emergency Leave'
                        : leave.leaveName === 'Work From Home'
                        ? 'Work From Home'
                        : leave.leaveName}
                    </div>
                  )}

                    {/* </div> */}
                    <LeaveModal setLeaveCardData={setLeaveCardData} leaveCardData={leaveCardData} leaveDates={leaveDates}
                  selectedLeave={selectedLeave} setSelectedLeave={setSelectedLeave} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} employeeData={employeeData} setEmployeeData={setEmployeeData} loadingLeaveTable={loadingLeaveTable} setLoadingLeaveTable={setLoadingLeaveTable}
                  isLeaveModalOpen={isLeaveModalOpen} setLeaveModalOpen={setLeaveModalOpen} leaveName = {selectedLeaveType} leaveObj = {unpaidLeave} />
                 
                 <LeaveApplicationModal  leaveDates={leaveDates}  apiHolidays={apiHolidays} setApiHolidays ={setApiHolidays}
                  setLeaveCardData={setLeaveCardData} leaveCardData={leaveCardData}
                  selectedLeave={selectedLeave} setSelectedLeave={setSelectedLeave} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} employeeData={employeeData} setEmployeeData={setEmployeeData} loadingLeaveTable={loadingLeaveTable} setLoadingLeaveTable={setLoadingLeaveTable}
                  setLeaveApplicationModal={setLeaveApplicationModal}        isSetLeaveApplicationModal={isSetLeaveApplicationModal} leave={leave} leaveObj = {leaveCardData}
                  formattedLeaveData={formattedLeaveData} />
               </div>
              ))}
              <div className={styles.btnDiv}>
                 <button onClick={showApplyModal} className={styles.addButton}>Apply Leave</button>
              </div>
            </div>

 
            <div className={styles.holidayContainer}>
              <div className={styles.holidayHeading}>
                &nbsp;
                <h5 className={styles.headingHolidays}>Upcoming Public Holidays</h5>
              </div>
              <div className={styles.tableContainer}>
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday, index) => (
                    <div key={index} className={styles.tableData}>
                      <span>{holiday.holidayName}</span>
                      <span>{formatDate(holiday.holidayDate)}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.noHolidaysMessage}>No more upcoming holidays :(</div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.leaveTable}>
          <LeaveTable leaveDates={leaveDates}  apiHolidays={apiHolidays}
             setLeaveCardData={setLeaveCardData} setLeaveDates={setLeaveDates}
            selectedLeave={selectedLeave} setSelectedLeave={setSelectedLeave} selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} employeeData={employeeData} setEmployeeData={setEmployeeData}  loadingLeaveTable={loadingLeaveTable} setLoadingLeaveTable={setLoadingLeaveTable}
            />
          </div>
        </div>
      </div>
    </>
  );
}