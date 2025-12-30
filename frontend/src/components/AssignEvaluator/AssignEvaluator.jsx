import React, { useState, useEffect } from 'react';
import styleLead from "./AssignEvaluator.module.css";
import { Select } from 'antd';
import { assignEvaluators, getEmployeeList } from "../../services/api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const AssignEvaluator = ({
  mode = "assign",
  initialEmployee = null,
  initialEvaluators = [],
  onClose = () => {}
}) => {
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [selectedLeadNames, setSelectedLeadNames] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    handleEmployeeList();
  }, []);

  useEffect(() => {
    if (mode === "edit" && initialEmployee && employeeList.length > 0) {
      setSelectedEmployee(initialEmployee);
      setSelectedLeads(initialEvaluators);
      const emp = employeeList.find(e => e.employeeId === initialEmployee);
      if (emp) {
        setSelectedEmployeeName(`${emp.firstName} ${emp.lastName}`);
      }
    }
  }, [mode, initialEmployee, initialEvaluators, employeeList]);

  const handleEmployeeList = async () => {
    try {
      const response = await getEmployeeList();
      setEmployeeList(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch employee list");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await assignEvaluators(selectedEmployee, selectedLeads);
      setSelectedEmployee(null);
      setSelectedLeads([]);
      setSelectedEmployeeName("");
      setSelectedLeadNames([]);
      toast.success("Evaluators assigned successfully");
      if (response.data.emailFailures?.length > 0) {
        toast.warning(`Assignment successful, but failed to send emails to: ${response.data.emailFailures.join(', ')}`);
      } else {
        toast.success("Emails sent to all evaluators");
      }
      onClose();
    } catch (error) {
      console.log(error);
      toast.error("Failed to assign evaluators");
    } finally {
      setIsLoading(false);
    }
  };

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  const leadOptions = employeeList
    .filter(employee => employee.employeeId !== selectedEmployee)
    .map(employee => ({
      value: employee.employeeId,
      label: `${employee.firstName} ${employee.lastName}`,
    }));

  const handleEmployeeChange = (value, option) => {
    setSelectedEmployee(value);
    setSelectedEmployeeName(option.label);
    setSelectedLeads([]);
    setSelectedLeadNames([]);
  };

  const handleLeadChange = (values, options) => {
    setSelectedLeads(values);
    setSelectedLeadNames(options.map(opt => opt.label));
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
              <span>Evaluator(s) :</span>
            </div>
          </div>
          <div>
            <div className={styleLead.nameDiv}>
              <Select
                showSearch
                style={{ width: 300 }}
                options={employeeOptions}
                onChange={handleEmployeeChange}
                placeholder="Employee List"
                optionFilterProp="label"
                filterSort={(a, b) =>
                  (a?.label ?? '').toLowerCase().localeCompare((b?.label ?? '').toLowerCase())
                }
                value={selectedEmployee ? {
                  value: selectedEmployee,
                  label: selectedEmployeeName
                } : undefined}
                disabled={isLoading}
              />
            </div>
            <div className={styleLead.nameDiv}>
              <Select
                mode="multiple"
                showSearch
                style={{ width: 300, marginBottom: 24 }}
                options={leadOptions}
                onChange={handleLeadChange}
                placeholder="Evaluator List"
                optionFilterProp="label"
                filterSort={(a, b) =>
                  (a?.label ?? '').toLowerCase().localeCompare((b?.label ?? '').toLowerCase())
                }
                value={selectedLeads}
                dropdownStyle={{ maxHeight: 150, overflowY: 'auto' }}
                getPopupContainer={trigger => trigger.parentNode}
                disabled={isLoading}
              />
            </div>
          </div>
          <button
            className={styleLead.btn}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>

        {selectedEmployeeName && selectedLeadNames.length > 0 && (
          <div className={styleLead.messageDiv} style={{ marginTop: 20, lineHeight: 1.6 }}>
            <span>
              Evaluator(s) for <strong style={{ marginLeft: 4 }}>{selectedEmployeeName}</strong> are:
            </span>
            <br />
            <span style={{ marginLeft: 8 }}>{selectedLeadNames.join(', ')}</span>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};