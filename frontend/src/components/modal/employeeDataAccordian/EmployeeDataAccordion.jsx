import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, Row, Col, Select, Checkbox, message, Typography } from 'antd';
import {
    UserOutlined,
    HomeOutlined,
    ToolOutlined,
    PhoneOutlined,
    MailOutlined,
    SaveOutlined,
    CloseOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import styles from './EmployeeDataAccordion.module.css';
import { indianStates } from '../../../util/helper';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getAllEmployeeSkills, getBands1, getRoles1, getMasterRoles, insertEmployee, getPotentialApprovers } from '../../../services/api';
import { toast } from 'react-toastify';
import WidgetCard from '../../common/WidgetCard';

const { Option } = Select;
const { Text } = Typography;

const EmployeeDataAccordion = ({ isSetLeaveApplicationModal, handleOk, setIsAccordionVisible, getEmployees }) => {
    const [form] = Form.useForm();
    const [loader, setLoader] = useState(false);
    const [copyAddress, setCopyAddress] = useState(false);
    const [companyBand, setCompanyBand] = useState([]);
    const [companyRole, setCompanyRole] = useState([]);
    const [companyMasterRole, setCompanyMasterRole] = useState([]);
    const [skillEmp, setSkillEmp] = useState([]);
    const [potentialApprovers, setPotentialApprovers] = useState([]);
    const optionsSkill = useRef([]);

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

    const getEmployeeSkill = async () => {
        try {
            const res = await getAllEmployeeSkills();
            // Map snake_case to camelCase for consistency with form
            const mappedSkills = res.data.map(skill => ({
                skillId: skill.skillId || skill.SkillId || skill.skill_id,
                skillName: skill.skillName || skill.SkillName || skill.skill_name
            }));
            setSkillEmp(mappedSkills);
            optionsSkill.current = mappedSkills;
        } catch (err) {
            console.error('Error fetching skills:', err);
        }
    };

    const fetchPotentialApprovers = async () => {
        try {
            const response = await getPotentialApprovers();
            setPotentialApprovers(response.data);
        } catch (error) {
            console.error('Error fetching potential approvers:', error);
        }
    };

    // Fetch bands (designations)
    const fetchBand = async () => {
        try {
            const response = await getBands1();
            setCompanyBand(response.data || []);
        } catch (error) {
            console.error('Error fetching company bands', error);
        }
    };

    // Fetch sub-roles
    const fetchRoles = async () => {
        try {
            const response = await getRoles1();
            setCompanyRole(response.data || []);
        } catch (error) {
            console.error('Error fetching company sub-roles', error);
        }
    };

    // Fetch master roles
    const fetchMasterRoles = async () => {
        try {
            const response = await getMasterRoles();
            setCompanyMasterRole(response.data || []);
        } catch (error) {
            console.error('Error fetching company master roles', error);
        }
    };

    useEffect(() => {
        fetchBand();
        fetchRoles();
        fetchMasterRoles();
        getEmployeeSkill();
        fetchPotentialApprovers();
    }, []);

    const getDesignationId = (designationName) => {
        const designation = companyBand?.find(item => item.designation_name === designationName);
        return designation ? designation.designation_id : null;
    };

    const getRoleId = (role) => {
        const getRole = companyRole.find(item => item.sub_role_name === role);
        return getRole ? getRole.sub_role_id : null;
    };

    const getMasterRoleId = (roleName) => {
        const role = companyMasterRole?.find(item => item.role_name === roleName);
        return role ? role.role_id : null;
    };

    const fethNameById = (id) => {
        const res = optionsSkill.current.find((el) => el.skillId == id);
        return res?.skillName;
    };

    const transformData = (data) => {
        return {
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            password: data.password,
            contactNumber: data.contactNumber,
            emergencyContactNumber: data.emergencyContactNumber,
            emergencyContactPerson: data.emergencyContactPerson,
            emergencyContactRelation: data.emergencyContactRelation,
            email: data.email,
            personalEmail: data.personalEmail,
            gender: data.gender === 'Male' ? 'M' : 'F',
            bloodGroup: data.bloodGroup,
            band: getDesignationId(data.band),
            sub_role: getRoleId(data.MasterSubRole), // Sub-role ID
            role_id: getMasterRoleId(data.role), // Master role ID for EmployeeRole table
            dateOfBirth: data.dateOfBirth,
            dateOfJoining: data.dateOfJoining,
            highestQualification: data.highestQualification,
            teamLeadId: data.teamLeadId,
            employmentStatus: data.employmentStatus,
            addresses: {
                residential_address_type: "Residential",
                residential_state: data.currentState,
                residential_city: data.currentCity,
                residential_address1: data.currentAddressLine1,
                residential_address2: data.currentAddressLine2,
                residential_zipcode: data.currentZipCode,
                permanent_address_type: "Permanent",
                permanent_state: data.permanentState,
                permanent_city: data.permanentCity,
                permanent_address1: data.permanentAddressLine1,
                permanent_address2: data.permanentAddressLine2,
                permanent_zipcode: data.permanentZipCode,
                is_same_permanant: copyAddress,
            },
            skills: [
                ...(data.primarySkills || []).map((skill) => ({
                    skill_id: skill,
                    skill_name: fethNameById(skill),
                    skill_level: 'Primary'
                })),
                ...(data.secondarySkills || []).map((skill) => ({
                    skill_id: skill,
                    skill_name: fethNameById(skill),
                    skill_level: 'Secondary'
                }))
            ],
            resumeLink: data.resumeLink || '',
        };
    };


    const handleSubmit = async (values) => {
        setLoader(true);
        try {
            const transformedData = transformData(values);
            console.log('Transformed data being sent:', transformedData);
            console.log('Skills data:', transformedData.skills);
            const res = await insertEmployee(transformedData);
            if (res.status === 200 || res.status === 201) {
                form.resetFields();
                setIsAccordionVisible(false);
                message.success("Employee added successfully");
                // Refresh employee list after modal closes
                if (getEmployees) {
                    getEmployees();
                }
            }
        } catch (error) {
            console.error('Error adding employee:', error);
            const errorMsg = error?.response?.data?.message || error.message || "Failed to add employee";
            message.error(errorMsg);
        } finally {
            setLoader(false);
        }
    };


    const handleCheckboxChange = (e) => {
        setCopyAddress(e.target.checked);
        const currentAddressFields = form.getFieldsValue([
            'currentAddressLine1',
            'currentAddressLine2',
            'currentCity',
            'currentState',
            'currentZipCode'
        ]);

        if (e.target.checked) {
            form.setFieldsValue({
                permanentAddressLine1: currentAddressFields.currentAddressLine1,
                permanentAddressLine2: currentAddressFields.currentAddressLine2,
                permanentCity: currentAddressFields.currentCity,
                permanentState: currentAddressFields.currentState,
                permanentZipCode: currentAddressFields.currentZipCode,
            });
        } else {
            form.resetFields(['permanentAddressLine1', 'permanentAddressLine2', 'permanentCity', 'permanentState', 'permanentZipCode']);
        }
    };

    return (
        <Modal
            open={isSetLeaveApplicationModal}
            onCancel={() => setIsAccordionVisible(false)}
            footer={null}
            destroyOnClose={true}
            width={1200}
            centered
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>Add New Employee</span>
                </div>
            }
            styles={{ body: { overflowY: 'auto', maxHeight: '80vh', padding: '16px' } }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    employmentStatus: 'Probation'
                }}
            >
                <Row gutter={[16, 12]}>
                    {/* Personal Information */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Personal Information"
                            icon={<UserOutlined />}
                            iconColor="#1890ff"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8', height: '100%' }}
                        >
                            <Row gutter={[12, 4]}>
                                <Col span={12}>
                                    <Form.Item
                                        label="First Name"
                                        name="firstName"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="First name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Middle Name" name="middleName">
                                        <Input placeholder="Middle name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Last Name"
                                        name="lastName"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Last name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Password"
                                        name="password"
                                        rules={[
                                            { required: true, message: 'Required' },
                                            { min: 8, message: 'Min 8 characters' }
                                        ]}
                                    >
                                        <Input.Password placeholder="Password" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Gender"
                                        name="gender"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select gender">
                                            <Option value="Male">Male</Option>
                                            <Option value="Female">Female</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Date of Birth"
                                        name="dateOfBirth"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <input
                                            type="date"
                                            className={styles.inputDate}
                                            style={{ width: '100%', padding: '4px 11px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Blood Group"
                                        name="bloodGroup"
                                    >
                                        <Input placeholder="Blood Group" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Date of Joining"
                                        name="dateOfJoining"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <input
                                            type="date"
                                            className={styles.inputDate}
                                            style={{ width: '100%', padding: '4px 11px', borderRadius: '6px', border: '1px solid #d9d9d9' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Highest Qualification"
                                        name="highestQualification"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Highest Qualification" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Contact & Employment Details */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Contact & Employment"
                            icon={<PhoneOutlined />}
                            iconColor="#fa8c16"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8', height: '100%' }}
                        >
                            <Row gutter={[16, 8]}>
                                <Col span={24}>
                                    <Form.Item
                                        label={<><MailOutlined style={{ marginRight: '8px' }} />Official Email</>}
                                        name="email"
                                        rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
                                    >
                                        <Input placeholder="official@company.com" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label={<><MailOutlined style={{ marginRight: '8px' }} />Personal Email</>}
                                        name="personalEmail"
                                        rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
                                    >
                                        <Input placeholder="personal@email.com" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label={<><PhoneOutlined style={{ marginRight: '8px' }} />Contact Number</>}
                                        name="contactNumber"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <PhoneInput
                                            international
                                            defaultCountry="IN"
                                            placeholder="Contact Number"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Band"
                                        name="band"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select band" showSearch>
                                            {companyBand.map(band => (
                                                <Option key={band.designation_id} value={band.designation_name}>
                                                    {band.designation_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Role"
                                        name="role"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select role" showSearch>
                                            {companyMasterRole.map(role => (
                                                <Option key={role.role_id} value={role.role_name}>
                                                    {role.role_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Designation"
                                        name="MasterSubRole"
                                        rules={[{ required: false }]}
                                    >
                                        <Select placeholder="Select sub-role" showSearch>
                                            {companyRole.map(role => (
                                                <Option key={role.sub_role_id} value={role.sub_role_name}>
                                                    {role.sub_role_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Leave Approver"
                                        name="teamLeadId"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select approver" showSearch>
                                            {potentialApprovers.map(approver => (
                                                <Option key={approver.employeeId} value={approver.employeeId}>
                                                    {approver.employeeName} ({approver.roleName})
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Employment Status"
                                        name="employmentStatus"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select status">
                                            {employmentStatusOptions.map(status => (
                                                <Option key={status} value={status}>{status}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label="Resume Link"
                                        name="resumeLink"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Google Drive or Dropbox link" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Emergency Contact */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Emergency Contact"
                            icon={<ExclamationCircleOutlined />}
                            iconColor="#ff4d4f"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}
                        >
                            <Row gutter={[16, 8]}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Contact Person"
                                        name="emergencyContactPerson"
                                    >
                                        <Input placeholder="Name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Relation"
                                        name="emergencyContactRelation"
                                    >
                                        <Input placeholder="Relation" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label="Contact Number"
                                        name="emergencyContactNumber"
                                    >
                                        <PhoneInput
                                            international
                                            defaultCountry="IN"
                                            placeholder="Emergency Contact Number"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Skills */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Skills"
                            icon={<ToolOutlined />}
                            iconColor="#722ed1"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}
                        >
                            <Row gutter={[16, 8]}>
                                <Col span={24}>
                                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.secondarySkills !== curr.secondarySkills}>
                                        {({ getFieldValue }) => {
                                            const secondary = getFieldValue('secondarySkills') || [];
                                            const filteredOptions = skillEmp
                                                .filter(skill => !secondary.some(id => String(id) === String(skill.skillId)))
                                                .map(skill => ({
                                                    label: skill.skillName,
                                                    value: skill.skillId
                                                }));
                                            return (
                                                <Form.Item
                                                    label="Primary Skills"
                                                    name="primarySkills"
                                                    rules={[{ required: true, message: 'Required' }]}
                                                >
                                                    <Select
                                                        mode="multiple"
                                                        placeholder="Select primary skills"
                                                        showSearch
                                                        optionFilterProp="label"
                                                        options={filteredOptions}
                                                    />
                                                </Form.Item>
                                            );
                                        }}
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.primarySkills !== curr.primarySkills}>
                                        {({ getFieldValue }) => {
                                            const primary = getFieldValue('primarySkills') || [];
                                            const filteredOptions = skillEmp
                                                .filter(skill => !primary.some(id => String(id) === String(skill.skillId)))
                                                .map(skill => ({
                                                    label: skill.skillName,
                                                    value: skill.skillId
                                                }));
                                            return (
                                                <Form.Item
                                                    label="Secondary Skills"
                                                    name="secondarySkills"
                                                >
                                                    <Select
                                                        mode="multiple"
                                                        placeholder="Select secondary skills"
                                                        showSearch
                                                        optionFilterProp="label"
                                                        options={filteredOptions}
                                                    />
                                                </Form.Item>
                                            );
                                        }}
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Current Address */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Current Address"
                            icon={<HomeOutlined />}
                            iconColor="#52c41a"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}
                        >
                            <Row gutter={[16, 8]}>
                                <Col span={24}>
                                    <Form.Item
                                        label="Address Line 1"
                                        name="currentAddressLine1"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Address Line 1" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item label="Address Line 2" name="currentAddressLine2">
                                        <Input placeholder="Address Line 2" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="City"
                                        name="currentCity"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="City" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="State"
                                        name="currentState"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select state" showSearch>
                                            {indianStates.map(state => (
                                                <Option key={state} value={state}>{state}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label="Zip Code"
                                        name="currentZipCode"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Zip Code" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Permanent Address */}
                    <Col xs={24} lg={12}>
                        <WidgetCard
                            title="Permanent Address"
                            icon={<HomeOutlined />}
                            iconColor="#fadb14"
                            style={{ borderRadius: '10px', border: '1px solid #e8e8e8' }}
                        >
                            <Checkbox
                                onChange={handleCheckboxChange}
                                style={{ marginBottom: '16px' }}
                            >
                                Same as Current Address
                            </Checkbox>
                            <Row gutter={[16, 8]}>
                                <Col span={24}>
                                    <Form.Item
                                        label="Address Line 1"
                                        name="permanentAddressLine1"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Address Line 1" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item label="Address Line 2" name="permanentAddressLine2">
                                        <Input placeholder="Address Line 2" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="City"
                                        name="permanentCity"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="City" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="State"
                                        name="permanentState"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Select placeholder="Select state" showSearch>
                                            {indianStates.map(state => (
                                                <Option key={state} value={state}>{state}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        label="Zip Code"
                                        name="permanentZipCode"
                                        rules={[{ required: true, message: 'Required' }]}
                                    >
                                        <Input placeholder="Zip Code" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </WidgetCard>
                    </Col>

                    {/* Submit Button */}
                    <Col span={24}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                            <Button
                                icon={<CloseOutlined />}
                                onClick={() => setIsAccordionVisible(false)}
                                size="large"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                htmlType="submit"
                                loading={loader}
                                size="large"
                            >
                                Add Employee
                            </Button>
                        </div>
                    </Col>
                </Row >
            </Form >
        </Modal >
    );
};

export default EmployeeDataAccordion;