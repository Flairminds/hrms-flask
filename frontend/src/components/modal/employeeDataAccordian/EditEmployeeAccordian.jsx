// ✅ Updated Full Code with native <input type="date"> instead of AntD <DatePicker />

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import moment from 'moment';

import styles from "./EditEmployeeAccordian.module.css";

import {
    getEmployeeList as fetchEmployeeListFromAPI,
    getRoles1,
    getLobLead,
    getBands1,
    updateEmployeeDetailsByHR,
    getTeamLeadList,
    getProjectNameForHR,
    getCompanyBands,
    getCompanyRoles,
    uploadDocument
} from '../../../services/api';

const { Option } = Select;

const EditEmployeeAccordian = ({ getEmployees, visible, editingRow, setIsEditModalOpen, isEditModalOpen, setDetailsModal, personalEmployeeDetails }) => {
    const [employees, setEmployees] = useState([]);
    const [companyRole, setCompanyRole] = useState([]);
    const [companyBand, setCompanyBand] = useState([]);
    const [projectName, setProjectName] = useState([]);
    const [lobLeads, setLobLeads] = useState([]);
    const [loader, setLoader] = useState(false);
    const [medicalCertFile, setMedicalCertFile] = useState(null);
    const [form] = Form.useForm();
    const [bandsData, setBandsData] = useState([]);
    const [roleData, setRoleData] = useState([]);

    const getRoleData = async () => {
        const response = await getCompanyRoles();
        setRoleData(response.data);
    };

    const getCompanyBandsData = async () => {
        try {
            const response = await getCompanyBands();
            if (Array.isArray(response.data)) {
                setBandsData(response.data);
            }
        } catch (error) {
            console.error('Error fetching company bands:', error);
        }
    };

    const getBandId = (band) => {
        const bandObj = bandsData.find(b => b.Band === band);
        return bandObj?.DesignationId || null;
    };

    const getRoleId = (role) => {
        const roleObj = companyRole.find(r => r.subRoleName === role);
        return roleObj?.subRoleId || null;
    };

    const getLobId = (lobLead) => {
        const lob = lobLeads.find(r => r.LobLead.trim() === lobLead.trim());
        return lob?.LobID || null;
    };

    const fetchInitialData = async () => {
        try {
            const [roles, bands, projects, leads, teamLeads] = await Promise.all([
                getRoles1(),
                getBands1(),
                getProjectNameForHR(),
                getLobLead(),
                getTeamLeadList()
            ]);

            setCompanyRole(roles.data);
            setCompanyBand(bands.data);
            setProjectName(projects.data);
            setLobLeads(leads.data);
            setEmployees(teamLeads.data);
        } catch (err) {
            console.error('Failed to fetch initial data:', err);
        }
    };

    useEffect(() => {
        getRoleData();
        getCompanyBandsData();
        fetchInitialData();
    }, []);

    const toDateOrEmpty = (dateStr) =>
        dateStr && moment(dateStr, 'YYYY-MM-DD').isValid()
            ? moment(dateStr).format('YYYY-MM-DD')
            : "";

    useEffect(() => {
        if (editingRow && Object.keys(editingRow).length > 0) {
            form.resetFields();
            form.setFieldsValue({
                designationId: editingRow.band,
                subRoleId: editingRow.role,
                lobLeadId: editingRow.lobLead,
                employmentStatus: editingRow.employmentStatus,
                mobileNo: editingRow.contact,
                resumeLink: editingRow.resumeLink,
                lwp: editingRow.lwp,
                internshipEndDate: toDateOrEmpty(editingRow.internshipEndDate),
                dateOfResignation: toDateOrEmpty(editingRow.dateOfResignation),
                lwd: toDateOrEmpty(editingRow.lwd),
                probationEndDate: toDateOrEmpty(editingRow.probationEndDate),
                projectDetails: editingRow.projectDetails?.map(project => ({
                    projectName: project.projectName,
                    projectAllocation: project.projectAllocation,
                    projectBilling: project.billing,
                    employeeRole: project.role,
                }))
            });
        }
    }, [editingRow, form]);

    const handleOk = async () => {
        setLoader(true);
        try {
            await form.validateFields();
            const values = form.getFieldsValue(true);

            const mappedProjectDetails = values.projectDetails?.map((project) => {
                const projectInfo = projectName.find(p => p.ProjectName === project.projectName);
                const roleInfo = companyRole.find(r => r.subRoleId === project.employeeRole || r.subRoleName === project.employeeRole);

                return {
                    projectId: projectInfo?.ProjectId || null,
                    projectAllocation: project.projectAllocation,
                    projectBilling: project.projectBilling,
                    role: roleInfo?.subRoleId || null
                };
            }) || [];

            const requestData = {

                employeeId: editingRow.employeeId,
                designationId: getBandId(values.designationId),
                subRoleId: getRoleId(values.subRoleId),
                lobLeadId: getLobId(values.lobLeadId),
                employmentStatus: values.employmentStatus,
                mobileNo: values.mobileNo,
                resumeLink: values.resumeLink,
                internshipEndDate: values.internshipEndDate || null,
                dateOfResignation: values.dateOfResignation || null,
                lwd: values.lwd || null,
                probationEndDate: values.probationEndDate || null,
                lwp: values.lwp,
                projectDetails: mappedProjectDetails

            };

            // console.log("Final Payload:", JSON.stringify(requestData, null, 2));

            const res = await updateEmployeeDetailsByHR(requestData, editingRow.employeeId);
            // console.log("API response:", res);

            if (res.status === 200) {
                // Upload medical certificate if file is selected
                if (medicalCertFile && editingRow.employeeId) {
                    try {
                        await uploadDocument(editingRow.employeeId, 'medical_certificate', medicalCertFile);
                        console.log('Medical certificate uploaded successfully');
                    } catch (uploadError) {
                        console.error('Error uploading medical certificate:', uploadError);
                        message.warning('Employee updated but medical certificate upload failed');
                    }
                }

                await getEmployees();
                message.success("Employee Details updated successfully.");
                setMedicalCertFile(null);
                setIsEditModalOpen(false);
                setDetailsModal(false);
            } else {
                console.warn("Unexpected response status:", res.status);
            }
        } catch (error) {
            console.error('Error updating employee:', error);
        } finally {
            setLoader(false);
        }
    };

    const handleCancel = () => {
        setIsEditModalOpen(false);
        setDetailsModal(false);
    };

    return (
        <Modal
            title="Update Employee Details"
            onOk={handleOk}
            open={isEditModalOpen}
            onCancel={handleCancel}
            footer={[
                <div key="footer-buttons">
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button className={styles.btn} onClick={handleOk} loading={loader}>Apply</Button>
                </div>
            ]}
            centered
        >
            <div className={styles.nameDiv}>
                <div>
                    <span className={styles.headingFirst}>First Name: </span>
                    <span>{editingRow?.firstName}</span>
                </div>
                <div>
                    <span className={styles.headingFirst}>Last Name: </span>
                    <span>{editingRow?.lastName}</span>
                </div>
            </div>

            <Form form={form} layout="vertical" name="update_employee_details">
                <Form.Item name="designationId" label="Band">
                    <Select placeholder="Select a designation">
                        {companyBand.map(band => (
                            <Option key={band.designationName}>{band.designationName}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="subRoleId" label="Role">
                    <Select placeholder="Select a sub role">
                        {companyRole.map(role => (
                            <Option key={role.subRoleName}>{role.subRoleName}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="lobLeadId" label="LOB Lead">
                    <Select placeholder="Select a LOB Lead">
                        {lobLeads.map(role => (
                            <Option key={role.LobLead}>{role.LobLead}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item name="employmentStatus" label="Employment Status">
                    <Select placeholder="Select an employment status">
                        <Option value="Relieved">Relieved</Option>
                        <Option value="Confirmed">Confirmed</Option>
                        <Option value="Absconding">Absconding</Option>
                        <Option value="Resigned">Resigned</Option>
                        <Option value="Probation">Probation</Option>
                        <Option value="Intern">Intern</Option>
                        <Option value="LWP">LWP</Option>
                        <Option value="NonFM">NonFM</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="mobileNo" label="Mobile Number">
                    <Input placeholder="Number" />
                </Form.Item>

                <Form.Item name="resumeLink" label="Resume Link">
                    <Input placeholder="Enter Resume Link" />
                </Form.Item>

                {['internshipEndDate', 'probationEndDate', 'dateOfResignation', 'lwd'].map(field => {
                    let label = '';
                    if (field === 'internshipEndDate') label = 'Internship End Date';
                    else if (field === 'probationEndDate') label = 'Probation End Date';
                    else if (field === 'dateOfResignation') label = 'Date of Resignation';
                    else if (field === 'lwd') label = 'Last Working Day';

                    return (
                        <Form.Item name={field} label={label} key={field}>
                            <input
                                type="date"
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid #d9d9d9'
                                }}
                                value={form.getFieldValue(field) || ""}
                                onChange={(e) =>
                                    form.setFieldsValue({ [field]: e.target.value })
                                }
                            />
                        </Form.Item>
                    );
                })}

                <Form.Item name="lwp" label="LWP (Leave Without Pay)">
                    <InputNumber style={{ width: '100%' }} placeholder="Enter LWP days" />
                </Form.Item>

                <Form.Item label="Medical Certificate">
                    <Input
                        type="file"
                        onChange={(e) => setMedicalCertFile(e.target.files[0])}
                        style={{ padding: '4px' }}
                    />
                </Form.Item>

                <Form.List name="projectDetails">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <div className={styles.projectNameContainer} key={key}>
                                    <Form.Item {...restField} name={[name, 'projectName']} label="Project Name">
                                        <Select placeholder="Select Project Name">
                                            {projectName.map((project) => (
                                                <Option key={project.ProjectId} value={project.ProjectName}>
                                                    {project.ProjectName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item {...restField} name={[name, 'projectAllocation']} label="Bandwidth Allocation">
                                        <InputNumber placeholder="Enter allocation" />
                                    </Form.Item>

                                    <Form.Item {...restField} name={[name, 'projectBilling']} label="Billing">
                                        <InputNumber placeholder="Enter billing" />
                                    </Form.Item>

                                    <Form.Item {...restField} name={[name, 'employeeRole']} label="Role">
                                        <Select placeholder="Select Role">
                                            {companyRole.map(role => (
                                                <Option key={role.subRoleId} value={role.subRoleId}>
                                                    {role.subRoleName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Button type="link" onClick={() => remove(name)}>Remove</Button>
                                </div>
                            ))}

                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Add Project
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </Form>

            <ToastContainer />
        </Modal>
    );
};


export default EditEmployeeAccordian;
