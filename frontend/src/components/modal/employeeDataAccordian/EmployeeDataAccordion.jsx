import React, { useState, useEffect, useRef } from 'react';
import { Modal, Collapse, Form, Input, Button, Row, Col, Select, Tag, Checkbox, DatePicker, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import styles from './EmployeeDataAccordion.module.css';
import { indianStates } from '../../../util/helper';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getAllEmployeeSkills, getBands1, getRoles1, insertEmployee } from '../../../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';

const { Panel } = Collapse;
const { Option } = Select;

const EmployeeDataAccordion = ({ isSetLeaveApplicationModal, handleOk, setIsAccordionVisible, getEmployees }) => {
    const [form] = Form.useForm();
    
    const[loader,setLoader]=useState(false)
    const [skills, setSkills] = useState([]);
    const [copyAddress, setCopyAddress] = useState(false);
    const [companyBand, setCompanyBand] = useState(null);
    const [companyRole, setCompanyRole] = useState([]);
    const [activeKey, setActiveKey] = useState(null); // For accordion functionality
    const [companyBand1 , setCompanyBand1] = useState([]);
    const [companyRole1 , setCompanyRole1] = useState([]);
    const[skillEmp,setSkillEmp]=useState([])
    const[skillEmp1,setSkillEmp1]=useState([])
    const optionsSkill=useRef([])




const getEmployeeSkill = async () =>{
    try{
        const res = await getAllEmployeeSkills()
        setSkillEmp(res.data)
        const namesArray = skillEmp?.map(skill => skill.skillName);
        setSkillEmp1(namesArray)
    }
    catch(err){
        console.log(err);
        
    }
}

const getCompanyBandsFtn = async () => {
    try {
        let bandData = [];

        // Loop until valid band data is retrieved
        while (bandData.length === 0) {
            const res = await getBands1();
            bandData = res.data || [];
        }

        // Once data is retrieved, set the state
        setCompanyBand(bandData);

        // Map the data to extract the names and update the state
        const namesArray = bandData.map(band => band.designationName);
        setCompanyBand1(namesArray);
        
    } catch (error) {
        console.error('Error fetching company bands', error);
    }
};

        
const getCompanyRolesFtn = async () => {
    try {
        let roleDataLoop = [];

        while (roleDataLoop.length === 0) {
            const res = await getRoles1();
            roleDataLoop = res.data || [];
        }

        setCompanyRole(roleDataLoop);
        const namesArray = roleDataLoop.map(role => role.subRoleName);
        setCompanyRole1(namesArray);
        
    } catch (error) {
        console.error('Error fetching company roles', error);
    }
};

       
            
            useEffect(()=>{
                getCompanyBandsFtn();
                getCompanyRolesFtn();
                getEmployeeSkill()
           
                if(skillEmp1.length === 0){
                    getCompanyBandsFtn();
                    getCompanyRolesFtn();
                    getEmployeeSkill()
                    }
                
            },[])
        
    const getDesignationId = (designationName) => {
        const designation = companyBand?.find(item => item.designationName === designationName);
        return designation ? designation.designationId : null;
    };

    const getRoleId = (role) => {
        const getRole = companyRole.find(item => item.subRoleName === role);
        return getRole ? getRole.subRoleId : null;
    };

    const resetForm = () => {
        form.resetFields();
    };
    
    const fethNameById =(id) =>{
   
        
        const res = optionsSkill.current.find((el)=>el.skillId==id)
        return res.skillName
    }

    const handleJioDateChange = (date) => {
       
        return date
        // if (date) {
        //     return date.clone().add(1, 'days').toISOString();
        //   }
        //   return '';
    };
    
    
    
    const transformData = (data) => {
    
        
    return {
      // employeeId: data.employeeId || "",
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName ,
      
      contactNumber: data.contactNumber ,
      emergencyContactNumber: data.emergencyContactNumber ,
      emergencyContactPerson: data.emergencyContactPerson ,
      emergencyContactRelation: data.emergencyContactRelation ,
      email: data.email ,
      personalEmail: data.personalEmail,
      gender: data.gender === 'Male' ? 'M' : 'F',
      bloodGroup: data.bloodGroup ,
      band: getDesignationId(data.band),
      employeeSubRole: getRoleId(data.role),
      dateOfBirth:data.dateOfBirth,
      dateOfJoining: data.dateOfJoining,
      highestQualification: data.highestQualification,
      addresses: {
        residentialAddressType: "Residential",
        residentialState: data.currentState,
        residentialCity: data.currentCity ,
        residentialAddress1: data.currentAddressLine1 ,
        residentialAddress2: data.currentAddressLine2,
        residentialZipcode: data.currentZipCode,
        permanentAddressType: "Permanent",
        permanentState: data.permanentState,
        permanentCity: data.permanentCity ,
        permanentAddress1: data.permanentAddressLine1 ,
        permanentAddress2: data.permanentAddressLine2 ,
        permanentZipcode: data.permanentZipCode ,
        isSamePermanant: copyAddress,
      },
      skills: [
        ...data.primarySkills.map((skill, index) => ({
          skillId: skill,
          skillName: fethNameById(skill),
          skillLevel: 'Primary' 
        })),
        ...data.secondarySkills.map((skill, index) => ({
          skillId: skill,
          skillName: fethNameById(skill),
          skillLevel: 'Secondary' 
        }))
      ],
      resumeLink: data.resumeLink || '',
     
    };
  };  

    const handleSubmit = async (values) => {
    
        
      setLoader(true)
        try {
            const transformedData = transformData(values);
            const res = await insertEmployee(transformedData);
            if(res.status===200){
                getEmployees();    
            }
            
            resetForm();
            setIsAccordionVisible(false);
            message.success("Employee data inserted successfully")
            
        } catch (error) {
            toast.error(error.message);
        }finally{
          setLoader(false)
        }
    };

    const handleSkillChange = (value) => {
    
        
      setSkills(value);    
    };

    const handleCheckboxChange = (e) => {
        setCopyAddress(e.target.checked);
        const currentAddressFields = form.getFieldsValue(['currentAddressLine1', 'currentAddressLine2', 'currentCity', 'currentState', 'currentZipCode']);

        if (e.target.checked) {
            form.setFieldsValue({
                permanentAddressLine1: currentAddressFields.currentAddressLine1,
                permanentAddressLine2: currentAddressFields.currentAddressLine2,
                permanentCity: currentAddressFields.currentCity,
                permanentState: currentAddressFields.currentState,
                permanentZipCode: currentAddressFields.currentZipCode,
                permanentCountry: 'India',
            });
        } else {
            form.resetFields(['permanentAddressLine1', 'permanentAddressLine2', 'permanentCity', 'permanentState', 'permanentZipCode']);
        }
    };

    const handleAccordionChange = (key) => {
        setActiveKey(key);
    };
   

    const accordionData = [
        {
            title: 'Employee Personal Info',
            fields: [
                { label: 'First Name:', type: 'text', name: 'firstName', placeholder: 'First name', rules: [{ required: true, message: 'First Name is required' }] },
                { label: 'Middle Name:', type: 'text', name: 'middleName', placeholder: 'Middle name' },
                { label: 'Last Name:', type: 'text', name: 'lastName', placeholder: 'Last name' },
                {
                    label: 'Gender:',
                    type: 'select',
                    name: 'gender',
                    placeholder: 'Gender',
                    options: ['Male', 'Female']
                },
                { label: 'Date of Joining:', type: 'date', name: 'dateOfJoining', placeholder: 'Joining Date', rules: [{ required: true, message: 'Date of Joining is required' }] },
                { label: 'Date of Birth:', type: 'date', name: 'dateOfBirth', placeholder: 'Date of Birth', rules: [{ required: true, message: 'Date of Birth is required' }] },
                { label: 'Highest Qualification:', type: 'text', name: 'highestQualification', placeholder: 'Highest Qualification', rules: [{ required: true, message: 'Qualification is required' }] },
                { label: 'Resume Link:', type: 'text', name: 'resumeLink', placeholder: 'resumeLink', rules: [{ required: true, message: 'Resume Link is required' }] },
                { label: 'Blood Group:', type: 'text', name: 'bloodGroup', placeholder: 'bloodGroup', rules: [{ required: true, message: 'Blood Group is required' }] },
                { label: 'Email:', type: 'text', name: 'email', placeholder: 'Email', rules: [{ required: true, message: 'Email is required' }] },
                { label: 'Band:', type: 'select', name: 'band', placeholder: 'Band' , options : companyBand1},
                { label: 'Role:', type: 'select', name: 'role', placeholder: 'Role' , options : companyRole1 },
                { label: 'Contact Number:', type: 'phone', name: 'contactNumber', placeholder: 'Contact Number', rules: [{ required: true, message: 'Contact Number is required' }] },
                { label: 'Personal Email:', type: 'text', name: 'personalEmail', placeholder: 'Personal Email', rules: [{ required: true, message: 'Personal Email is required' }] },
                { label: 'Emergency Contact Person:', type: 'text', name: 'emergencyContactPerson', placeholder: 'Emergency Contact Person', rules: [{ required: true, message: 'Emergency Contact Person is required' }] },
                { label: 'Emergency Contact Relation:', type: 'text', name: 'emergencyContactRelation', placeholder: 'Emergency Contact Relation', rules: [{ required: true, message: 'Emergency Contact Relation is required' }] },
                { label: 'Emergency Contact Number:', type: 'phone', name: 'emergencyContactNumber', placeholder: 'Emergency Contact Number', rules: [{ required: true, message: 'Emergency Contact Number is required' }] }
            ]
        },
        {
            title: 'Employee Address Details',
            fields: [
                { label: 'Current Address Line 1:', type: 'text', name: 'currentAddressLine1', placeholder: 'Address Line 1', rules: [{ required: true, message: 'Current Address is required' }] },
                { label: 'Current Address Line 2:', type: 'text', name: 'currentAddressLine2', placeholder: 'Address Line 2' },
                { label: 'Current City:', type: 'text', name: 'currentCity', placeholder: 'City', rules: [{ required: true, message: 'Current City is required' }] },
                {
                    label: 'Current State:',
                    type: 'select',
                    name: 'currentState',
                    placeholder: 'State',
                    options: indianStates
                },
                { label: 'Current Zip Code:', type: 'text', name: 'currentZipCode', placeholder: 'Zip Code', rules: [{ required: true, message: 'Current Zip Code is required' }] },
                {
                    label: 'Same as Current Address:',
                    type: 'checkbox',
                    name: 'sameAsCurrentAddress',
                    onChange: handleCheckboxChange
                },
                { label: 'Permanent Address Line 1:', type: 'text', name: 'permanentAddressLine1', placeholder: 'Permanent Address Line 1', rules: [{ required: true, message: 'Permanent Address is required' }] },
                { label: 'Permanent Address Line 2:', type: 'text', name: 'permanentAddressLine2', placeholder: 'Permanent Address Line 2' },
                { label: 'Permanent City:', type: 'text', name: 'permanentCity', placeholder: 'Permanent City', rules: [{ required: true, message: 'Permanent City is required' }] },
                {
                    label: 'Permanent State:',
                    type: 'select',
                    name: 'permanentState',
                    placeholder: 'State',
                    options: indianStates
                },
                { label: 'Permanent Zip Code:', type: 'text', name: 'permanentZipCode', placeholder: 'Permanent Zip Code', rules: [{ required: true, message: 'Permanent Zip Code is required' }] }
            ]
        },
        {
            title: 'Employee Skills',
            fields: [
              { label: 'Primary Skills:', type: 'select', name: 'primarySkills', placeholder: 'Primary Skills', options: skillEmp },
              { label: 'Secondary Skills:', type: 'select', name: 'secondarySkills', placeholder: 'Secondary Skills', options: skillEmp },
            ] 
        }
    ];

    const renderFormFields = (fields) => {
        
        
      return fields?.map(field => {
          const { label, type, name, placeholder, options, rules, onChange } = field;
      
        if (name === 'primarySkills' || name === 'secondarySkills') {
            // setOptionsSkill(prev=>[...prev,options])
            optionsSkill.current = options
            
            
            // setOptionsSkill(JSON.parse(JSON.stringify(options)))
            return (
                  <Col span={24} key={name}>
                      <Form.Item
                          label={label}
                          name={name}
                          rules={rules}
                          className={styles.formItem}
                      >
                          <Select
                              mode="multiple"  
                              placeholder={placeholder}
                              onChange={handleSkillChange}
                          >
                                 {options?.map(option => (
                                 <Option key={option.skillId} value={option.skillId}>
                                    
                                    {option.skillName}
                                </Option>
                                
                            ))}

                          </Select>
                      </Form.Item>
                  </Col>
              );
          }
  
          // Handle other types of fields normally
          return (
              <Col span={24} key={name}>
                  <Form.Item
                      label={label}
                      name={name}
                      rules={rules}
                      className={styles.formItem}
                  >
                      {type === 'text' && (
                          <Input placeholder={placeholder} />
                      )}
                      {type === 'date' && (
                            // <DatePicker 
                            //     style={{ width: '100%' }} 
                            //     placeholder={placeholder} 
                            //     onChange={(date) => handleJioDateChange(date)} // Use the Moment.js object directly
                            // />
                            <input 
                                    type="date" 
                                    id="datePicker" 
                                    name="datePicker" 
                                    onChange={(e) => handleJioDateChange(e.target.value)} 
                                    placeholder={placeholder} 
                                    style={{ width: '17%' }}
                                    className={styles.inputDate}
                                    onFocus={(e) => e.target.showPicker()}
                                />
                         )}

                      
                      {type === 'select' && (
                          <Select
                          placeholder={placeholder}
                          showSearch // Enables the search functionality
                          filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {options.map(option => (
                            <Option key={option} value={option}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                        
                      )}
                      {type === 'checkbox' && (
                          <Checkbox onChange={onChange}>
                              {label}
                          </Checkbox>
                      )}
                      {type === 'phone' && (
                          <PhoneInput
                              international
                              defaultCountry="IN"
                              placeholder={placeholder}
                          />
                      )}
                  </Form.Item>
              </Col>
          );
      });
    };  

    return (
        <Modal
            title="Add Employee Data"
            visible={isSetLeaveApplicationModal}
            onOk={handleOk}
            onCancel={() => setIsAccordionVisible(false)}
            footer={null}
            destroyOnClose={true}
            width={1000}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className={styles.form}
            >
                <Collapse className={styles.main}
                    activeKey={activeKey}
                    onChange={handleAccordionChange}
                    expandIcon={({ isActive }) => (
                        <div style={{ fontSize: '12px' }}>
                            {isActive ? <CloseOutlined /> : null}
                        </div>
                    )}
                    accordion
                >
                    {accordionData.map((section, index) => (
                        <Panel header={section.title} key={index}>
                            <Row gutter={[16, 16]}>
                                {renderFormFields(section.fields)}
                            </Row>
                        </Panel>
                    ))}
                </Collapse>
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                    <div style={{ display:"flex",justifyContent:"end", paddingTop:"1.5rem" }}>
                    <Button type="primary" htmlType="submit" className={styles.submitBtn} loading={loader} style={{ display:"flex",width: '20%' }}>
                            Submit
                        </Button>
                    </div>
                        
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default EmployeeDataAccordion;