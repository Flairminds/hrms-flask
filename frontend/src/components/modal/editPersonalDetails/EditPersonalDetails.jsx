import React, { useState, useEffect } from 'react';
import { Upload, Button, Input, Modal, Collapse, Checkbox, Select, message } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import stylesEdit from './EditPersonalDetails.module.css';
import axiosInstance, { addUpdateSkill, editPersonalDetails, getAllEmployeeSkills, getDocStatus, getSkillsForEmp } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const { Panel } = Collapse;

export const EditPersonalDetails = ({ isEditModal, setIsEditModal, employeeData, fetchEmployeeData, fetchSkills }) => {
  const [loader, setLoader] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [errorNumber, setErrorNumber] = useState('');
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    contact_number: '',
    emergency_contact_person: '',
    emergency_contact_relation: '',
    emergency_contact_number: '',
    personal_email: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    employee_skills: [],
    addresses: {
      residential_address_type: '',
      residential_state: '',
      residential_city: '',
      residential_address1: '',
      residential_address2: '',
      residential_zipcode: '',
      permanent_address_type: '',
      permanent_state: '',
      permanent_city: '',
      permanent_address1: '',
      permanent_address2: '',
      permanent_zipcode: '',
      is_same_permanant: false
    }
  });

  const [qualificationYearMonth, setQualificationYearMonth] = useState(null);
  const [fullStackReady, setFullStackReady] = useState(false);
  const [empSkill, setEmpSkill] = useState([]);
  const [docStatus, setDocStatus] = useState([]);

  const employeeId = user?.employeeId;

  const fetchDocStatus = async () => {
    if (!employeeId) return;
    try {
      const response = await getDocStatus(employeeId);
      setDocStatus(response.data.documents);
    } catch (error) {
      console.error("Error fetching doc status:", error);
    }
  };

  useEffect(() => {
    if (isEditModal) {
      fetchDocStatus();
    }
  }, [isEditModal]);

  useEffect(() => {
    if (employeeData && isEditModal) {
      setFormData({
        contact_number: employeeData.contact_number || '',
        emergency_contact_number: employeeData.emergency_contact_number || '',
        emergency_contact_person: employeeData.emergency_contact_person || '',
        emergency_contact_relation: employeeData.emergency_contact_relation || '',
        personal_email: employeeData.personal_email || '',
        first_name: employeeData.first_name || '',
        middle_name: employeeData.middle_name || '',
        last_name: employeeData.last_name || '',
        date_of_birth: employeeData.date_of_birth || '',
        gender: employeeData.gender || '',
        blood_group: employeeData.blood_group || '',
        addresses: {
          residential_address_type: employeeData.addresses?.residential_address_type || '',
          residential_state: employeeData.addresses?.residential_state || '',
          residential_city: employeeData.addresses?.residential_city || '',
          residential_address1: employeeData.addresses?.residential_address1 || '',
          residential_address2: employeeData.addresses?.residential_address2 || '',
          residential_zipcode: employeeData.addresses?.residential_zipcode || '',
          permanent_address_type: employeeData.addresses?.permanent_address_type || '',
          permanent_state: employeeData.addresses?.permanent_state || '',
          permanent_city: employeeData.addresses?.permanent_city || '',
          permanent_address1: employeeData.addresses?.permanent_address1 || '',
          permanent_address2: employeeData.addresses?.permanent_address2 || '',
          permanent_zipcode: employeeData.addresses?.permanent_zipcode || '',
          is_same_permanant: employeeData.addresses?.is_same_permanant || false,
        },
        employee_skills: employeeData.skills || []
      });
    }

    const fetchAllAvailableSkills = async () => {
      try {
        const response = await getAllEmployeeSkills();
        setAvailableSkills(response.data || []);
      } catch (error) {
        console.error('Error fetching skills:', error);
      }
    };

    if (isEditModal) {
      fetchAllAvailableSkills();
    }
  }, [employeeData, isEditModal]);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!employeeId) return;
      try {
        const response = await getSkillsForEmp(employeeId);
        setQualificationYearMonth(response.data.QualificationYearMonth);
        setFullStackReady(response.data.FullStackReady);
        const mappedSkills = response.data.skills.map(skill => ({
          SkillId: skill.SkillId,
          SkillName: skill.SkillName,
          SkillLevel: skill.SkillLevel,
          isReady: skill.isReady,
          isReadyDate: skill.isReadyDate,
          SelfEvaluation: skill.SelfEvaluation || "1"
        }));
        setEmpSkill(mappedSkills);
      } catch (error) {
        console.error("Error fetching user skills:", error);
      }
    };

    if (isEditModal) {
      fetchUserSkills();
    }
  }, [isEditModal, employeeId]);

  const handleCancel = () => {
    setIsEditModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target || e;
    const [field, subField] = name.split('.');

    if (field === 'addresses') {
      setFormData(prevState => ({
        ...prevState,
        addresses: {
          ...prevState.addresses,
          [subField]: value,
          is_same_permanant: false
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
    if (formData.contact_number === formData.emergency_contact_number && formData.contact_number !== '') {
      setErrorNumber('Contact Number and Emergency Contact Number cannot be the same.');
      return;
    }

    const payload = {
      ...formData,
      addresses: [formData.addresses]
    };

    setErrorNumber('');
    setLoader(true);

    try {
      const response = await editPersonalDetails(payload, employeeId);
      if (response.status === 200) {
        fetchEmployeeData();
        message.success("Updated Successfully");
        await handleUpdateSkill(employeeId);
        setIsEditModal(false);
      }

      const responsePersonal = await axiosInstance.get(`https://hrms-flask.azurewebsites.net/api/complete-employee-details/${employeeId}`);
      if (responsePersonal.data.status) {
        // reload only if specifically needed, but fetchEmployeeData might be enough
        // window.location.reload(); 
      }
    } catch (error) {
      console.error('Error updating personal details:', error);
      toast.error("Error updating personal details");
    } finally {
      setLoader(false);
    }
  };

  const handleQualification = (dateString) => {
    setQualificationYearMonth(dateString || "2025-10-31");
  };

  const handleUpdateSkill = async (empId) => {
    const payload = {
      EmployeeId: empId,
      QualificationYearMonth: qualificationYearMonth,
      skills: empSkill,
      FullStackReady: fullStackReady
    };

    try {
      await addUpdateSkill(payload);
    } catch (err) {
      console.error("Error updating skills:", err);
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

  const handleSkillChange = (index, value) => {
    const updatedSkills = [...empSkill];
    updatedSkills[index] = { ...updatedSkills[index], SkillId: value };
    setEmpSkill(updatedSkills);
  };

  const handleSkillLevelChange = (index, value) => {
    const updatedSkills = [...empSkill];
    updatedSkills[index] = { ...updatedSkills[index], SkillLevel: value };
    setEmpSkill(updatedSkills);
  };

  const handleSelfEvaluationChange = (index, value) => {
    const updatedSkills = [...empSkill];
    updatedSkills[index] = { ...updatedSkills[index], SelfEvaluation: value };
    setEmpSkill(updatedSkills);
  };

  const handleIsReadyChange = (index, value) => {
    const updatedSkills = empSkill.map((skill, i) =>
      i === index ? {
        ...skill,
        isReady: value,
        isReadyDate: value === 1 ? null : (skill.isReadyDate || "2025-10-31")
      } : skill
    );
    setEmpSkill(updatedSkills);
  };

  const handleDateChange = (index, dateString) => {
    const updatedSkills = [...empSkill];
    updatedSkills[index] = { ...updatedSkills[index], isReadyDate: dateString || null };
    setEmpSkill(updatedSkills);
  };

  const convertDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  };

  const getEvaluationMessage = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0 && numScore < 2) return "Does not meet requirements";
    if (numScore >= 2 && numScore < 3) return "Occasionally meets requirements";
    if (numScore >= 3 && numScore < 4) return "Meets requirements / Average";
    if (numScore >= 4 && numScore < 5) return "Above average";
    if (numScore === 5) return "Exceeds expectations";
    return "";
  };

  const uploadFile = async (file, docType) => {
    const uploadFormData = new FormData();
    uploadFormData.append("emp_id", employeeId);
    uploadFormData.append("doc_type", docType);
    uploadFormData.append("file", file);
    uploadFormData.append("set_verified_null", "true");

    try {
      const response = await fetch("https://hrms-flask.azurewebsites.net/api/upload-document", {
        method: "POST",
        body: uploadFormData,
      });
      if (!response.ok) throw new Error("Upload failed");
      message.success(`${docType} uploaded successfully!`);
      fetchDocStatus();
    } catch (error) {
      console.error("Upload error:", error);
      message.error(`Failed to upload ${docType}`);
    }
  };

  const beforeUpload = (file, docType) => {
    if (file.type !== "application/pdf") {
      message.error("Only PDF files are allowed!");
      return false;
    }
    uploadFile(file, docType);
    return false;
  };

  const documentTypes = [
    { key: "tenth", label: "10th Marksheet" },
    { key: "twelve", label: "12th Marksheet" },
    { key: "adhar", label: "Aadhar Card" },
    { key: "pan", label: "Pan Card" },
    { key: "grad", label: "Graduation Degree" },
    { key: "resume", label: "Resume" }
  ];

  return (
    <Modal
      title="Edit Personal Details"
      open={isEditModal}
      onCancel={handleCancel}
      centered
      footer={[
        <Button key="back" onClick={handleCancel}>Cancel</Button>,
        <Button key="submit" type="primary" className={stylesEdit.btnEdit} onClick={handleEditPersonalInfo} loading={loader}>Update</Button>,
      ]}
      width={650}
    >
      <div className={stylesEdit.main}>
        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Contact Number</span>
          <Input name="contact_number" value={formData.contact_number} onChange={handleInputChange} />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Emergency Contact Person</span>
          <Input name="emergency_contact_person" value={formData.emergency_contact_person} onChange={handleInputChange} />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Emergency Contact Relation</span>
          <Input name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} />
        </div>

        <div className={stylesEdit.inputDiv}>
          {errorNumber && <p style={{ color: 'red', marginTop: '5px' }}>{errorNumber}</p>}
          <span className={stylesEdit.heading}>Emergency Contact Number</span>
          <Input name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleInputChange} />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Highest Qualification Year-Month</span>
          <input
            type="date" className={stylesEdit.customdatepicker} style={{ width: "100%" }}
            value={qualificationYearMonth || ""}
            onChange={(e) => handleQualification(e.target.value)}
          />
        </div>

        <div className={stylesEdit.inputDiv}>
          <span className={stylesEdit.heading}>Full Stack Ready</span>
          <p style={{ color: "orange" }}>Are you ready for customer project skills at least level 1? (Both backend and frontend technologies required)</p>
          <Checkbox checked={fullStackReady === true} onChange={() => setFullStackReady(true)}>Yes</Checkbox>
          <Checkbox checked={fullStackReady === false} onChange={() => setFullStackReady(false)}>No</Checkbox>
        </div>

        <Collapse className={stylesEdit.collapseDiv} defaultActiveKey={['1', '2', '3']} accordion>
          <Panel header="Residential Address" key="1">
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address Type</span>
              <Input name="addresses.residential_address_type" value={formData.addresses.residential_address_type} onChange={handleInputChange} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 1</span>
              <Input name="addresses.residential_address1" value={formData.addresses.residential_address1} onChange={handleInputChange} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 2</span>
              <Input name="addresses.residential_address2" value={formData.addresses.residential_address2} onChange={handleInputChange} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>City</span>
              <Input name="addresses.residential_city" value={formData.addresses.residential_city} onChange={handleInputChange} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>State</span>
              <Input name="addresses.residential_state" value={formData.addresses.residential_state} onChange={handleInputChange} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Zipcode</span>
              <Input name="addresses.residential_zipcode" value={formData.addresses.residential_zipcode} onChange={handleInputChange} />
            </div>
          </Panel>

          <Panel className={stylesEdit.panel} header="Permanent Address" key="2">
            <div className={stylesEdit.inputDiv}>
              <Checkbox
                checked={formData.addresses.is_same_permanant}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData(prevState => ({
                    ...prevState,
                    addresses: {
                      ...prevState.addresses,
                      is_same_permanant: isChecked,
                      permanent_address_type: isChecked ? prevState.addresses.residential_address_type : '',
                      permanent_address1: isChecked ? prevState.addresses.residential_address1 : '',
                      permanent_address2: isChecked ? prevState.addresses.residential_address2 : '',
                      permanent_city: isChecked ? prevState.addresses.residential_city : '',
                      permanent_state: isChecked ? prevState.addresses.residential_state : '',
                      permanent_zipcode: isChecked ? prevState.addresses.residential_zipcode : ''
                    }
                  }));
                }}
              >
                Same as Residential Address
              </Checkbox>
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address Type</span>
              <Input name="addresses.permanent_address_type" value={formData.addresses.permanent_address_type} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 1</span>
              <Input name="addresses.permanent_address1" value={formData.addresses.permanent_address1} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Address 2</span>
              <Input name="addresses.permanent_address2" value={formData.addresses.permanent_address2} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>City</span>
              <Input name="addresses.permanent_city" value={formData.addresses.permanent_city} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>State</span>
              <Input name="addresses.permanent_state" value={formData.addresses.permanent_state} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
            <div className={stylesEdit.inputDiv}>
              <span className={stylesEdit.heading}>Zipcode</span>
              <Input name="addresses.permanent_zipcode" value={formData.addresses.permanent_zipcode} onChange={handleInputChange} disabled={formData.addresses.is_same_permanant} />
            </div>
          </Panel>

          <Panel header="Skills" key="3">
            {empSkill?.map((skill, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px", padding: "10px", border: "1px solid #f0f0f0", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="headingSkill">Skill Name</span>
                  <Select
                    showSearch placeholder="Select a skill" style={{ width: "80%" }}
                    onChange={(value) => handleSkillChange(index, value)}
                    value={skill.SkillId}
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                  >
                    {availableSkills.map((s) => <Select.Option key={s.skillId} value={s.skillId}>{s.skillName}</Select.Option>)}
                  </Select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="headingSkill">Skill Level</span>
                  <Select style={{ width: "80%" }} onChange={(value) => handleSkillLevelChange(index, value)} value={skill.SkillLevel}>
                    <Select.Option value="Primary">Primary</Select.Option>
                    <Select.Option value="Secondary">Secondary</Select.Option>
                    <Select.Option value="Cross Tech Skill">Cross Tech Skill</Select.Option>
                  </Select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="headingSkill">Self Evaluation (0-5)</span>
                  <Input type="number" min="0" max="5" step="0.1" value={skill.SelfEvaluation} onChange={(e) => handleSelfEvaluationChange(index, e.target.value)} style={{ width: "80px" }} />
                  <span style={{ fontSize: "12px", color: "#888" }}>{getEvaluationMessage(skill.SelfEvaluation)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="headingSkill">Is Ready?</span>
                  <Checkbox checked={skill.isReady === 1} onChange={() => handleIsReadyChange(index, 1)}>Yes</Checkbox>
                  <Checkbox checked={skill.isReady === 0} onChange={() => handleIsReadyChange(index, 0)}>No</Checkbox>
                  {skill.isReady === 0 && (
                    <input type="date" value={skill.isReadyDate ? convertDate(skill.isReadyDate) : ""} onChange={(e) => handleDateChange(index, e.target.value)} className={stylesEdit.customdatepicker} />
                  )}
                </div>
              </div>
            ))}
            <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddSkill}>Add Skill</Button>
          </Panel>

          <Panel header="Documents" key="4">
            <div className={stylesEdit.docStatusDiv}>
              {documentTypes.map(({ key, label }) => {
                const doc = docStatus?.find((d) => d.doc_type === key);
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
                    <span>{label}</span>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <Upload beforeUpload={(file) => beforeUpload(file, key)} showUploadList={false}>
                        <Button size="small" icon={<UploadOutlined />}>{doc?.uploaded ? "Update" : "Upload"}</Button>
                      </Upload>
                      <span style={{ color: doc?.uploaded ? "green" : "red", fontSize: "12px" }}>{doc?.uploaded ? "Uploaded" : "Pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </Collapse>
      </div>
      <ToastContainer />
    </Modal>
  );
};