import { Modal, Row, Col, Typography, Tag, Space, Button, Select, Form, Input, message } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from "./EMPDetailsModal.module.css";
import { getCompanyBands, getCompanyRoles, getSkillsForEmp, getPotentialApprovers, updateEmployeeDetails } from '../../../services/api';
import { getCookie } from '../../../util/CookieSet';
import { useAuth } from '../../../context/AuthContext';
import WidgetCard from '../../common/WidgetCard';
import {
  UserOutlined,
  HomeOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

export const EMPDetailsModal = ({ detailsModal, setDetailsModal, personalEmployeeDetails, refreshEmployeeData }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [bandsData, setBandsData] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [highestQualificationYearMonth, setHighestQualificationYearMonth] = useState(null);
  const [fullStackReady, setFullStackReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [potentialApprovers, setPotentialApprovers] = useState([]);
  const [saving, setSaving] = useState(false);

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

  // Helper component for consistent row styling
  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <Text type="secondary">{label}:</Text>
      <Text strong style={{ textAlign: 'right' }}>{value || 'N/A'}</Text>
    </div>
  );

  const getRoleData = async () => {
    const response = await getCompanyRoles();
    setRoleData(response.data);
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
    if (personalEmployeeDetails && isEditMode) {
      // Pre-fill form with current values
      form.setFieldsValue({
        teamLeadId: personalEmployeeDetails.teamLeadId,
        employmentStatus: personalEmployeeDetails.employmentStatus
      });
    }
  }, [personalEmployeeDetails, isEditMode, form]);

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

      await updateEmployeeDetails(personalEmployeeDetails.employeeId, {
        teamLeadId: values.teamLeadId,
        employmentStatus: values.employmentStatus
      });

      message.success('Employee details updated successfully');
      setIsEditMode(false);

      // Refresh parent data if callback provided
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

  const getBandName = (bandNumber) => {
    if (Array.isArray(bandsData)) {
      const band = bandsData.find(b => b.DesignationId === bandNumber);
      return band?.Band;
    }
    return 'N/A';
  };

  const getRoleName = (roleNumber) => {
    if (Array.isArray(roleData)) {
      const role = roleData.find(b => b.SubRoleId === roleNumber);
      return role?.Role;
    }
    return 'N/A';
  };

  const employeeIdCookie = getCookie('employeeId');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        if (employeeIdCookie) {
          const response = await getSkillsForEmp(employeeIdCookie);
          setHighestQualificationYearMonth(response.data.QualificationYearMonth);
          setFullStackReady(response.data.FullStackReady);
        }
      } catch (error) {
        console.error("Error fetching additional skills info:", error);
      }
    };
    fetchSkills();
  }, [employeeIdCookie]);

  return (
    <Modal
      open={detailsModal}
      footer={null}
      width={1000}
      onCancel={handleCancel}
      centered
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
          <Row gutter={[24, 24]}>
            {/* Personal Details */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Personal Details" icon={<UserOutlined />} iconColor="#1890ff" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                <InfoRow label="Employee ID" value={personalEmployeeDetails.employeeId} />
                <InfoRow label="First Name" value={personalEmployeeDetails.firstName} />
                <InfoRow label="Middle Name" value={personalEmployeeDetails.middleName} />
                <InfoRow label="Last Name" value={personalEmployeeDetails.lastName} />
                <InfoRow label="Date of Birth" value={personalEmployeeDetails.dateOfBirth && new Date(personalEmployeeDetails.dateOfBirth).toLocaleDateString('en-GB')} />
                <InfoRow label="Gender" value={personalEmployeeDetails.gender} />
                <InfoRow label="Blood Group" value={personalEmployeeDetails.bloodGroup} />
                <InfoRow label="Personal Email" value={personalEmployeeDetails.personalEmail} />
                <InfoRow label="Date of Joining" value={personalEmployeeDetails.dateOfJoining && new Date(personalEmployeeDetails.dateOfJoining).toLocaleDateString('en-GB')} />
                <InfoRow label="Band" value={personalEmployeeDetails.designationName || getBandName(personalEmployeeDetails.band)} />
                <InfoRow label="Role" value={personalEmployeeDetails.subRoleName || getRoleName(personalEmployeeDetails.MasterSubRole)} />
                <InfoRow label="Highest Qualification" value={personalEmployeeDetails.highestQualification} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <Text type="secondary">Full Stack Ready:</Text>
                  <Tag color={fullStackReady ? 'success' : 'default'}>{fullStackReady ? "Yes" : "No"}</Tag>
                </div>

                {/* Editable Employment Status */}
                {isEditMode ? (
                  <div style={{ marginTop: '12px' }}>
                    <Form.Item
                      name="employmentStatus"
                      label="Employment Status"
                      rules={[{ required: true, message: 'Please select employment status' }]}
                    >
                      <Select placeholder="Select status">
                        {employmentStatusOptions.map(status => (
                          <Option key={status} value={status}>{status}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                ) : (
                  <InfoRow label="Employment Status" value={personalEmployeeDetails.employmentStatus} />
                )}
              </WidgetCard>
            </Col>

            {/* Contact & Emergency */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <WidgetCard title="Contact Information" icon={<PhoneOutlined />} iconColor="#fa8c16" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <Text type="secondary"><MailOutlined style={{ marginRight: '8px' }} />Official Email</Text>
                    <Text strong>{personalEmployeeDetails.email}</Text>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text type="secondary"><PhoneOutlined style={{ marginRight: '8px' }} />Contact Number</Text>
                    <Text strong>{personalEmployeeDetails.contactNumber}</Text>
                  </div>

                  {/* Editable Leave Approver */}
                  <div style={{ marginTop: '16px' }}>
                    {isEditMode ? (
                      <Form.Item
                        name="teamLeadId"
                        label="Leave Approver"
                        rules={[{ required: true, message: 'Please select a leave approver' }]}
                      >
                        <Select
                          placeholder="Select leave approver"
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
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                        <Text type="secondary">Leave Approver:</Text>
                        <Text strong>{
                          personalEmployeeDetails.leaveApproverName ||
                          potentialApprovers.find(a => a.employeeId === personalEmployeeDetails.teamLeadId)?.employeeName ||
                          (personalEmployeeDetails.teamLeadId ? `ID: ${personalEmployeeDetails.teamLeadId}` : 'Not Assigned')
                        }</Text>
                      </div>
                    )}
                  </div>
                </WidgetCard>

                <WidgetCard title="Emergency Contact" icon={<ExclamationCircleOutlined />} iconColor="#ff4d4f" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                  <InfoRow label="Person" value={personalEmployeeDetails.emergencyContactPerson} />
                  <InfoRow label="Relation" value={personalEmployeeDetails.emergencyContactRelation} />
                  <InfoRow label="Number" value={personalEmployeeDetails.emergencyContactNumber} />
                </WidgetCard>
              </Space>
            </Col>

            {/* Addresses */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <WidgetCard title="Residential Address" icon={<HomeOutlined />} iconColor="#52c41a" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                  {personalEmployeeDetails.addresses ? (
                    <>
                      <InfoRow label="Type" value={personalEmployeeDetails.addresses.residentialAddressType} />
                      <InfoRow label="Line 1" value={personalEmployeeDetails.addresses.residentialAddress1} />
                      <InfoRow label="Line 2" value={personalEmployeeDetails.addresses.residentialAddress2} />
                      <InfoRow label="City" value={personalEmployeeDetails.addresses.residentialCity} />
                      <InfoRow label="State" value={personalEmployeeDetails.addresses.residentialState} />
                      <InfoRow label="Zipcode" value={personalEmployeeDetails.addresses.residentialZipcode} />
                    </>
                  ) : <Text type="secondary">No address info available</Text>}
                </WidgetCard>

                <WidgetCard title="Permanent Address" icon={<HomeOutlined />} iconColor="#fadb14" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                  {personalEmployeeDetails.addresses ? (
                    <>
                      <InfoRow label="Type" value={personalEmployeeDetails.addresses.permanentAddressType} />
                      <InfoRow label="Line 1" value={personalEmployeeDetails.addresses.permanentAddress1} />
                      <InfoRow label="Line 2" value={personalEmployeeDetails.addresses.permanentAddress2} />
                      <InfoRow label="City" value={personalEmployeeDetails.addresses.permanentCity} />
                      <InfoRow label="State" value={personalEmployeeDetails.addresses.permanentState} />
                      <InfoRow label="Zipcode" value={personalEmployeeDetails.addresses.permanentZipcode} />
                    </>
                  ) : <Text type="secondary">No address info available</Text>}
                </WidgetCard>
              </Space>
            </Col>

            {/* Skills */}
            <Col xs={24} lg={12}>
              <WidgetCard title="Skills" icon={<ToolOutlined />} iconColor="#722ed1" style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                {personalEmployeeDetails.skills && personalEmployeeDetails.skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {personalEmployeeDetails.skills.map((skill, index) => (
                      <Tag key={index} color="blue" style={{ padding: '4px 8px', fontSize: '14px' }}>
                        <strong>{skill.skillName}</strong>
                        <span style={{ marginLeft: '4px', opacity: 0.8 }}>({skill.skillLevel})</span>
                      </Tag>
                    ))}
                  </div>
                ) : <Text type="secondary">No skills listed</Text>}
              </WidgetCard>
            </Col>
          </Row>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading employee details...</div>
      )}
    </Modal>
  );
};