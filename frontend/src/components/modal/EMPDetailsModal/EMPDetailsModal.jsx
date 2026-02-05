import { Modal, Row, Col, Typography, Tag, Space, Button, Select, Form, Input, message, Tabs, Card, DatePicker, Upload, Divider, Checkbox } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from "./EMPDetailsModal.module.css";
import {
  getCompanyBands,
  getCompanyRoles,
  getSkillsForEmp,
  getPotentialApprovers,
  updateEmployeeDetails,
  getDocStatus,
  getDocuments,
  uploadDocument,
  getAllEmployeeSkills
} from '../../../services/api';
import { getCookie } from '../../../util/CookieSet';
import { useAuth } from '../../../context/AuthContext';
import WidgetCard from '../../common/WidgetCard';
import dayjs from 'dayjs';
import {
  UserOutlined,
  HomeOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

export const EMPDetailsModal = ({ detailsModal, setDetailsModal, personalEmployeeDetails, refreshEmployeeData }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [bandsData, setBandsData] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [potentialApprovers, setPotentialApprovers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [docStatus, setDocStatus] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [isSameAddress, setIsSameAddress] = useState(false);

  // Check if current user can edit (HR or Admin)
  const canEdit = user && (user.roleName === 'HR' || user.roleName === 'Admin');

  // Employment status options
  const employmentStatusOptions = [
    'Active',
    'Probation',
    'Confirmed',
    'Intern',
    'Resigned',
    'Relieved',
    'Absconding'
  ];


  const getRoleData = async () => {
    try {
      const response = await getCompanyRoles();
      if (Array.isArray(response.data)) {
        setRoleData(response.data);
      } else {
        console.error('Expected an array from getCompanyRoles', response.data);
      }
    } catch (error) {
      console.error('Error fetching role data:', error);
    }
  };

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

  const fetchPotentialApprovers = async () => {
    try {
      const response = await getPotentialApprovers();
      setPotentialApprovers(response.data);
    } catch (error) {
      console.error('Error fetching potential approvers:', error);
      // Silent fail - not critical for viewing, only for editing
      // Show error only if user is trying to edit
      if (canEdit) {
        message.error('Failed to load approvers list');
      }
    }
  };

  useEffect(() => {
    getCompanyBandsData();
    getRoleData();
    // Always fetch approvers to display names correctly
    fetchPotentialApprovers();
  }, []);

  useEffect(() => {
    if (personalEmployeeDetails) {
      const addresses = personalEmployeeDetails.addresses || {};
      setIsSameAddress(addresses.isSamePermanant || false);

      // Pre-fill form with all values
      form.setFieldsValue({
        firstName: personalEmployeeDetails.firstName,
        middleName: personalEmployeeDetails.middleName,
        lastName: personalEmployeeDetails.lastName,
        dateOfBirth: personalEmployeeDetails.dateOfBirth ? dayjs(personalEmployeeDetails.dateOfBirth) : null,
        gender: personalEmployeeDetails.gender,
        bloodGroup: personalEmployeeDetails.bloodGroup,
        personalEmail: personalEmployeeDetails.personalEmail,
        email: personalEmployeeDetails.email,
        contactNumber: personalEmployeeDetails.contactNumber,
        dateOfJoining: personalEmployeeDetails.dateOfJoining ? dayjs(personalEmployeeDetails.dateOfJoining) : null,
        band: personalEmployeeDetails.band,
        MasterSubRole: personalEmployeeDetails.MasterSubRole,
        highestQualification: personalEmployeeDetails.highestQualification,
        employmentStatus: personalEmployeeDetails.employmentStatus,
        teamLeadId: personalEmployeeDetails.teamLeadId,
        emergencyContactPerson: personalEmployeeDetails.emergencyContactPerson,
        emergencyContactRelation: personalEmployeeDetails.emergencyContactRelation,
        emergencyContactNumber: personalEmployeeDetails.emergencyContactNumber,
        addresses: {
          residential_address_type: addresses.residentialAddressType || 'Residential',
          residential_state: addresses.residentialState,
          residential_city: addresses.residentialCity,
          residential_address1: addresses.residentialAddress1,
          residential_address2: addresses.residentialAddress2,
          residential_zipcode: addresses.residentialZipcode,
          is_same_permanant: addresses.isSamePermanant || false,
          permanent_address_type: addresses.permanentAddressType || 'Permanent',
          permanent_state: addresses.permanentState,
          permanent_city: addresses.permanentCity,
          permanent_address1: addresses.permanentAddress1,
          permanent_address2: addresses.permanentAddress2,
          permanent_zipcode: addresses.permanentZipcode,
        },
        skills: personalEmployeeDetails.skills?.map(s => ({
          skillId: s.skillId,
          skillLevel: s.skillLevel
        })) || []
      });

      // Fetch documents status for this employee
      fetchDocStatus(personalEmployeeDetails.employeeId);
    }
  }, [personalEmployeeDetails, form]);

  const fetchDocStatus = async (empId) => {
    try {
      const response = await getDocStatus(empId);
      setDocStatus(response.data.documents || []);
    } catch (error) {
      console.error("Error fetching doc status:", error);
    }
  };

  const fetchAllAvailableSkills = async () => {
    try {
      const response = await getAllEmployeeSkills();
      setAvailableSkills(response.data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };

  useEffect(() => {
    if (detailsModal) {
      fetchAllAvailableSkills();
    }
  }, [detailsModal]);

  const handleCancel = () => {
    setIsEditMode(false);
    form.resetFields();
    setDetailsModal(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        employee_id: personalEmployeeDetails.employeeId,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : null,
        addresses: [
          {
            address_type: values.addresses.residential_address_type,
            state: values.addresses.residential_state,
            city: values.addresses.residential_city,
            address1: values.addresses.residential_address1,
            address2: values.addresses.residential_address2,
            zip_code: values.addresses.residential_zipcode,
            is_same_permanant: isSameAddress
          },
          ...(!isSameAddress ? [{
            address_type: values.addresses.permanent_address_type,
            state: values.addresses.permanent_state,
            city: values.addresses.permanent_city,
            address1: values.addresses.permanent_address1,
            address2: values.addresses.permanent_address2,
            zip_code: values.addresses.permanent_zipcode,
            is_same_permanant: false
          }] : [])
        ],
        skills: values.skills?.map(s => ({
          skill_id: s.skillId,
          skill_level: s.skillLevel
        })) || []
      };

      await updateEmployeeDetails(personalEmployeeDetails.employeeId, payload);

      message.success('Employee details updated successfully');
      setIsEditMode(false);

      if (refreshEmployeeData) {
        refreshEmployeeData();
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      message.error(error.response?.data?.message || 'Failed to update employee details');
    } finally {
      setSaving(false);
    }
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
          permanent_address_type: 'Permanent',
          permanent_state: residential.residential_state,
          permanent_city: residential.residential_city,
          permanent_address1: residential.residential_address1,
          permanent_address2: residential.residential_address2,
          permanent_zipcode: residential.residential_zipcode,
        }
      });
    }
  };

  const downloadDoc = async (docType) => {
    try {
      const response = await getDocuments(personalEmployeeDetails.employeeId, docType);
      const blob = new Blob([response.data], { type: response.data.type || "application/pdf" });
      const fileURL = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = `${personalEmployeeDetails.firstName}_${docType}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Download started");
    } catch (error) {
      message.error("Failed to download document");
    }
  };

  const previewDoc = async (docType) => {
    try {
      const response = await getDocuments(personalEmployeeDetails.employeeId, docType);
      const blob = new Blob([response.data], { type: response.data.type || "application/pdf" });
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
    } catch (error) {
      message.error("Failed to preview document");
    }
  };

  const handleUpload = async (file, docType) => {
    try {
      await uploadDocument(personalEmployeeDetails.employeeId, docType, file);
      message.success(`${docType} uploaded successfully!`);
      fetchDocStatus(personalEmployeeDetails.employeeId);
    } catch (error) {
      message.error(`Failed to upload ${docType}`);
    }
    return false;
  };


  return (
    <Modal
      open={detailsModal}
      footer={null}
      width={800}
      onCancel={handleCancel}
      style={{ top: 10 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingRight: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>Employee Details</span>
          </div>
          {canEdit && !isEditMode && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
          {isEditMode && (
            <Space>
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
            </Space>
          )}
        </div>
      }
      styles={{ body: { overflowY: 'auto', maxHeight: '80vh', padding: '20px' } }}
    >
      {personalEmployeeDetails ? (
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="1" style={{ marginTop: '-10px' }}>
            {/* Tab 1: Personal & Employment */}
            <Tabs.TabPane tab={<span><UserOutlined /> Personal Info</span>} key="1">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="firstName" label="First Name">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="lastName" label="Last Name">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="middleName" label="Middle Name">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dateOfBirth" label="Date of Birth">
                    <DatePicker format="DD-MM-YYYY" disabled={!isEditMode} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="gender" label="Gender">
                    <Select disabled={!isEditMode}>
                      <Option value="Male">Male</Option>
                      <Option value="Female">Female</Option>
                      <Option value="Other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="bloodGroup" label="Blood Group">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Divider orientation="left">Employment Details</Divider>
                <Col span={12}>
                  <Form.Item name="employmentStatus" label="Employment Status">
                    <Select disabled={!isEditMode}>
                      {employmentStatusOptions.map(status => (
                        <Option key={status} value={status}>{status}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="band" label="Band/Designation">
                    <Select disabled={!isEditMode}>
                      {bandsData.map((band) => (
                        <Option key={band.designation_id} value={band.designation_id}>{band.designation_name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="MasterSubRole" label="Role">
                    <Select disabled={!isEditMode}>
                      {roleData.map((role) => (
                        <Option key={role.sub_role_id} value={role.sub_role_id}>{role.sub_role_name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dateOfJoining" label="Date of Joining">
                    <DatePicker format="DD-MM-YYYY" disabled={!isEditMode} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="email" label="Official Email">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                {isEditMode && (
                  <Col span={24}>
                    <Form.Item name="password" label="Change Password" extra="Leave blank to keep current password">
                      <Input.Password placeholder="Enter new password" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </Tabs.TabPane>

            {/* Tab 2: Contact & Emergency */}
            <Tabs.TabPane tab={<span><PhoneOutlined /> Contact</span>} key="2">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="contactNumber" label="Personal Contact Number">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="personalEmail" label="Personal Email">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="teamLeadId" label="Leave Approver">
                    <Select
                      disabled={!isEditMode}
                      showSearch
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {potentialApprovers.map(approver => (
                        <Option key={approver.employeeId} value={approver.employeeId}>
                          {approver.employeeName} ({approver.roleName})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Divider orientation="left">Emergency Contact</Divider>
                <Col span={8}>
                  <Form.Item name="emergencyContactPerson" label="Person Name">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="emergencyContactRelation" label="Relation">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="emergencyContactNumber" label="Contact Number">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
                <Divider orientation="left">Qualification</Divider>
                <Col span={24}>
                  <Form.Item name="highestQualification" label="Highest Qualification">
                    <Input disabled={!isEditMode} />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            {/* Tab 3: Addresses */}
            <Tabs.TabPane tab={<span><HomeOutlined /> Addresses</span>} key="3">
              <Card size="small" title="Residential Address" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['addresses', 'residential_address1']} label="Address Line 1">
                      <Input disabled={!isEditMode} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['addresses', 'residential_address2']} label="Address Line 2">
                      <Input disabled={!isEditMode} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'residential_city']} label="City">
                      <Input disabled={!isEditMode} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'residential_state']} label="State">
                      <Input disabled={!isEditMode} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'residential_zipcode']} label="Zipcode">
                      <Input disabled={!isEditMode} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Permanent Address" extra={
                <Checkbox
                  disabled={!isEditMode}
                  checked={isSameAddress}
                  onChange={onSameAddressChange}
                >
                  Same as Residential
                </Checkbox>
              }>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['addresses', 'permanent_address1']} label="Address Line 1">
                      <Input disabled={!isEditMode || isSameAddress} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['addresses', 'permanent_address2']} label="Address Line 2">
                      <Input disabled={!isEditMode || isSameAddress} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'permanent_city']} label="City">
                      <Input disabled={!isEditMode || isSameAddress} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'permanent_state']} label="State">
                      <Input disabled={!isEditMode || isSameAddress} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['addresses', 'permanent_zipcode']} label="Zipcode">
                      <Input disabled={!isEditMode || isSameAddress} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Tabs.TabPane>

            {/* Tab 4: Skills */}
            <Tabs.TabPane tab={<span><ToolOutlined /> Skills</span>} key="4">
              <Form.List name="skills">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row gutter={12} key={key} align="middle">
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'skillId']}
                            label="Skill"
                            rules={[{ required: true, message: 'Select skill' }]}
                          >
                            <Select
                              disabled={!isEditMode}
                              showSearch
                              filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                            >
                              {availableSkills.map(s => <Option key={s.skillId} value={s.skillId}>{s.skillName}</Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'skillLevel']}
                            label="Proficiency"
                          >
                            <Select disabled={!isEditMode}>
                              <Option value="Beginner">Beginner</Option>
                              <Option value="Intermediate">Intermediate</Option>
                              <Option value="Expert">Expert</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        {isEditMode && (
                          <Col span={4}>
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              style={{ marginTop: '5px' }}
                            />
                          </Col>
                        )}
                      </Row>
                    ))}
                    {isEditMode && (
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: '10px' }}>
                        Add Skill
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Tabs.TabPane>

            {/* Tab 5: Documents */}
            <Tabs.TabPane tab={<span><FileTextOutlined /> Documents</span>} key="5">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: "tenth", label: "10th Marksheet" },
                  { key: "twelve", label: "12th Marksheet" },
                  { key: "adhar", label: "Aadhar Card" },
                  { key: "pan", label: "Pan Card" },
                  { key: "grad", label: "Graduation Degree" },
                  { key: "resume", label: "Resume" }
                ].map(({ key, label }) => {
                  const doc = docStatus?.find((d) => d.doc_type === key);
                  return (
                    <Card key={key} size="small">
                      <Row align="middle" justify="space-between">
                        <Col span={6}>
                          <Text strong>{label}</Text>
                        </Col>
                        <Col span={4}>
                          <Tag color={doc?.uploaded ? "success" : "error"}>
                            {doc?.uploaded ? "Uploaded" : "Pending"}
                          </Tag>
                        </Col>
                        <Col span={14} style={{ textAlign: 'right' }}>
                          <Space>
                            {doc?.uploaded && (
                              <>
                                <Button size="small" icon={<EyeOutlined />} onClick={() => previewDoc(key)}>Preview</Button>
                                <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadDoc(key)}>Download</Button>
                              </>
                            )}
                            {canEdit && (
                              <Upload
                                beforeUpload={(file) => handleUpload(file, key)}
                                showUploadList={false}
                              >
                                <Button size="small" icon={<UploadOutlined />} type={doc?.uploaded ? "default" : "primary"}>
                                  {doc?.uploaded ? "Update" : "Upload"}
                                </Button>
                              </Upload>
                            )}
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading employee details...</div>
      )}
    </Modal>
  );
};