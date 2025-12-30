import React, { useState, useEffect } from "react";
import { Select, Empty, Input, Button } from "antd";
import { DownloadOutlined, PlusOutlined , ReloadOutlined } from '@ant-design/icons';
import styles from "./AllLeavesRecords.module.css";
import { allLeaveRecords } from "../../services/api";
import { allLeavesData } from "../../util/leavetableData";
import { CSVLink } from 'react-csv';

const { Search } = Input;

const leaveTypeMaster = {
  1: "Sick/Emergency Leave",
  2: "Privilege Leave",
  3: "Work From Home",
  4: "Customer Approved Comp-off",
  5: "Customer Approved Work From Home",
  6: "Customer Holiday",
  7: "Working Late Today",
  8: "Visiting Client Location",
  9: "Casual Leave",
  10: "Swap Leave",
  11: "Exempt Work From Home",
  12: "Unpaid sick Leave",
  13: "Unpaid Privilege Leave",
};

const getLeaveTypeName = (id) => {
  return leaveTypeMaster[id] || "Unknown Leave Type";
};

export const AllLeavesRecords = () => {
  // const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveRecords, setLeaveRecords] = useState([]);
  const yearRanges = ["2022-2023", "2023-2024", "2024-2025", "2025-2026"];
    const [selectedRange, setSelectedRange] = useState("2025");
  
  
    const handleChangeYear = (value) => {
      // setSelectedRange(value);
  
      // Extract the first year from the selected range
      const firstYear = value.split("-")[0];
      setSelectedRange(firstYear)
    };

  const fetchLeaveRecords = async () => {
    const response = await allLeaveRecords(selectedRange);
    if (response) {
      setLeaveRecords(response.data);
    } else {
      setLeaveRecords([]);
    }
    // setLoading(false);
  };
  useEffect(() => {
    fetchLeaveRecords();
  }, [selectedRange]);

  const filteredEmployeeData = leaveRecords?.filter((record) => {
    const query = searchQuery.toLowerCase();
    return Object.values(record).some(value =>
      value && value.toString().toLowerCase().includes(query)
    );
  });

  const headers = allLeavesData.map(col => ({
    label: col.displayName,
    key: col.key,
  }));

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  return (
    <div style={{ padding: "2.5rem 2rem 0 2rem" }} className={styles.main}>
      <div style={{ display: "flex", justifyContent: "start" }} className={styles.leaveDiv}>
      </div>
      <div className={styles.upperArea}>
        <Input
          className={styles.searchBar}
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearch}
        />
         <Button icon={<ReloadOutlined />} onClick={fetchLeaveRecords} style={{ marginRight: '0px' }}>
         </Button>
        <div className={styles.buttonGroup}>
          <CSVLink
            data={filteredEmployeeData}
            headers={headers}
            filename="all_data.csv"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Button className={styles.csvBtn} type="primary">Download
            </Button>
          </CSVLink>
        </div>

        <div className={styles.YearDiv}>
                    <h5 style={{paddingLeft:"1rem", paddingTop:"0.8rem"}} className={styles.heading}>Year</h5>
                    <Select
                      value={selectedRange}
                      onChange={handleChangeYear}
                      placeholder="Select Year Range"
                      style={{ width: 200 }}
                    >
                      {yearRanges.map((range) => (
                        <Option key={range} value={range}>
                          {range}
                        </Option>
                      ))}
                    </Select>
                </div>
      </div>
      <div style={{ maxHeight: "75vh", maxWidth: "178vh" }} className={styles.tableContainer}>
        <table className={styles.employeeTable}>
          <thead>
            <tr className={styles.tableHead}>
              {allLeavesData.map((header, index) => (
                <th key={index}>{header.displayName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployeeData.length > 0 ? (
              filteredEmployeeData.map((employee, index) => (
                <tr key={index}>
                  {allLeavesData.map((header, subIndex) => (
                    <td key={subIndex}>
                      <div
                        className={`${header.key === "LeaveStatus"
                          ? styles[`${employee[header.key]?.toLowerCase()}Leave`] || ""
                          : ""
                        }`}
                      >
                        {employee[header.key]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={allLeavesData.length}>
                  <Empty description="No data available" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
