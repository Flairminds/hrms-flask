import React, { useEffect, useState } from "react";
import axios from "axios";
import styleSkillTracking from "./AllDocRecords.module.css"
import { Button, Input, message } from "antd";
import { getDocuments, getEmpDocRecords } from "../../services/api";

export const AllDocRecords = () => {
  const [employeeDocs, setEmployeeDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [verificationStatus, setVerificationStatus] = useState({});

  useEffect(() => {
    const getEmpRecords = async () => {
      try {
        const response = await getEmpDocRecords();
        console.log("Employee Records Response:", response.data);
        
        setEmployeeDocs(response.data);
        
        // Fetch verification status for each employee
        const statusPromises = response.data.map(emp => 
          axios.get(`https://hrms-flask.azurewebsites.net/api/document-verification-status/${emp.emp_id}`)
        );
        
        const statusResults = await Promise.all(statusPromises);
        const statusMap = {};
        statusResults.forEach(result => {
          if (result.data && result.data.emp_id) {
            statusMap[result.data.emp_id] = result.data.documents;
          }
        });
        setVerificationStatus(statusMap);
      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Failed to fetch employee records");
      }
    };
    getEmpRecords();
  }, []);

  const handleVerification = async (empId, docType, isVerified) => {
    try {
      const response = await axios.post('https://hrms-flask.azurewebsites.net/api/verify-document', {
        emp_id: empId,
        doc_type: docType,
        is_verified: isVerified
      });

      if (response.status === 200) {
        message.success(`Document ${isVerified ? 'accepted' : 'rejected'} successfully`);
        
        // Update verification status
        setVerificationStatus(prev => {
          const newStatus = { ...prev };
          if (!newStatus[empId]) {
            newStatus[empId] = {};
          }
          newStatus[empId] = {
            ...newStatus[empId],
            [docType]: isVerified
          };
          return newStatus;
        });

        // If rejected, update employeeDocs to remove the document and set verification status to false
        if (!isVerified) {
          setEmployeeDocs(prev => 
            prev.map(emp => {
              if (emp.emp_id === empId) {
                return {
                  ...emp,
                  [docType]: false,
                  [`${docType}_verified`]: false  // Set the verification status to false
                };
              }
              return emp;
            })
          );
        }
      }
    } catch (error) {
      console.error("Error updating verification status:", error);
      message.error("Failed to update verification status");
    }
  };

  const handleAction = async (empId, docType, action) => {
    if (action === "view") {
      try {
        const response = await getDocuments(empId, docType);
  
        if (response.status !== 200) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
  
        const blob = new Blob([response.data], { type: "application/pdf" });
        const fileURL = window.URL.createObjectURL(blob);
        window.open(fileURL, "_blank");
  
        setTimeout(() => URL.revokeObjectURL(fileURL), 5000);
      } catch (error) {
        console.error("Error fetching document:", error);
  
        if (error.response) {
          if (error.response.status === 404) {
            message.warning("Document not available");
          } else {
            message.error(`Error fetching document: ${error.response.statusText}`);
          }
        } else {
          message.error("Network error or server is down");
        }
      }
    } else if (action === "download") {
      try {
        const response = await getDocuments(empId, docType);
  
        if (response.status !== 200) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }
  
        const blob = new Blob([response.data], { type: "application/pdf" });
        const fileURL = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = fileURL;
        link.download = `${docType}_${empId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  
        setTimeout(() => URL.revokeObjectURL(fileURL), 1000);
  
        message.success("Download started");
      } catch (error) {
        console.error("Error downloading document:", error);
  
        if (error.response) {
          if (error.response.status === 404) {
            message.warning("Document not available");
          } else {
            message.error(`Error downloading document: ${error.response.statusText}`);
          }
        } else {
          message.error("Network error or server is down");
        }
      }
    }
  };

  const filteredEmployees = employeeDocs?.filter((employee) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  ); 

  const getVerificationStatus = (empId, docType) => {
    return verificationStatus[empId]?.[docType] ?? null;
  };

  return (
    <div className={styleSkillTracking.main}>
      <Input
        placeholder="Search by Name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styleSkillTracking.searchInput}
        allowClear
      />

      <div className={styleSkillTracking.tableContainer}>
        <table className={styleSkillTracking.table}>
          <thead className={styleSkillTracking.stickyHeader}>
            <tr className={styleSkillTracking.headRow}>
              <th className={styleSkillTracking.th}>Employee ID</th>
              <th className={styleSkillTracking.th}>Name</th>
              <th className={styleSkillTracking.th}>10th</th>
              <th className={styleSkillTracking.th}>12th</th>
              <th className={styleSkillTracking.th}>PAN</th>
              <th className={styleSkillTracking.th}>Aadhaar</th>
              <th className={styleSkillTracking.th}>Graduation</th>
              <th className={styleSkillTracking.th}>FM Resume</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee, index) => (
              <tr key={index} className={styleSkillTracking.tr}>
                <td className={styleSkillTracking.td}>{employee.emp_id}</td>
                <td className={styleSkillTracking.td}>{employee.name}</td>
                {["tenth", "twelve", "pan", "adhar", "grad","resume"].map((docType) => (
                  <td key={docType} className={styleSkillTracking.td}>
                    {employee[docType] ? (
                      <div className={styleSkillTracking.documentActions}>
                        <div className={styleSkillTracking.viewDownload}>
                          <button 
                            onClick={() => handleAction(employee.emp_id, docType, "view")} 
                            className={styleSkillTracking.downloadBtn}
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleAction(employee.emp_id, docType, "download")} 
                            className={styleSkillTracking.downloadBtn}
                          >
                            Download
                          </button>
                        </div>
                        {getVerificationStatus(employee.emp_id, docType) === true ? (
                          <div className={styleSkillTracking.statusBadge}>
                            Accepted
                          </div>
                        ) : (
                          <div className={styleSkillTracking.verificationButtons}>
                            <button 
                              onClick={() => handleVerification(employee.emp_id, docType, true)}
                              className={styleSkillTracking.acceptBtn}
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleVerification(employee.emp_id, docType, false)}
                              className={styleSkillTracking.rejectBtn}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "orange", fontWeight: "bold" }}>Not Uploaded</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
