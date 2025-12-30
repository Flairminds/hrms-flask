import React, { useState, useEffect } from 'react';
import styleLead from "./LeadAssign.module.css";
import { Select } from 'antd';
import { getEmployeeList, postEmployeeId } from "../../services/api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const LeadAssign = () => {
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [selectedLeadName, setSelectedLeadName] = useState("");

  useEffect(() => {
    handleEmployeeList();
  }, []);

  const handleEmployeeList = async () => {
    try {
      const response = await getEmployeeList();
      setEmployeeList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async() => {
    try{
      const response = await postEmployeeId(selectedEmployee,selectedLead)
      setSelectedEmployee(null)
      setSelectedLeadName(null)
      toast.success("Lead Assigned")

    }
    catch(error){
      console.log(error);
    }
    
  };

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  const handleEmployeeChange = (value, option) => {
    setSelectedEmployee(value);
    setSelectedEmployeeName(option.label);
  };

  const handleLeadChange = (value, option) => {
    setSelectedLead(value);
    setSelectedLeadName(option.label);
  };

  return (
    <div className={styleLead.main}>
      <div className={styleLead.messageDropDown}>
        <div className={styleLead.dropDownDiv}>
          <div>
            <div className={styleLead.nameDiv}>
              <span>Employee Name : </span>
            </div>
            <div className={styleLead.nameDiv}>
              <span>Lead Name :</span>
            </div>
          </div>
          <div>
            <div className={styleLead.nameDiv}>
              <Select
                showSearch
                style={{ width: 200 }}
                options={employeeOptions}
                onChange={handleEmployeeChange}
                placeholder="Employee List"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                }
              />
            </div>
            <div className={styleLead.nameDiv}>
              <Select
                showSearch
                style={{ width: 200 }}
                options={employeeOptions}
                onChange={handleLeadChange}
                placeholder="Lead List"
                optionFilterProp="label"
                filterSort={(optionA, optionB) =>
                  (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                }
              />
            </div>
          </div>
          <button className={styleLead.btn} onClick={handleSave}>Save</button>
        </div>
        {selectedEmployeeName && selectedLeadName && (
          <div className={styleLead.messageDiv}>
            This Lead for {selectedEmployeeName} will be {selectedLeadName}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};
