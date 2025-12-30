import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import stylesManger from "./SalarySlipUpload.module.css";
import { Button, message, Modal, Select } from 'antd';
import { downloadSalarySlip, getEmployeeList, uploadSalarySlip, viewSalaryData } from '../../services/api';
import moment from 'moment';
const { Option } = Select;


export const SalarySlipUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const[tableData,setTableData]=useState([])
  const[year,setYear]=useState([])
  const[month,setMonth]=useState('')
  const[isOpenSalarySlipModal,setIsOpenSalarySlipModal]=useState(false)
  console.log(month,"month");
  
  
  const [employeeList, setEmployeeList] = useState([]);
  const[selectedEmployee,setSelectedEmployee]=useState([])
  const[loader,setLoader]=useState({
    general: false, // General loader
    upload: false,
    download:false,
  })
  
    const handleEmployeeList = async () => {
        try {
          const response = await getEmployeeList();
          setEmployeeList(response.data);
        } catch (error) {
          console.log(error);
        }
      };
  const months = [
    "January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October",
    "November", "December",
  ];

  const years=["2025","2024","2023","2022"]

  const onDrop = (acceptedFiles) => {
    setSelectedFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ' .xlsx ', // Accept only specific file formats
  });

  const handleViewData =async() =>{
    setLoader({ ...loader, general: true })
    try{
      const response = await viewSalaryData(month,year)
      setTableData(response.data)
      message.success("Data displayed")
    }catch(err){
      console.log(err);  
      message.error(err.response.data.message)
    }finally{
      setLoader({ ...loader, general: false })
      setYear('')
      setMonth('')
      
    }
    
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      message.warning("Please select a file to upload");
      return;
    }

    setLoader({ ...loader, upload: true });
    try {
      await uploadSalarySlip(selectedFiles[0]);
      message.success("File Uploaded");
    } catch (err) {
      console.log(err);
      message.error("Error while uploading file");
    } finally {
      setLoader({ ...loader, upload: false });
      setSelectedFiles([])

    }
  };
  

  const handleCancel=()=>{
    setMonth('')
    setSelectedEmployee([])
    setYear('')
    setIsOpenSalarySlipModal(false)
    
  }

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  const openSalarySlipModal =()=>{
    setMonth('')
    handleEmployeeList()
    setIsOpenSalarySlipModal(true)
  }

  const handleEmployeeChange = (value, option) => {
    setSelectedEmployee(value);
    // setSelectedEmployeeName(option.label);
  };


  const handleDownloadSalarySlip = async () => {
    setLoader({ ...loader, download: true });
    try {
      const res = await downloadSalarySlip(selectedEmployee, month, year);
      
      if (res && res.data && res.data.salary_slip) {
        const base64Data = res.data.salary_slip;
    
        // Convert base64 to binary data
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'application/pdf' });
    
        // Create a URL for the Blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
    
        // Set the file name using either content-disposition header or document_name from response
        let fileName = "salarySlip"; // Default file name
    
        const contentDisposition = res.headers['content-disposition'];
        if (contentDisposition) {
          const matches = /filename="(.+)"/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            fileName = matches[1];
          }
        } else if (res.data.document_name) {
          fileName = res.data.document_name; // Use document_name from response if available
        }
    
        // Trigger download with the correct file name
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
    
        // Cleanup after download
        window.URL.revokeObjectURL(url);
        link.remove();
        message.success("File downloaded successfully");
      } else {
        message.error("Failed to download the file");
      }
      if (res.status === 200) {
        message.success("Salary Slip Downloaded Successfully");
      } else {
        message.error("Data not available or Something went wrong");
      }
    } catch (error) {
      console.log(error);
      
      message.error(error.response.data.message + "Failed to download salary slip " );
    }finally{
      
      setLoader({ ...loader, download: false });
      setSelectedEmployee([])
      setYear('')
      setMonth('')
      setIsOpenSalarySlipModal(false)

    }
  };
  

  return (
    <div className={stylesManger.main}>

        <div className={stylesManger.visibleMain}>
        <div className={stylesManger.visible}>
            <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <div>
                <span>
                <b>
                    {selectedFiles.length
                    ? selectedFiles.map((file) => file.name).join(', ')
                    : 'Drag and drop files here, or'}
                </b>
                </span>
                <span
                style={{
                    color: '#3B7DDD',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginLeft: '5px',
                }}
                >
                Browse
                </span>
            </div>
            <p className={stylesManger.supportHeading}>
                Supported file formats:  XLSX
            </p>
            </div>
            {selectedFiles.length > 0 && (
            <div className={stylesManger.fileList}>
                <h4>Selected Files:</h4>
                <ul>
                {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                ))}
                </ul>
            </div>
            )}
            <div>
        <Button onClick={()=>{handleUpload()}} loading={loader.upload} className={stylesManger.btn}>
            Upload
          </Button>
        </div>
        </div>
        
        </div>
        {/* <h3>Select month and year to view data</h3> */}
        <div className={stylesManger.selectDiv}>
         
              <Select placeholder="Select Month" style={{ width: 200 }}
              value={month || "Select Month"}
              onChange={(value) => setMonth(value)} >
              {months.map((month, index) => (
                <Option key={index} value={month}>
                  {month}
                </Option>
              ))}
            </Select>
            <Select placeholder="Select Year" style={{ width: 200 }}
            value={year || "Select Year"}
            onChange={(value) => setYear(value)} 
            >
              {years.map((year, index) => (
                <Option key={index} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
            <Button
            loading={loader.general}
            className={stylesManger.btn} onClick={()=>handleViewData()}>View</Button>
            <Button onClick={openSalarySlipModal} className={stylesManger.btn}>
              Download Salary Slip
            </Button>
        </div>
        {tableData.length>0 && (
        <div className={stylesManger.tableContainer}>
        <table className={stylesManger.table}>
                  <thead className={stylesManger.stickyHeader}>
                    <tr className={stylesManger.headRow}>
                      <th className={stylesManger.th}>Employee Id</th>
                      <th className={stylesManger.th}>Name of Employee</th>
                      <th className={stylesManger.th}>Date of Joining</th>
                      <th className={stylesManger.th}>Base (Monthly)</th>
                      <th className={stylesManger.th}>Project variable (Monthly)</th>
                      <th className={stylesManger.th}># working days in the month</th>
                      <th className={stylesManger.th}>Comments / Description</th>
                      <th className={stylesManger.th}># days comp-off for encashment</th>
                      <th className={stylesManger.th}>(Add) comp off encashment to salary</th>
                      <th className={stylesManger.th}>Total Earnings(A)</th>
                      <th className={stylesManger.th}># days unpaid full day leaves without leave approval</th>
                      <th className={stylesManger.th}>Comemnts for # days unpaid leave deduction</th>
                      <th className={stylesManger.th}>(Minus) Unpaid leaves amout</th>
                      <th className={stylesManger.th}># days late entry - count of half days</th>
                      <th className={stylesManger.th}>(Minus) Amount - days late entry - count of half days</th>
                      <th className={stylesManger.th}>(Minus) other base salary deductions</th>
                      <th className={stylesManger.th}>Comments for other base salary deductions</th>
                      <th className={stylesManger.th}>(Minus) Monthly variable deduction</th>
                      <th className={stylesManger.th}>Reason for monthly variable deduction / other comments</th>
                      <th className={stylesManger.th}>Total pre-tax deductions (B)</th>
                      <th className={stylesManger.th}>Base salary post deductions </th>
                      <th className={stylesManger.th}>(Add) quarterly variable + other pre-tax additions</th>
                      <th className={stylesManger.th}>Reason for quarterly variable deduction / other comments</th>
                      <th className={stylesManger.th}>Sub Total (Pre-Tx)</th>
                      <th className={stylesManger.th}>Tax deduction Rs (TDS)</th>
                      <th className={stylesManger.th}>Tax deduction Rs. (Professional tax)</th>
                      <th className={stylesManger.th}>Gross salary(post tax)</th>
                      <th className={stylesManger.th}>(Add) Post tax addition</th>
                      <th className={stylesManger.th}>Comments for Post tax addition</th>
                      <th className={stylesManger.th}>(minus) post tax deductions</th>
                      <th className={stylesManger.th}>Comments for post tax deductions</th>
                      <th className={stylesManger.th}>Net Final bank deposit (Monthly)</th>
                      <th className={stylesManger.th}>Month</th>
                      <th className={stylesManger.th}>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData?.map((doc, rowIndex) => (
                      <tr 
                        key={rowIndex}
                        className={stylesManger.tr}
                      >
                        <td className={stylesManger.td}>{doc.employee_id}</td>
                        <td className={stylesManger.td}>{doc.name_of_employee}</td>
                        <td className={stylesManger.td}>{doc.date_of_joining}</td>
                        <td className={stylesManger.td}>{doc.base_monthly}</td>
                        <td className={stylesManger.td}>{doc.project_variable_monthly}</td>
                        <td className={stylesManger.td}>{doc.working_days_in_month}</td>
                        <td className={stylesManger.td}>{doc.comments_description}</td>
                        <td className={stylesManger.td}>{doc.comp_off_days_for_encashment}</td>
                        <td className={stylesManger.td}>{doc.comp_off_encashment_to_salary}</td>
                        <td className={stylesManger.td}>{doc.total_earnings}</td>
                        <td className={stylesManger.td}>{doc.unpaid_full_day_leaves}</td>
                        <td className={stylesManger.td}>{doc.comments_unpaid_leave_deduction}</td>
                        <td className={stylesManger.td}>{doc.unpaid_leaves_amount}</td>
                        <td className={stylesManger.td}>{doc.late_entry_half_days}</td>
                        <td className={stylesManger.td}>{doc.late_entry_deduction_amount}</td>
                        <td className={stylesManger.td}>{doc.other_base_salary_deductions}</td>
                        <td className={stylesManger.td}>{doc.comments_other_base_salary_deductions}</td>
                        <td className={stylesManger.td}>{doc.monthly_variable_deduction}</td>
                        <td className={stylesManger.td}>{doc.reason_monthly_variable_deduction}</td>
                        <td className={stylesManger.td}>{doc.total_pre_tax_deductions}</td>
                        <td className={stylesManger.td}>{doc.base_salary_post_deductions}</td>
                        <td className={stylesManger.td}>{doc.quarterly_variable_additions}</td>
                        <td className={stylesManger.td}>{doc.reason_quarterly_variable_additions}</td>
                        <td className={stylesManger.td}>{doc.subtotal_pre_tax}</td>
                        <td className={stylesManger.td}>{doc.tax_deduction_tds}</td>
                        <td className={stylesManger.td}>{doc.tax_deduction_professional_tax}</td>
                        <td className={stylesManger.td}>{doc.gross_salary_post_tax}</td>
                        <td className={stylesManger.td}>{doc.post_tax_addition}</td>
                        <td className={stylesManger.td}>{doc.comments_post_tax_addition}</td>
                        <td className={stylesManger.td}>{doc.post_tax_deductions}</td>
                        <td className={stylesManger.td}>{doc.comments_post_tax_deductions}</td>
                        <td className={stylesManger.td}>{doc.net_final_bank_deposit}</td>
                        <td className={stylesManger.td}>{doc.month}</td>
                        <td className={stylesManger.td}>{doc.year}</td>


                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
      
        )}

    <Modal
        open={isOpenSalarySlipModal}
        title="Download Salary Slip"
        // onOk={handleOk}
        width={700}
        onCancel={handleCancel}
        footer={[
          <Button key="back" 
          onClick={handleCancel}
          >
            Return
          </Button>,
          <Button key="submit" type="primary" 
          // loading={loading} onClick={handleOk}
          className={stylesManger.btn}
          onClick={()=>handleDownloadSalarySlip()}
          >
            Download
          </Button>,

        ]}
      >
                    <div className={stylesManger.nameDiv}>
                      <Select
                        showSearch
                        style={{ width: 200 }}
                        options={employeeOptions}
                        onChange={handleEmployeeChange}
                        placeholder="Employee List"
                        optionFilterProp="label"
                        value={selectedEmployee || "Select Employee"}
                        filterSort={(optionA, optionB) =>
                          (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                        }
                      />
                       <Select placeholder="Select Month" style={{ width: 200 }}
                       value={month || "Select Month"}
                          onChange={(value) => setMonth(value)} >
                          {months.map((month, index) => (
                            <Option key={index} value={month}>
                              {month}
                            </Option>
                          ))}
                        </Select>
                        <Select placeholder="Select Year" style={{ width: 200 }}
                        value={year || "Select Year"}
                         onChange={(value) => setYear(value)}
                        >
                          {years.map((year, index) => (
                            <Option key={index} value={year}>
                              {year}
                            </Option>
                          ))}
                        </Select>
                    </div>
      </Modal>
    </div>
  );
};
