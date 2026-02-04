import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Button, Tabs, Select, Row, Col,
  Checkbox, Upload, message, DatePicker, Divider, Card
} from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance, {
  addUpdateSkill,
  editPersonalDetails,
  getAllEmployeeSkills,
  getDocStatus,
  getSkillsForEmp
} from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const { Option } = Select;

export const EditPersonalDetails = ({ isEditModal, setIsEditModal, employeeData, fetchEmployeeData, fetchSkills }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  const [loader, setLoader] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [docStatus, setDocStatus] = useState([]);
  const [isSameAddress, setIsSameAddress] = useState(false);

  // Fetch available skills content
  useEffect(() => {
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
  }, [isEditModal]);

  // Fetch Documents Status
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

  // Fetch User Skills & Populate Form
  useEffect(() => {
    if (!isEditModal || !employeeData) return;

    const loadData = async () => {
      try {
        // Fetch User Skills
        let userSkillsData = { skills: [], QualificationYearMonth: null, FullStackReady: false };
        if (employeeId) {
          try {
            const skillRes = await getSkillsForEmp(employeeId);
            userSkillsData = skillRes.data;
          } catch (err) {
            console.error("Error fetching user skills", err);
          }
        }

        const addresses = employeeData.addresses || {};
        setIsSameAddress(addresses.is_same_permanant || false);

        // Prepare Base Form Values
        const initialValues = {
          // Personal
          // Read-only fields
          employee_id: employeeData.employeeId,
          first_name: employeeData.firstName,
          middle_name: employeeData.middleName,
          last_name: employeeData.lastName,
          company_email: employeeData.email,
          gender: employeeData.gender,
          date_of_birth: employeeData.dateOfBirth ? dayjs(employeeData.dateOfBirth) : null,

          // Personal
          contact_number: employeeData.contact_number || employeeData.contactNumber,
          emergency_contact_person: employeeData.emergency_contact_person || employeeData.emergencyContactPerson,
          emergency_contact_relation: employeeData.emergency_contact_relation || employeeData.emergencyContactRelation,
          emergency_contact_number: employeeData.emergency_contact_number || employeeData.emergencyContactNumber,
          personal_email: employeeData.personal_email || employeeData.personalEmail,

          // Qualification
          highest_qualification: employeeData.highestQualification || employeeData.highest_qualification,
          QualificationYearMonth: userSkillsData.QualificationYearMonth ? dayjs(userSkillsData.QualificationYearMonth) : null,
          FullStackReady: userSkillsData.FullStackReady,

          // Address
          addresses: {
            residential_address_type: addresses.residential_address_type || addresses.residentialAddressType,
            residential_state: addresses.residential_state || addresses.residentialState,
            residential_city: addresses.residential_city || addresses.residentialCity,
            residential_address1: addresses.residential_address1 || addresses.residentialAddress1,
            residential_address2: addresses.residential_address2 || addresses.residentialAddress2,
            residential_zipcode: addresses.residential_zipcode || addresses.residentialZipcode,

            is_same_permanant: addresses.is_same_permanant || false,

            permanent_address_type: addresses.permanent_address_type || addresses.permanentAddressType,
            permanent_state: addresses.permanent_state || addresses.permanentState,
            permanent_city: addresses.permanent_city || addresses.permanentCity,
            permanent_address1: addresses.permanent_address1 || addresses.permanentAddress1,
            permanent_address2: addresses.permanent_address2 || addresses.permanentAddress2,
            permanent_zipcode: addresses.permanent_zipcode || addresses.permanentZipcode,
          },

          // Skills
          skills: userSkillsData.skills.map(s => ({
            ...s,
            isReadyDate: s.isReadyDate ? dayjs(s.isReadyDate) : null,
            // Ensure boolean/number matching for Select/Checkbox
            isReady: s.isReady === 1 || s.isReady === true,
            SkillLevel: s.SkillLevel, // Proficiency: Beginner, Intermediate, Expert
            SkillCategory: s.SkillCategory // Category: Primary, Secondary, Cross Tech
          }))
        };

        form.setFieldsValue(initialValues);

      } catch (error) {
        console.error("Error populating form:", error);
      }
    };

    loadData();

  }, [employeeData, isEditModal, form, employeeId]);

  const handleCancel = () => {
    setIsEditModal(false);
    form.resetFields();
  };

  const onSameAddressChange = (e) => {
    const checked = e.target.checked;
    setIsSameAddress(checked);
    if (checked) {
      const residential = form.getFieldValue(['addresses']);
      form.setFieldsValue({
        addresses: {
          ...residential,
          is_same_permanant: true,
          permanent_address_type: residential.residential_address_type,
          permanent_state: residential.residential_state,
          permanent_city: residential.residential_city,
          permanent_address1: residential.residential_address1,
          permanent_address2: residential.residential_address2,
          permanent_zipcode: residential.residential_zipcode,
        }
      });
    } else {
      form.setFieldValue(['addresses', 'is_same_permanant'], false);
    }
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

  const onFinish = async (values) => {
    setLoader(true);
    try {
      // 1. Prepare Personal Details Payload
      // Check for contact number conflict
      if (values.contact_number && values.contact_number === values.emergency_contact_number) {
        message.error('Contact Number and Emergency Contact Number cannot be the same.');
        setLoader(false);
        return;
      }

      const addressPayload = {
        ...values.addresses,
        is_same_permanant: isSameAddress
      };

      const personalPayload = {
        contact_number: values.contact_number,
        emergency_contact_person: values.emergency_contact_person,
        emergency_contact_relation: values.emergency_contact_relation,
        emergency_contact_number: values.emergency_contact_number,
        personal_email: values.personal_email,
        highest_qualification: values.highest_qualification,
        qualification_year_month: values.QualificationYearMonth ? values.QualificationYearMonth.format("YYYY-MM-DD") : null,
        // Include other non-editable fields if necessary for backend compatibility, 
        // but usually we only send what calls for update.
        // The original code merged ...formData which included read-only fields. 
        // The backend update_profile_self likely only picks specific fields.
        addresses: [addressPayload]
      };

      // 2. Prepare Skills Payload
      const skillsPayload = {
        EmployeeId: employeeId,
        QualificationYearMonth: values.QualificationYearMonth ? values.QualificationYearMonth.format("YYYY-MM-DD") : null,
        FullStackReady: values.FullStackReady,
        skills: (values.skills || []).map(s => ({
          SkillId: s.SkillId,
          SkillLevel: s.SkillLevel, // Proficiency
          SkillCategory: s.SkillCategory, // Category
          SelfEvaluation: s.SelfEvaluation,
          isReady: s.isReady ? 1 : 0,
          isReadyDate: s.isReady && s.isReadyDate ? s.isReadyDate.format("YYYY-MM-DD") : null
        }))
      };

      // 3. API Calls
      // Update Personal
      const personalRes = await editPersonalDetails(personalPayload, employeeId);
      if (personalRes.status === 200) {
        message.success("Personal details updated successfully");
      }

      // Update Skills
      await addUpdateSkill(skillsPayload);

      // Refresh Data
      fetchEmployeeData();
      if (fetchSkills) fetchSkills();

      setIsEditModal(false);

    } catch (error) {
      console.error("Error updating details:", error);
      toast.error("Error updating details");
    } finally {
      setLoader(false);
    }
  };

  const documentTypes = [
    { key: "tenth", label: "10th Marksheet" },
    { key: "twelve", label: "12th Marksheet" },
    { key: "adhar", label: "Aadhar Card" },
    { key: "pan", label: "Pan Card" },
    { key: "grad", label: "Graduation Degree" },
    { key: "resume", label: "Resume" }
  ];

  const getEvaluationMessage = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 0 && numScore < 2) return "Does not meet requirements";
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
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
        <Button key="submit" type="primary" loading={loader} onClick={() => form.submit()}>
          Update All
        </Button>
      ]}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ addresses: { is_same_permanant: false } }}
      >
        <Tabs defaultActiveKey="1" items={[
          {
            key: '1',
            label: 'Personal Info',
            children: (
              <>
                <Card size="small" title="Basic Info (Read Only)" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="employee_id" label="Employee ID">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item name="company_email" label="Company Email">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="first_name" label="First Name">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="middle_name" label="Middle Name">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="last_name" label="Last Name">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="date_of_birth" label="Date of Birth">
                        <DatePicker disabled style={{ width: '100%' }} format="DD-MM-YYYY" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="gender" label="Gender">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" title="Contact Details" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="contact_number" label="Contact Number" rules={[{ required: true, message: 'Please enter contact number' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="personal_email" label="Personal Email" rules={[{ type: 'email' }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Card size="small" title="Emergency Contact" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="emergency_contact_person" label="Contact Person">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="emergency_contact_relation" label="Relation">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="emergency_contact_number" label="Emergency Number">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                  <Card size="small" title="Qualification" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="highest_qualification" label="Highest Qualification">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="QualificationYearMonth" label="Year-Month">
                          <DatePicker picker="month" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="FullStackReady" valuePropName="checked" label="Full Stack Ready?">
                          <Checkbox>Yes, I am ready (Level 1+)</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </Card>
              </>
            ),
          },
          {
            key: '2',
            label: 'Addresses',
            children: (
              <>
                <Card size="small" title="Residential Address" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name={['addresses', 'residential_address1']} label="Address Line 1">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={['addresses', 'residential_address2']} label="Address Line 2">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'residential_city']} label="City">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'residential_state']} label="State">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'residential_zipcode']} label="Zipcode">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" title="Permanent Address" extra={
                  <Checkbox checked={isSameAddress} onChange={onSameAddressChange}>Same as Residential</Checkbox>
                }>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name={['addresses', 'permanent_address1']} label="Address Line 1">
                        <Input disabled={isSameAddress} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={['addresses', 'permanent_address2']} label="Address Line 2">
                        <Input disabled={isSameAddress} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'permanent_city']} label="City">
                        <Input disabled={isSameAddress} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'permanent_state']} label="State">
                        <Input disabled={isSameAddress} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['addresses', 'permanent_zipcode']} label="Zipcode">
                        <Input disabled={isSameAddress} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </>
            ),
          },
          {
            key: '3',
            label: 'Skills',
            children: (
              <>
                {/* <p>Total Skills: {userSkillsData.skills.length}</p> */}
                <Form.List name="skills">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        // <Card key={key} size="small" style={{ marginBottom: 12 }}>
                        <Row gutter={12}>
                          <Col span={6}>
                            <Form.Item {...restField} name={[name, 'SkillId']} label={`#${key + 1} Skill`} rules={[{ required: true }]}>
                              <Select showSearch filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                                {availableSkills.map(s => <Option key={s.skillId} value={s.skillId}>{s.skillName}</Option>)}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item {...restField} name={[name, 'SkillLevel']} label="Proficiency">
                              <Select placeholder="Select Proficiency">
                                <Option value="Beginner">Beginner</Option>
                                <Option value="Intermediate">Intermediate</Option>
                                <Option value="Expert">Expert</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item {...restField} name={[name, 'SkillCategory']} label="Category">
                              <Select placeholder="Select Category">
                                <Option value="Primary">Primary</Option>
                                <Option value="Secondary">Secondary</Option>
                                <Option value="Cross Tech Skill">Cross Tech Skill</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item shouldUpdate={(prev, curr) => prev.skills?.[name]?.SelfEvaluation !== curr.skills?.[name]?.SelfEvaluation}>
                              {({ getFieldValue }) => {
                                const score = getFieldValue(['skills', name, 'SelfEvaluation']);
                                return (
                                  <Form.Item {...restField} name={[name, 'SelfEvaluation']} label="Self Eval (1-5)" help={getEvaluationMessage(score)}>
                                    <Input type="number" min="0" max="5" step="0.1" />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col span={2}>
                            <DeleteOutlined key="delete" onClick={() => remove(name)} style={{ color: 'red', marginTop: '36px' }} />
                          </Col>
                          {/* <Col span={12}>
                              <Form.Item {...restField} name={[name, 'isReady']} valuePropName="checked" label="Ready for Project?">
                                <Checkbox>Yes</Checkbox>
                              </Form.Item>
                              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.skills?.[name]?.isReady !== curr.skills?.[name]?.isReady}>
                                {({ getFieldValue }) => {
                                  const isReady = getFieldValue(['skills', name, 'isReady']);
                                  return isReady ? (
                                    <Form.Item {...restField} name={[name, 'isReadyDate']} label="Since">
                                      <DatePicker style={{ width: '100%' }} />
                                    </Form.Item>
                                  ) : null;
                                }}
                              </Form.Item>
                            </Col> */}
                        </Row>
                        // </Card>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Add Skill
                      </Button>
                    </>
                  )}
                </Form.List>
              </>
            ),
          },
          {
            key: '4',
            label: 'Documents',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {documentTypes.map(({ key, label }) => {
                  const doc = docStatus?.find((d) => d.doc_type === key);
                  return (
                    <Card key={key} size="small" bodyStyle={{ padding: 12 }}>
                      <Row align="middle" justify="space-between">
                        <Col>{label}</Col>
                        <Col>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ color: doc?.uploaded ? "green" : "red", fontSize: "12px" }}>
                              {doc?.uploaded ? "Uploaded" : "Pending"}
                            </span>
                            <Upload beforeUpload={(file) => beforeUpload(file, key)} showUploadList={false}>
                              <Button size="small" icon={<UploadOutlined />}>
                                {doc?.uploaded ? "Update" : "Upload"}
                              </Button>
                            </Upload>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </div>
            ),
          }
        ]} />
      </Form>
      <ToastContainer />
    </Modal>
  );
};