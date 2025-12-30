import React, { useState, useEffect } from 'react';
import { Upload,Button, Input, Modal, Collapse, Checkbox, Select, message, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import stylesEdit from './EditPersonalDetails.module.css';
import axiosInstance, { addUpdateSkill, deleteDocument, editPersonalDetails, getAllEmployeeSkills, getDocStatus, getDocuments, getSkillsForEmp } from '../../../services/api';
import { getCookie } from '../../../util/CookieSet';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import moment from 'moment';
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
 
const { Panel } = Collapse;
 
export const EditPersonalDetails = ({ isEditModal, setIsEditModal, employeeData, fetchEmployeeData ,fetchSkills}) => {

  const[warningMessage,setWarningMessage]=useState(null)
  const [loader, setLoader] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
 
  const [errorNumber, setErrorNumber] = useState('');

  const [formData, setFormData] = useState({
    contactNumber: '',
    emergencyContactPerson: '',
    emergencyContactRelation: '',
    emergencyContactNumber: '',
    employeeSkills: [
      {
        skillId: 0,
        skillName: '',
        skillLevel: ''
      }
    ],
    addresses: [
      {
        residentialAddressType: '',
        residentialState: '',
        residentialCity: '',
        residentialAddress1: '',
        residentialAddress2: '',
        residentialZipcode: '',
        permanentAddressType: '',
        permanentState: '',
        permanentCity: '',
        permanentAddress1: '',
        permanentAddress2: '',
        permanenentZipcode: '',
        isSamePermanant: false
      }
    ]
  });

  const[qualificationYearMonth,setQualificationYearMonth]=useState(null)
  const[fullStackReady,setFullStackReady]=useState(false)
  // const [isReady, setIsReady] = useState(null);

  // const [selectedSkill, setSelectedSkill] = useState(null);
  // const [skillLevel, setSkillLevel] = useState(null);
  // const [isReadyDate, setIsReadyDate] = useState(null);
  const[empSkill,setEmpSkill]=useState([])
  console.log(empSkill,"empSkill");
  
  const[docStatus,setDocStatus]=useState([])

  const employeeIdCookie = getCookie('employeeId');

  const [file, setFile] = useState({});


  const fetchDocStatus =async()=>{
    const response = await getDocStatus(employeeIdCookie)
    setDocStatus(response.data.documents) 
  }

  useEffect(()=>{
    fetchDocStatus();
  },[file])


  // useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await getDocuments();
    
        // ✅ Debug response
        console.log("Response Status:", response.status);
        console.log("Response Headers:", response.headers);
        console.log("Response Content-Type:", response.headers["content-type"]);
    
        if (response.status !== 200) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }
    
        // ✅ Convert response data to Blob
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
        message.error("Error downloading document");
      }
    };
    
    
    
    
    // fetchDocuments();
  // }, []);


  const beforeUpload = async (file, docType) => {
    if (file.type !== "application/pdf") {
      message.error("Only PDF files are allowed!");
      return false;
    }
    setFile((prev) => ({ ...prev, [docType]: file }));
    try {
      await uploadFile(file, docType);
      message.success(`${docType} uploaded successfully!`);

    } catch (error) {
      message.error(`Failed to upload ${docType}`);
    }
    return false;
  };


  const uploadFile = async (file, docType) => {
    const formData = new FormData();
    formData.append("emp_id", employeeIdCookie);
    formData.append("doc_type", docType);
    formData.append("file", file);
    formData.append("set_verified_null", "true");

    try {
      const response = await fetch("https://hrms-flask.azurewebsites.net/api/upload-document", {
        method: "POST",
        body: formData,
      });
      fetchDocStatus();

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // const handleRemove = async (docType) => {
  //   try {
  //     const response = await deleteDocument(employeeIdCookie, docType);
  //     const result = response.data;
  
  //     if (response.status !== 200) {
  //       throw new Error(result.error || result.message || "Failed to delete file");
  //     }
  
  //     setFile((prev) => {
  //       const newFiles = { ...prev };
  //       delete newFiles[docType];
  //       return newFiles;
  //     });
  
  //     message.success("File removed successfully!");
  //   } catch (error) {
  //     console.error("Delete error:", error);
  //     message.error(error.response?.data?.error || "Failed to remove file!");
  //   }
  // };
  
  
  

  const documentTypes = [
    { key: "tenth", label: "10th Marksheet" },
    { key: "twelve", label: "12th Marksheet" },
    { key: "adhar", label: "Aadhar Card" },
    { key: "pan", label: "Pan Card" },
    { key: "grad", label: "Graduation Degree" },
    { key: "resume", label: "Resume" }
  ];


  // const [skills, setSkills] = useState([
  //   { SkillId: null, skillLevel: null, isReady: null, isReadyDate: null },
  // ]);


  // Handle Skill Change
  // const handleSkillChange = (value) => {
  //   setSelectedSkill(value);
  // };
  // const handleSkillChange = (index, value) => {
  //   setEmpSkill(prev => prev.map((skill, i) =>
  //     i === index ? { ...skill, skillId: value } : skill
  //   ));
  // };
  const handleSkillChange = (index, value) => {
    const updatedSkills = [...empSkill];
    updatedSkills[index] = { 
      ...updatedSkills[index], 
      SkillId: value, 
    };
    setEmpSkill(updatedSkills);
  };
  
  

  // Handle Skill Level Change
  // const handleSkillLevelChange = (value) => {
  //   setSkillLevel(value);
  // };

  const handleSkillLevelChange = (index, value) => {
    setEmpSkill(prev => prev.map((skill, i) =>
      i === index ? { ...skill, SkillLevel: value } : skill
    ));
  };
  

  // Handle Checkbox Change
  // const handleIsReadyChange = (value) => {
  //   console.log("h");
    
  //   setIsReady(value);
  //   if (value === "Yes") {
  //     setIsReadyDate(null); 
  //   }
  // };

  // const handleIsReadyChange = (index, value) => {
  //   setEmpSkill(prev => prev.map((skill, i) =>
  //     i === index ? { ...skill, isReady: value, isReadyDate: value === 1 ? null : skill.isReadyDate } : skill
  //   ));
  // };

  const handleIsReadyChange = (index, value) => {
    setEmpSkill(prev => {
      const updatedSkills = prev.map((skill, i) =>
        i === index
          ? { 
            ...skill, 
            isReady: skill.isReady === null ? 1 : value, 
            isReadyDate: (skill.isReady === null || value === 1) ? null : skill.isReadyDate 
          }

          : skill
      );
      return updatedSkills;
      
    });
    
  };
  
  


  const handleDateChange = (index, dateString) => {
    setEmpSkill(prev =>
      prev.map((skill, i) =>
        i === index ? { ...skill, isReadyDate: dateString || null } : skill
      )
    );
  };
  


 


  // const handleAddSkill = () => {
  //   setFormData(
  //     prevState => ({
      
  //     ...prevState,
  //     skills: [
  //       ...prevState.skills,
  //       {
  //         skillId: '',
  //         skillLevel: 'Primary'
  //       }
  //     ]
  //   }));
  // };

  
 
  useEffect(() => {
    if (employeeData) {
      setFormData({ ...employeeData });
    }
    const fetchSkills = async () => {
      try {
        const response = await getAllEmployeeSkills();
        setAvailableSkills(response.data || []);
      } catch (error) {
        console.error('Error fetching skills:', error);
      }
    };
 
    fetchSkills();
  }, [employeeData]);
 
 useEffect(() =>{
  const fetchSkills = async () => {
    try {
      const response = await getSkillsForEmp(employeeIdCookie);
      setQualificationYearMonth(response.data.QualificationYearMonth)
      setFullStackReady(response.data.FullStackReady)
      // Map the skills data to match our state structure
      const mappedSkills = response.data.skills.map(skill => ({
        SkillId: skill.SkillId,
        SkillName: skill.SkillName,
        SkillLevel: skill.SkillLevel,
        isReady: skill.isReady,
        isReadyDate: skill.isReadyDate,
        SelfEvaluation: skill.SelfEvaluation || "1" // Set default to "1" if not present
      }));
      setEmpSkill(mappedSkills);
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  fetchSkills();
  

 },[])
  const handleCancel = () => {
    setIsEditModal(false);
  };
 
  const handleInputChange = (e) => {
    const { name, value } = e.target || e; 
    const [field, index, key] = name.split('.'); 
    if (field === 'employeeSkills') {
      const updatedSkills = [...formData.skills];
      updatedSkills[index][key] = value;
 
      setFormData(prevState => ({
        ...prevState,
        skills: updatedSkills
      }));
    } else if (field === 'addresses') {
      setFormData(prevState => ({
        ...prevState,
        addresses: {
          ...prevState.addresses,
          [index]: value,
          isSamePermanant: false
        }
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };
 
  const handleEditPersonalInfo = async () => {
    
    if (formData.contactNumber === formData.emergencyContactNumber) {
      setErrorNumber('Contact Number and Emergency Contact Number cannot be the same.');
      return;
    }
    const testData = ({
      ...formData,
      addresses: [formData.addresses],
      employeeSkills: formData.skills
    });
    setErrorNumber('');
    setLoader(true);
    
    try {
      const employeeId = getCookie('employeeId');
      
      const response = await editPersonalDetails(testData, employeeId);
      if (response.status === 200) {
        fetchEmployeeData();
        message.success("Updated Successfully")
        handleUpdateSkill(employeeId)
        setIsEditModal(false)
        fetchSkills()
      }
      const responsePersonal = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
         if(responsePersonal.data.status){
          window.location.reload();
         }
          // setWarningMessage(response.data.status);
      
    
    } catch (error) {
      console.error('Error updating personal details:', error);
      toast.error("Error updating personal details:")
      setIsEditModal(false);
    } finally {
      
      setLoader(false);
      fetchSkills()
    }
  };

  const handleQualification = (dateString) => {
    setQualificationYearMonth(dateString || "2025-10-31"); // Default to 31/10/2025 if empty
};

  // const handleRemoveSkill = (index) => {
  //   const updatedSkills = formData.employeeSkills.filter((_, i) => i !== index);
  //   setFormData(prevState => ({
  //     ...prevState,
  //     employeeSkills: updatedSkills
  //   }));
  // };
  
  const handleUpdateSkill = async (employeeId) => {
    const payload = {
      EmployeeId: employeeId, 
      QualificationYearMonth:qualificationYearMonth,
      skills :empSkill,
      FullStackReady:fullStackReady
    };
    

    try{
      const response = await addUpdateSkill(payload)
      fetchEmployeeData()
      
    }
    catch(err){
      console.log(err);
      
    }

    
  };

  const handleAddSkill = () => {
    const newSkill = { 
      SkillId: null,  
      SkillLevel: null, 
      isReady: 1, 
      isReadyDate: "2025-10-31",
      SelfEvaluation: "1"
    };
  
    setEmpSkill([...empSkill, newSkill]); 
  };
  
  

  const convertDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0]; // Ensure valid date
  };
  

  
  const handleSelfEvaluationChange = (index, value) => {
    setEmpSkill(prev => prev.map((skill, i) =>
      i === index ? { ...skill, SelfEvaluation: value } : skill
    ));
  };
  

  
  const getEvaluationMessage = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0 && numScore < 1) return "Does not meet requirements";
    if (numScore >= 1 && numScore < 2) return "Does not meet requirements";
    if (numScore >= 2 && numScore < 3) return "Occasionally meets requirements";
    if (numScore >= 3 && numScore < 4) return "Meets requirements / Average";
    if (numScore >= 4 && numScore < 5) return "Above average";
    if (numScore === 5) return "Exceeds expectations";
    return "";
  };
  

  
  return (
    <Modal
      title="Edit Personal Details"
      open={isEditModal}
      onCancel={handleCancel}
      centered
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
        
        <Button key="submit" type="primary" className={stylesEdit.btnEdit} onClick={handleEditPersonalInfo} loading={loader}>
          Update
        </Button>,
      ]}
      width={650}
    >
      <div className={stylesEdit.main}>
        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Contact Number</span>
          <Input
            name="contactNumber"
            value={formData.contactNumber || ''}
            onChange={handleInputChange}
          />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Emergency Contact Person</span>
          <Input
            name="emergencyContactPerson"
            value={formData.emergencyContactPerson || ''}
            onChange={handleInputChange}
          />
        </div>
 
        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Emergency Contact Relation</span>
          <Input
            name="emergencyContactRelation"
            value={formData.emergencyContactRelation || ''}
            onChange={handleInputChange}
          />
        </div>
 
        <div className={stylesEdit.inputDiv}>
        {errorNumber && <p style={{ color: 'red', marginTop: '5px' }}>{errorNumber}</p>}
          <span className={stylesEdit.heading}>Emergency Contact Number</span>
          <Input
            name="emergencyContactNumber"
            value={formData.emergencyContactNumber || ''}
            onChange={handleInputChange}
          />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Highest Qualification Year-Month</span>
          {/* <DatePicker 
              value={qualificationYearMonth ? moment(qualificationYearMonth, "YYYY-MM-DD") : null}
              // onClick={setQualificationYearMonth(null)}
              onChange={(date, dateString) => handleQualification( date, dateString)}
              // format="YYYY-MM-DD" 
                    /> */}
            <input 
              type="date" className={stylesEdit.customdatepicker} style={{width:"100%"}}
              value={qualificationYearMonth ? qualificationYearMonth : ""}
              onChange={(e) => handleQualification(e.target.value)}
            />

        </div>

        <div className={stylesEdit.inputDiv}>
          <p></p>
          <span className={stylesEdit.heading}>Full Stack Ready</span>
            <p style={{color:"orange"}}>Are u ready for customer project skills atleast level 1</p>
            <p style={{color:"orange"}}>Any backend or frontend technology is acceptable. However, if you select 'Yes' for Full Stack, please make sure that both backend and frontend technologies are included below</p>
                <Checkbox value={fullStackReady} checked={fullStackReady === true} onChange={()=>setFullStackReady(true)}>
                  Yes
                </Checkbox>

                <Checkbox value={fullStackReady} checked={fullStackReady === false}  onChange={()=>setFullStackReady(false)}>
                  No
                </Checkbox>
        </div>
 
        <Collapse className={stylesEdit.collapseDiv} defaultActiveKey={['1', '2', '3']} accordion>
          <Panel header="Residential Address" key="1">
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address Type</span>
              <Input
                name="addresses.residentialAddressType"
                value={formData?.addresses?.residentialAddressType || ''}
                onChange={handleInputChange}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 1</span>
              <Input
                name="addresses.residentialAddress1"
                value={formData.addresses?.residentialAddress1 || ''}
                onChange={handleInputChange}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 2</span>
              <Input
                name="addresses.residentialAddress2"
                value={formData.addresses?.residentialAddress2 || ''}
                onChange={handleInputChange}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>City</span>
              <Input
                name="addresses.residentialCity"
                value={formData.addresses?.residentialCity || ''}
                onChange={handleInputChange}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>State</span>
              <Input
                name="addresses.residentialState"
                value={formData.addresses?.residentialState || ''}
                onChange={handleInputChange}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Zipcode</span>
              <Input
                name="addresses.residentialZipcode"
                value={formData.addresses?.residentialZipcode || ''}
                onChange={handleInputChange}
              />
            </div>
          </Panel>
          
          <Panel className={stylesEdit.panel} header="Permanent Address" key="2">
            <div className={stylesEdit.inputDiv}>
              <Checkbox
                checked={formData.addresses.isSamePermanant || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData(prevState => ({
                    ...prevState,
                    addresses: {
                      ...prevState.addresses,
                      isSamePermanant: isChecked,
                      permanentAddressType: isChecked ? prevState.addresses.residentialAddressType : '',
                      permanentAddress1: isChecked ? prevState.addresses.residentialAddress1 : '',
                      permanentAddress2: isChecked ? prevState.addresses.residentialAddress2 : '',
                      permanentCity: isChecked ? prevState.addresses.residentialCity : '',
                      permanentState: isChecked ? prevState.addresses.residentialState : '',
                      permanenentZipcode: isChecked ? prevState.addresses.residentialZipcode : ''
                    }
                  }));
                }}
                >
                Same as Residential Address
              </Checkbox>
            </div>

            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address Type</span>
              <Input
                name="addresses.permanentAddressType"
                value={formData.addresses.permanentAddressType || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 1</span>
              <Input
                name="addresses.permanentAddress1"
                value={formData.addresses.permanentAddress1 || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 2</span>
              <Input
                name="addresses.permanentAddress2"
                value={formData.addresses.permanentAddress2 || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>City</span>
              <Input
                name="addresses.permanentCity"
                value={formData.addresses.permanentCity || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
 
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>State</span>
              <Input
                name="addresses.permanentState"
                value={formData.addresses.permanentState || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
            
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Zipcode</span>
              <Input
                name="addresses.permanentZipcode"
                value={formData.addresses.permanenentZipcode || ''}
                onChange={handleInputChange}
                disabled={formData.addresses.isSamePermanant}
              />
            </div>
          </Panel>
 
          <Panel header="Skills" key="3">
            {empSkill?.map((skill, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px", padding: "10px" }}>
                {/* Skill Name */}
                <div style={{ display: "flex", alignItems: "center",gap: "10px" }}>
                  <span className="headingSkill">Skill Name</span>
                  <Select 
                    showSearch
                    placeholder="Select a skill" 
                    style={{ width: "80%" }} 
                    onChange={(value) => handleSkillChange(index, value)} 
                    value={skill.SkillId}
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {availableSkills.map((availableSkill) => (
                      <Select.Option key={availableSkill.skillId} value={availableSkill.skillId}>
                        {availableSkill.skillName}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* Skill Level */}
                <div style={{ display: "flex", alignItems: "center" ,gap: "10px"}}>
                  <span className="headingSkill">Skill Level</span>
                  <Select 
                    style={{ width: "80%" }} 
                    onChange={(value) => handleSkillLevelChange(index, value)} 
                    value={skill.SkillLevel}
                  >
                    <Select.Option value="Primary">Primary</Select.Option>
                    <Select.Option value="Secondary">Secondary</Select.Option>
                    <Select.Option value="Cross Tech Skill">Cross Tech Skill</Select.Option>
                  </Select>
                </div>

                {/* Self Evaluation */}
                <div style={{ display: "flex", alignItems: "center", flexDirection: "column", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
                    <span className="headingSkill">Self Evaluation Score </span>
                    <input 
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={skill.SelfEvaluation}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value >= 0 && value <= 5) {
                          handleSelfEvaluationChange(index, value.toString());
                        }
                      }}
                      placeholder="Enter self evaluation (0-5)"  
                      style={{ width: "15%", height: "30px", borderRadius: "5px", border: "1px solid #ccc", padding: "5px" }}
                    />
                    <span className="headingSkill">/ 5</span>
                  </div>
                  {skill.SelfEvaluation && (
                    <div style={{ 
                      marginTop: "5px", 
                      fontSize: "14px",
                      color: parseFloat(skill.SelfEvaluation) >= 3 ? "green" : 
                             parseFloat(skill.SelfEvaluation) >= 2 ? "orange" : "red",
                      fontWeight: "500"
                    }}>
                      {getEvaluationMessage(skill.SelfEvaluation)}
                    </div>
                  )}
                  {(!skill.SelfEvaluation || skill.SelfEvaluation.trim() === "") && (
                    <div style={{ color: "orange", marginTop: "5px", fontSize: "12px" }}>
                      ⚠️ Self evaluation is empty. Default value of 1 will be used.
                    </div>
                  )}
                </div>

                {/* Is Ready? */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "10px" }}>
                  <span className="headingSkill" style={{paddingRight:"10px"}}>Is Ready? </span>
                  <Checkbox 
                    value={skill.isReady} 
                    checked={skill.isReady === 1} 
                    onChange={() => handleIsReadyChange(index, 1)}
                  > 
                    Yes
                  </Checkbox>

                  <Checkbox 
                    value={skill.isReady} 
                    checked={skill.isReady === 0} 
                    onChange={() => handleIsReadyChange(index, 0)}
                  >
                    No
                  </Checkbox>

                  {skill.isReady === 0 && (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"10px",borderRadius:"5px",marginLeft:"10px"}}>
                      <span className="headingSkill" style={{paddingRight:"10px"}}>Please enter the date by when you will be completing L1 training</span>
                     
                      <input 
                        type="date"  
                        className={stylesEdit.customdatepicker}
                        value={skill.isReadyDate ? convertDate(skill.isReadyDate) : "2025-10-30"} 
                        onChange={(e) => handleDateChange(index, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: "16px" }} onClick={handleAddSkill}>
              Add Skill
            </Button>
          </Panel>


          <Panel header="Documents" key="4">
          <div className={stylesEdit.docStatusDiv}>
            {documentTypes.map(({ key, label }) => {
              const doc = docStatus?.length ? docStatus.find((d) => d.doc_type === key) : null;
              
              
                return (
                  <div key={key} className={stylesEdit.uploadDiv} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #ddd" }}>
                        <p className="font-medium mb-2" style={{ width: "30%" }}>{label}:</p>

                        <div style={{ display:"flex",justifyContent:"flex-end", alignItems: "center", width: "70%", gap: "10px"}}>
                          <Upload beforeUpload={(file) => beforeUpload(file, key)} showUploadList={false}>
                            <Button icon={<UploadOutlined />}>{doc?.uploaded ? "Re-Upload" : "Upload "}</Button>
                          </Upload>

                          <span style={{ fontWeight: "bold", color: doc?.uploaded ? "green" : "red" }}>
                            {doc?.uploaded ? "Uploaded ✅" : "Not Uploaded ⚠️"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                </Panel>
                
              </Collapse>
            </div>
      <ToastContainer/>
    </Modal>
  );
};