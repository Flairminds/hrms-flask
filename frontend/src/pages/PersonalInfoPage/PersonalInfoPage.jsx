import React, { useState, useEffect } from 'react';
import styles from './PersonalInfoPage.module.css';
import defaultProfile from '../../assets/profile/prof.svg';
import editIcon from "../../assets/HR/edit.svg";
import axiosInstance, { downloadSalarySlip, downloadSalarySlipViaEmail, getCompanyBands, getCompanyRoles, getDocuments, getEmployeeDetails, getSkillsForEmp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EditPersonalDetails } from '../../components/modal/editPersonalDetails/EditPersonalDetails';
import { Modal, Button, Steps, message, Select, Row, Col, Typography, Avatar, Card, Tag, Space } from 'antd';
import { UserOutlined, SolutionOutlined, CreditCardOutlined, SmileOutlined, EyeOutlined, EyeInvisibleOutlined, ExclamationCircleOutlined, HomeOutlined, FileTextOutlined, ToolOutlined, MailOutlined, PhoneOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../../components/common/WidgetCard';

const { Title, Text } = Typography;

const { Step } = Steps;
const { Option } = Select;

function PersonalInfoPage() {
  const { user } = useAuth();
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

  const [missingInfoMessage, setMissingInfoMessage] = useState('');
  const [countPersonalInfo, setCountPersonalInfo] = useState(0);
  const [warningMessage, setWarningMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(true);

  const [documentStatus, setDocumentStatus] = useState({});
  const [documentStatusDetails, setDocumentStatusDetails] = useState(null);

  const months = [
    "January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October",
    "November", "December",
  ];

  const years = ["2025", "2024", "2023", "2022"]

  const fetchEmployeeData = async () => {
    try {
      const employeeId = user?.employeeId;
      if (!employeeId) {
        console.error('No employee ID available from context');
        return;
      }
      const response = await getEmployeeDetails(employeeId);
      setEmployeeData(response.data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError(error.message || 'Error fetching employee data');
    }
  };

  const checkCompleteEmployeeDetails = async () => {
    // const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
  };

  const fetchDocumentStatus = async () => {
    // const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/document-verification-status/${employeeId}`);
  };

  const fetchDocumentStatusDetails = async () => {
    // const response = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/document-status-details/${employeeId}`);
  };

  useEffect(() => {
    fetchEmployeeData();
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
      const employeeId = user?.employeeId;
      if (!employeeId) return;
      const response = await getSkillsForEmp(employeeId);
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
      const employeeId = user?.employeeId;
      if (!employeeId) return;
      const response = await getDocuments(employeeId, docType);

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
      const employeeId = user?.employeeId;
      if (!employeeId) return;
      const response = await getDocuments(employeeId, docType);

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
    // const response = await axiosInstance.post(`https://hrms-flask.azurewebsites.net/api/increment-address-counter/${employeeId}`);
  };


  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <Text type="secondary">{label}:</Text>
      <Text strong>{value || 'N/A'}</Text>
    </div>
  );

  return (
    <div className={styles.employeeDetailsContainer}>
      <div className={styles.contentWrapper}>
        {/* Missing Info Alerts */}
        {!isLoading && countPersonalInfo <= 3 && countPersonalInfo >= 0 && !warningMessage && (
          <Card style={{ marginBottom: '24px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}>
            <Text type="danger" strong>
              <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
              Kindly note: You have {3 - countPersonalInfo} attempts remaining to fill the required information.
            </Text>
            <div style={{ marginTop: '8px', fontSize: '13px' }}>
              Your account remains active while you still have remaining attempts. However, access to certain HRMS features will be temporarily restricted if you exhaust your attempts.
              Please ensure all required steps are completed promptly.
            </div>
          </Card>
        )}

        {countPersonalInfo > 3 && (
          <Card style={{ marginBottom: '24px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7' }}>
            <Text type="danger" strong>
              <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
              ⚠️ You have exceeded the maximum number of allowed attempts. Access to certain features has been blocked.
            </Text>
          </Card>
        )}

        {/* Profile Header */}
        <WidgetCard style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <Avatar size={100} src={defaultProfile} style={{ border: '4px solid #f0f2f5' }} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {employeeData?.lastName ? `${employeeData?.firstName} ${employeeData?.lastName}` : employeeData?.firstName}
                </Title>
                <Tag color="blue" style={{ marginTop: '4px' }}>{user?.roleName}</Tag>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Text type="secondary"><MailOutlined style={{ marginRight: '8px' }} />{employeeData?.email}</Text>
                  <Text type="secondary"><PhoneOutlined style={{ marginRight: '8px' }} />{employeeData?.contactNumber}</Text>
                </div>
              </div>
            </div>
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEditModal} style={{ borderRadius: '4px' }}>
                Edit Profile
              </Button>
              <Button icon={<CreditCardOutlined />} onClick={() => setIsSalarySlipModal(true)} style={{ borderRadius: '4px' }}>
                Salary Slips
              </Button>
            </Space>
          </div>
        </WidgetCard>

        {employeeData ? (
          <Row gutter={[24, 24]}>
            {/* Personal Details */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Personal Details" icon={<UserOutlined />} iconColor="#1890ff">
                <InfoRow label="Employee ID" value={employeeData.employeeId} />
                <InfoRow label="First Name" value={employeeData.firstName} />
                <InfoRow label="Middle Name" value={employeeData.middleName} />
                <InfoRow label="Last Name" value={employeeData.lastName} />
                <InfoRow label="Date of Birth" value={employeeData.dateOfBirth && new Date(employeeData.dateOfBirth).toLocaleDateString('en-GB')} />
                <InfoRow label="Gender" value={employeeData.gender} />
                <InfoRow label="Blood Group" value={employeeData.bloodGroup} />
                <InfoRow label="Personal Email" value={employeeData.personalEmail} />
                <InfoRow label="Date of Joining" value={employeeData.dateOfJoining && new Date(employeeData.dateOfJoining).toLocaleDateString('en-GB')} />
                <InfoRow label="Band" value={employeeData.designationName} />
                <InfoRow label="Highest Qualification" value={employeeData.highestQualification} />
                <InfoRow label="Qualification Date" value={highestQualificationYearMonth} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <Text type="secondary">Full Stack Ready:</Text>
                  <Tag color={fullStackReady ? 'success' : 'default'}>{fullStackReady ? "Yes" : "No"}</Tag>
                </div>
              </WidgetCard>
            </Col>

            {/* Address Information */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <WidgetCard title="Residential Address" icon={<HomeOutlined />} iconColor="#52c41a">
                  {employeeData.addresses ? (
                    <>
                      <InfoRow label="Line 1" value={employeeData.addresses.residentialAddress1} />
                      <InfoRow label="Line 2" value={employeeData.addresses.residentialAddress2} />
                      <InfoRow label="City" value={employeeData.addresses.residentialCity} />
                      <InfoRow label="State" value={employeeData.addresses.residentialState} />
                      <InfoRow label="Zipcode" value={employeeData.addresses.residentialZipcode} />
                    </>
                  ) : <Text type="secondary">No address info available</Text>}
                </WidgetCard>

                <WidgetCard title="Permanent Address" icon={<HomeOutlined />} iconColor="#fadb14">
                  {employeeData.addresses ? (
                    <>
                      <InfoRow label="Line 1" value={employeeData.addresses.permanentAddress1} />
                      <InfoRow label="Line 2" value={employeeData.addresses.permanentAddress2} />
                      <InfoRow label="City" value={employeeData.addresses.permanentCity} />
                      <InfoRow label="State" value={employeeData.addresses.permanentState} />
                      <InfoRow label="Zipcode" value={employeeData.addresses.permanentZipcode} />
                    </>
                  ) : <Text type="secondary">No address info available</Text>}
                </WidgetCard>
              </Space>
            </Col>

            {/* Documents Section */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Documents" icon={<FileTextOutlined />} iconColor="#eb2f96">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {documentTypes.map(({ key, label }) => {
                    const docStatus = documentStatusDetails?.documents?.[key];
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                          <Text strong>{label}</Text>
                          <br />
                          {docStatus ? (
                            <Tag color={docStatus.status === 'Accepted' ? 'success' : docStatus.status === 'Rejected' ? 'error' : 'warning'}>
                              {docStatus.status}
                            </Tag>
                          ) : <Text type="secondary" style={{ fontSize: '12px' }}>Not Uploaded</Text>}
                        </div>
                        <Space>
                          <Button size="small" icon={<DownloadOutlined />} onClick={() => fetchDocuments(key)} disabled={!docStatus?.uploaded} />
                          <Button size="small" icon={<EyeOutlined />} onClick={() => fetchDocumentsView(key)} disabled={!docStatus?.uploaded} />
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </WidgetCard>
            </Col>

            {/* Skills Section */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Skills" icon={<ToolOutlined />} iconColor="#722ed1">
                {employeeData.skills && employeeData.skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {employeeData.skills.map((skill, index) => (
                      <Tag key={index} color="blue" style={{ borderRadius: '4px', padding: '4px 8px', whiteSpace: 'pre-wrap' }}>
                        <Text strong>{skill.skillName}</Text>
                        <Text type="secondary" style={{ marginLeft: '4px', fontSize: '12px' }}>({skill.skillLevel})</Text>
                      </Tag>
                    ))}
                  </div>
                ) : <Text type="secondary">No skills listed</Text>}
              </WidgetCard>
            </Col>

            {/* Emergency Contact */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Emergency Contact" icon={<ExclamationCircleOutlined />} iconColor="#ff4d4f">
                <InfoRow label="Person" value={employeeData.emergencyContactPerson} />
                <InfoRow label="Relation" value={employeeData.emergencyContactRelation} />
                <InfoRow label="Number" value={employeeData.emergencyContactNumber} />
              </WidgetCard>
            </Col>
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>Loading employee details...</div>
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
