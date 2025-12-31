import React, { useState, useEffect } from 'react';
import styles from './PersonalInfoPage.module.css';
import defaultProfile from '../../assets/profile/prof.svg';
import editIcon from "../../assets/HR/edit.svg";
import axiosInstance, { downloadSalarySlip, downloadSalarySlipViaEmail, getCompanyBands, getCompanyRoles, getDocuments, getEmployeeDetails, getSkillsForEmp } from '../../services/api';
import { getCookie } from '../../util/CookieSet';
import { EditPersonalDetails } from '../../components/modal/editPersonalDetails/EditPersonalDetails';
import { Modal, Button, Steps, message, Select } from 'antd';
import { UserOutlined, SolutionOutlined, CreditCardOutlined, SmileOutlined, EyeOutlined, EyeInvisibleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Step } = Steps;
const { Option } = Select;

function PersonalInfoPage() {
  const [employeeData, setEmployeeData] = useState(null);
  const [bandsData, setBandsData] = useState([]);
  const [error, setError] = useState(null);
  const [isEditModal, setIsEditModal] = useState(false);
  const [roles, setRoles] = useState([]);

  const [isSalarySlipModal, setIsSalarySlipModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loader, setLoader] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const [month, setMonth] = useState([])
  const [year, setYear] = useState([])
  const [loginEMPId, setloginEMPID] = useState("")
  const [loaderSlip, setLoaderSlip] = useState(false)
  const [highestQualificationYearMonth, setHighestQualificationYearMonth] = useState(null)
  const [fullStackReady, setFullStackReady] = useState(false)


  const [isMissingInfoModal, setIsMissingInfoModal] = useState(false);
  console.log(isMissingInfoModal, "isMissingInfoModal");

  const [missingInfoMessage, setMissingInfoMessage] = useState('');
  const [countPersonalInfo, setCountPersonalInfo] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(true);
  console.log(countPersonalInfo, "countPersonalInfo");

  const employeeIdCookie = getCookie('employeeId');
  const [documentStatus, setDocumentStatus] = useState({});
  const [documentStatusDetails, setDocumentStatusDetails] = useState(null);

  const months = [
    "January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October",
    "November", "December",
  ];

  const years = ["2025", "2024", "2023", "2022"]
  const getCompanyBandsData = async () => {
    try {
      const response = await getCompanyBands();
      if (Array.isArray(response.data)) {
        setBandsData(response.data);
      } else {
        console.error('Expected an array from getCompanyBands');
      }
    } catch (error) {
      console.error('Error fetching company bands:', error);
    }
  };

  const getEmployeeRoles = async () => {
    try {
      const response = await getCompanyRoles();
      if (Array.isArray(response.data)) {
        setRoles(response.data);
      } else {
        console.error('Expected an array from getEmployeeRoles');
      }
    } catch (error) {
      console.error('Error fetching Employee roles:', error);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const employeeId = getCookie('employeeId');
      const response = await getEmployeeDetails(employeeId);
      setEmployeeData(response.data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError(error.message || 'Error fetching employee data');
    }
  };

  const checkCompleteEmployeeDetails = async () => {
    console.log("checkCompleteEmployeeDetails called");

    try {
      setIsLoading(true);
      const employeeId = getCookie('employeeId');
      const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
      console.log('responsegb', response.data);
      setWarningMessage(response.data.status);

      setCountPersonalInfo(response.data.data.Addresses[0].counter);
      setMissingInfoMessage(response.data.message);

      // Always show modal if status is false
      if (response.data && response.data.status === false) {
        console.log('Missing information detected:', response.data);

        setIsMissingInfoModal(true);
      }
    } catch (error) {
      console.error('Error checking employee details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentStatus = async () => {
    try {
      const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/document-verification-status/${employeeIdCookie}`);
      if (response.data && response.data.documents) {
        setDocumentStatus(response.data.documents);
      }
    } catch (error) {
      console.error('Error fetching document status:', error);
    }
  };

  const fetchDocumentStatusDetails = async () => {
    try {
      const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/document-status-details/${employeeIdCookie}`);
      if (response.data) {
        setDocumentStatusDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching document status details:', error);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
    getCompanyBandsData();
    getEmployeeRoles();
    checkCompleteEmployeeDetails();
    fetchDocumentStatus();
    fetchDocumentStatusDetails();
  }, []);

  const handleResumeClick = () => {
    if (employeeData && employeeData.resumeLink) {
      window.open(employeeData.resumeLink, '_blank');
    } else {
      alert('Resume link is not available.');
    }
  };

  const handleEditModal = () => {
    setIsEditModal(true);
  };

  const getBandName = (bandNumber) => {
    if (Array.isArray(bandsData)) {
      const band = bandsData.find(b => b.DesignationId === bandNumber);
      return band?.Band;
    }
    return 'N/A';
  };

  const employeeRole = (RoleId) => {
    if (Array.isArray(roles)) {
      const role = roles.find(b => b.SubRoleId === RoleId);
      return role?.Role || 'N/A';
    }
    return 'N/A';
  };



  const steps = [
    {
      title: 'Login',
      icon: <UserOutlined />,
      description: 'Log in to your account to access salary slips.',
    },
    {
      title: 'Verification',
      icon: <SolutionOutlined />,
      description: 'Verify your employee details.',
    },
    {
      title: 'Download Salary Slip',
      icon: <CreditCardOutlined />,
      description: 'Download Salary Slip.',
    },

  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancelModal = () => {
    setIsSalarySlipModal(false);
    setCurrentStep(0); // Reset steps on cancel
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };
  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleShowPasswordChange = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleSubmit = async (event) => {
    setLoader(true)
    event.preventDefault();

    if (!email || !password) {
      message.error('Please enter both email and password');
      return;
    }
    // setValidationMessage('');
    try {
      // const username = email;
      const response = await axiosInstance.post('/Account/Login', {
        username: email,
        password: password,
      });
      if (response.status === 200) {
        message.success('Login successful!');
        setCurrentStep(1); // Move to the next step
        setloginEMPID(response.data.employeeId)
      }

    } catch (error) {
      console.error('There was a problem with the axios operation:', error);
      message.error('Login failed. Please check your credentials and try again.');
    } finally {
      setLoader(false);
    }
  }


  const handleDownloadSalarySlip = async () => {
    if (loginEMPId === employeeData.employeeId) {
      setLoaderSlip(true);
      try {

        const res = await downloadSalarySlipViaEmail(employeeData.employeeId, month, year);
        console.log(res, "resrses");


        if (res.status === 200) {
          message.success("Email sent successfully.");
        } else {
          message.error("Data not available or Something went wrong");
        }
      } catch (error) {
        console.log(error);

        message.error("Data not available " + error.response.data.message);
      } finally {
        setYear([])
        setMonth([])
        setLoaderSlip(false)
        setIsSalarySlipModal(false)
        setCurrentStep(0)

      }
    }
    else {
      message.error("Your login ID and Salary Id does not match")
    }

  };

  const fetchSkills = async () => {
    try {
      const response = await getSkillsForEmp(employeeIdCookie);
      console.log(response, "raju");
      setHighestQualificationYearMonth(response.data.QualificationYearMonth)
      setFullStackReady(response.data.FullStackReady)
    } catch (error) {
      console.error("Error fetching skills:", error);
      console.log("reaju2");

    }
  };

  useEffect(() => {


    fetchSkills();


  }, [])

  const fetchDocuments = async (docType) => {
    console.log("docType", docType);

    try {
      const response = await getDocuments(employeeIdCookie, docType);

      if (response.status !== 200) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = new Blob([response.data], { type: "application/pdf" });

      // ✅ Create URL and trigger download
      const fileURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = "document.pdf"; // File name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ✅ Clean up object URL after some time
      setTimeout(() => URL.revokeObjectURL(fileURL), 1000);

      message.success("Download started");
    } catch (error) {
      console.error("Error downloading document:", error);

      // ✅ Check if error response exists
      if (error.response) {
        if (error.response.status === 404) {
          message.warning("Document not available");
          return;
        } else {
          message.error(`Error downloading document: ${error.response.statusText}`);
        }
      } else {
        message.error("Network error or server is down");
      }
    }
  };

  const fetchDocumentsView = async (docType) => {
    try {
      const response = await getDocuments(employeeIdCookie, docType);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const blob = new Blob([response.data], { type: "application/pdf" });

      const fileURL = window.URL.createObjectURL(blob);

      window.open(fileURL, "_blank");

      setTimeout(() => URL.revokeObjectURL(fileURL), 5000);

    } catch (error) {
      console.error("Error fetching document:", error);

      if (error.response) {
        if (error.response.status === 404) {
          message.warning("Document not available");
          return;
        } else {
          message.error(`Error fetching document: ${error.response.statusText}`);
        }
      } else {
        message.error("Network error or server is down");
      }
    }
  };


  const documentTypes = [
    { key: "tenth", label: "10th Marksheet" },
    { key: "twelve", label: "12th Marksheet" },
    { key: "adhar", label: "Aadhar Card" },
    { key: "pan", label: "Pan Card" },
    { key: "grad", label: "Graduation Degree" },
    { key: "resume", label: "FM Resume" },
  ];


  const handleModalOk = async () => {
    try {
      const employeeId = getCookie('employeeId');
      const response = await axiosInstance.post(`https://hrms-flask.azurewebsites.net/api/increment-address-counter/${employeeId}`);
      if (countPersonalInfo === 4) {
        window.location.reload();
      }
      console.log(response, "response");
      setIsMissingInfoModal(false);
    } catch (error) {
      console.error('Error incrementing counter:', error);
      message.error('Failed to update counter');
    }
  };


  return (
    <div className={styles.employeeDetailsContainer}>
      {!isLoading && countPersonalInfo <= 3 && countPersonalInfo >= 0 && !warningMessage && (
        <div style={{ marginBottom: '16px', color: 'red' }}>
          Kindly note: You have {3 - countPersonalInfo} attempts remaining to fill the required information .

          Your account remains active while you still have remaining attempts. However, access to certain HRMS features will be temporarily restricted if you exhaust your attempts.

          Please ensure all required steps are completed promptly. Once done, full access will be automatically restored.
        </div>
      )}

      {countPersonalInfo > 3 && (
        <div style={{ marginBottom: '16px', color: 'red', fontWeight: 'bold' }}>
          ⚠️ You have exceeded the maximum number of allowed attempts. Due to non-compliance, access to certain HRMS other options has been blocked.
          To regain access, please fill in the missing information you will able to access all the HRMS features.
        </div>
      )}
      <div className={styles.profileResumeContainer}>
        <div className={styles.profilePicture}>
          <img
            src={defaultProfile}
            alt="Profile"
          />
        </div>
        {/* <div className={styles.resumeButton}>
          <button onClick={handleResumeClick}>View Resume</button>
          <button onClick={() => setIsSalarySlipModal(true)}>Download Salary Slip</button>
        </div> */}
      </div>

      <div className={styles.personalInfoContainer}>
        <div className={styles.headingContainer}>
          <h5>Employee Personal Information</h5>
          <img className={styles.img} onClick={handleEditModal} src={editIcon} alt="Edit Icon" />
        </div>

        {employeeData ? (
          <div className={styles.infoFields}>
            <div className={styles.infoItem}><strong>Employee ID:</strong> {employeeData.employeeId}</div>
            <div className={styles.infoItem}><strong>First Name:</strong> {employeeData.firstName}</div>
            <div className={styles.infoItem}><strong>Middle Name:</strong> {employeeData.middleName || 'N/A'}</div>
            <div className={styles.infoItem}><strong>Last Name:</strong> {employeeData.lastName}</div>
            <div className={styles.infoItem}>
              <strong>Date of Birth:</strong>
              {new Date(employeeData.dateOfBirth).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
            <div className={styles.infoItem}><strong>Contact Number:</strong> {employeeData.contactNumber}</div>
            <div className={styles.infoItem}><strong>Emergency Contact Person:</strong> {employeeData.emergencyContactPerson}</div>
            <div className={styles.infoItem}><strong>Emergency Contact Relation:</strong> {employeeData.emergencyContactRelation}</div>
            <div className={styles.infoItem}><strong>Emergency Contact Number:</strong> {employeeData.emergencyContactNumber}</div>
            <div className={styles.infoItem}><strong>Email:</strong> {employeeData.email}</div>
            <div className={styles.infoItem}><strong>Personal Email:</strong> {employeeData.personalEmail || 'N/A'}</div>
            <div className={styles.infoItem}><strong>Gender:</strong> {employeeData.gender}</div>
            <div className={styles.infoItem}><strong>Blood Group:</strong> {employeeData.bloodGroup || 'N/A'}</div>
            <div className={styles.infoItem}><strong>Band:</strong> {getBandName(employeeData.band)}</div>
            <div className={styles.infoItem}><strong>Employee Role:</strong> {employeeRole(employeeData.MasterSubRole)}</div>
            <div className={styles.infoItem}>
              <strong>Date of Joining:</strong>
              {new Date(employeeData.dateOfJoining).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
            <div className={styles.infoItem}><strong>Highest Qualification:</strong> {employeeData.highestQualification}</div>
            <div className={styles.infoItem}><strong>Highest Qualification Year-Month:</strong> {highestQualificationYearMonth}</div>
            <div className={styles.infoItem}>
              <strong>Full Stack Ready:</strong> {fullStackReady ? "Yes" : "No"}
            </div>

            <div className={styles.addressSection}>
              <h6 className={styles.headingContainer}>Documents</h6>
              {documentTypes.map(({ key, label }) => {
                const docStatus = documentStatusDetails?.documents?.[key];
                return (
                  <div key={key} className={styles.infoItem}>
                    <div className={styles.documentRow}>
                      <div><strong>{label}:</strong></div>
                      <div className={styles.documentActions}>
                        <div className={styles.documentStatus}>
                          Status: {
                            docStatus ? (
                              <span style={{
                                color: docStatus.status === 'Accepted' ? 'green' :
                                  docStatus.status === 'Rejected' ? 'red' :
                                    docStatus.status === 'Pending' ? 'orange' : 'gray'
                              }}>
                                {docStatus.status}
                              </span>
                            ) : (
                              <span style={{ color: 'gray' }}>Not Uploaded</span>
                            )
                          }
                        </div>
                        <div className={styles.documentButtons}>
                          <Button
                            className={styles.resumeButton}
                            onClick={() => fetchDocuments(key)}
                            disabled={!docStatus?.uploaded}
                          >
                            Download
                          </Button>
                          <Button
                            className={styles.resumeButton}
                            onClick={() => fetchDocumentsView(key)}
                            disabled={!docStatus?.uploaded}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Residential Address Section */}
            {employeeData.addresses && (
              <div className={styles.addressSection}>
                <h6 className={styles.headingContainer}>Residential Address</h6>
                <div className={styles.infoItem}><strong>Type:</strong> {employeeData.addresses.residentialAddressType || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Address Line 1:</strong> {employeeData.addresses.residentialAddress1 || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Address Line 2:</strong> {employeeData.addresses.residentialAddress2 || 'N/A'}</div>
                <div className={styles.infoItem}><strong>City:</strong> {employeeData.addresses.residentialCity || 'N/A'}</div>
                <div className={styles.infoItem}><strong>State:</strong> {employeeData.addresses.residentialState || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Zipcode:</strong> {employeeData.addresses.residentialZipcode || 'N/A'}</div>
              </div>
            )}

            {/* Permanent Address Section */}
            {employeeData.addresses && (
              <div className={styles.addressSection}>
                <h6 className={styles.headingContainer}>Permanent Address</h6>
                <div className={styles.infoItem}><strong>Type:</strong> {employeeData.addresses.permanentAddressType || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Address Line 1:</strong> {employeeData.addresses.permanentAddress1 || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Address Line 2:</strong> {employeeData.addresses.permanentAddress2 || 'N/A'}</div>
                <div className={styles.infoItem}><strong>City:</strong> {employeeData.addresses.permanentCity || 'N/A'}</div>
                <div className={styles.infoItem}><strong>State:</strong> {employeeData.addresses.permanentState || 'N/A'}</div>
                <div className={styles.infoItem}><strong>Zipcode:</strong> {employeeData.addresses.permanentZipcode || 'N/A'}</div>
              </div>
            )}

            {/* Skills Section */}
            <div className={styles.skillsSection}>
              <h6 className={styles.headingContainer}>Skills</h6>
              {employeeData.skills && employeeData.skills.length > 0 ? (
                employeeData.skills.map((skill, index) => (
                  <div className={styles.infoItem} key={index}>
                    <strong>{skill.skillLevel}:</strong> {skill.skillName}
                  </div>
                ))
              ) : (
                <div className={styles.infoItem}> <strong>No Skills</strong> </div>
              )}
            </div>

          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>

      <EditPersonalDetails
        isEditModal={isEditModal}
        setIsEditModal={setIsEditModal}
        employeeData={employeeData}
        fetchEmployeeData={fetchEmployeeData}
        fetchSkills={fetchSkills}
      />

      <Modal
        open={isSalarySlipModal}
        title="Download Salary Slip"
        onCancel={handleCancelModal}
        footer={[
          <Button key="back" onClick={handlePrevious} disabled={currentStep === 0}>
            Previous
          </Button>,
          <Button
            key="next"
            type="primary"
            onClick={currentStep === 0 ? handleSubmit : handleNext}
            className={styles.nextBtn}
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>,
        ]}
      >
        <Steps current={currentStep}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <div style={{ marginTop: 24 }}>
          {currentStep === 0 && (
            <div className={styles.innerForm}>
              <form onSubmit={handleSubmit}>
                <div className={styles.inputContainer}>
                  <label className={styles.leable} htmlFor="email">Email:</label>
                  <input
                    type="text"
                    id="email"
                    value={email}
                    placeholder="Username"
                    onChange={handleEmailChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputContainer1}>
                  <label className={styles.leablePass} htmlFor="password">Password:</label>
                  <div className={styles.passDiv}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      placeholder="Password"
                      onChange={handlePasswordChange}
                      className={styles.input}
                    />
                    <span onClick={handleShowPasswordChange} className="eyeIcon">
                      {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </span>
                  </div>

                </div>

                <Button
                  type="submit"
                  onClick={handleSubmit}
                  className="submitButton"

                >

                </Button>
              </form>
            </div>
          )}

          {currentStep === 1 && (
            <div style={{ textAlign: 'center' }}>
              <h1>Verification Successful</h1>
              <p>Click Next to proceed to the final step.</p>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ textAlign: 'center' }}>
              <div className={styles.nameDiv}>

                <Select placeholder="Select Month" style={{ width: 200 }}
                  onChange={(value) => setMonth(value)} >
                  {months.map((month, index) => (
                    <Option key={index} value={month}>
                      {month}
                    </Option>
                  ))}
                </Select>
                <Select placeholder="Select Year" style={{ width: 200 }}
                  onChange={(value) => setYear(value)}
                >
                  {years.map((year, index) => (
                    <Option key={index} value={year}>
                      {year}
                    </Option>
                  ))}
                </Select>
              </div>
              <div className={styles.btnDivSlip}>
                <Button type="primary" className={styles.nextBtn} onClick={handleDownloadSalarySlip}>Download Salary Slip</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Missing Information</span>
          </div>
        }
        open={isMissingInfoModal}
        onOk={handleModalOk}
        onCancel={() => setIsMissingInfoModal(false)}
        footer={[
          <Button key="ok" type="primary" onClick={handleModalOk}>
            OK
          </Button>
        ]}
        maskClosable={false}
        closable={false}
      >
        {countPersonalInfo <= 3 && countPersonalInfo >= 0 && (
          <div style={{ marginBottom: '16px', color: 'red' }}>
            Kindly note: You have {3 - countPersonalInfo} attempts remaining to complete the required information listed below.

            Your account remains active while you still have remaining attempts. However, access to certain HRMS features will be temporarily restricted if you exhaust your attempts.

            Please ensure all required steps are completed promptly. Once done, full access will be automatically restored.

            Any other personal info which is field in but which may have, add changed should be updated such as phone number,addresa etc
            <p>If you do not fulfill the following requirements, your HRMS account will be blocked after 19/06/2025, and you will not be able to log in, regardless of how many attempts you have left </p>

          </div>
        )}

        {countPersonalInfo > 3 && (
          <div style={{ marginBottom: '16px', color: 'red', fontWeight: 'bold' }}>
            ⚠️ You have exceeded the maximum number of allowed attempts. Due to non-compliance, access to certain HRMS other options has been blocked.
            To regain access, please fill in the missing information you will able to access all the HRMS features.

            Any other personal info which is field in but which may have, add changed should be updated such as phone number, addresa etc

            <p>If you do not fulfill the following requirements, your HRMS account will be blocked after 19/06/2025, and you will not be able to log in, regardless of how many attempts you have left </p>
          </div>
        )}
        <div>
          <p>Please complete the following information to proceed:</p>
        </div>
        <ul style={{ paddingLeft: "30px" }}>
          {missingInfoMessage
            ?.split(/,|\n|:/)
            .map(item => item.trim())
            .filter(item => item && item.toLowerCase() !== "missing information")
            .map((item, index) => (
              <li key={index}>{item}</li>
            ))}
        </ul>
      </Modal>
    </div>
  );
}

export default PersonalInfoPage;
