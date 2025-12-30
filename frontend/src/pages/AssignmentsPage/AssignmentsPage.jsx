import React, { useEffect, useState } from "react";
import {Button,Modal,Form,Input,DatePicker,Pagination,Popconfirm,Select,message,} from "antd";
import {PlusOutlined,EditOutlined,SearchOutlined,DeleteOutlined,} from "@ant-design/icons";
import axios from "axios";
import "./AssignmentsPage.css";
import dayjs from "dayjs";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ApiURL = 'https://hrms.flairminds.com';

const AssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [pcDetails, setPcDetails] = useState([]);
  const [peripherals, setPeripherals] = useState([]);
  const [form] = Form.useForm();
  const [selectedPCs, setSelectedPCs] = useState([]);

  // Fetch Assignments
  const getAllAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ApiURL}/api/Assignments`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAssignments(data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignments([]);
      message.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees
  const fetchEmployee = async () => {
    try {
      const res = await axios.get(
        `${ApiURL}/api/EmployeesDetails/AllEmployeeDetails2`
      );
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    } catch (err) {
      console.error("Error fetching employees:", err);
      message.error("Failed to fetch employees");
      return [];
    }
  };

  // Fetch PC Details
  const fetchPcDetails = async () => {
    try {
      const res = await axios.get(`${ApiURL}/api/PCs`);
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    } catch (err) {
      console.error("Error fetching PC details:", err);
      message.error("Failed to fetch PC details");
      return [];
    }
  };

  // Fetch Peripherals
  const fetchPeripherals = async () => {
    try {
      const res = await axios.get(`${ApiURL}/api/Peripherals`);
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    } catch (err) {
      console.error("Error fetching peripherals:", err);
      message.error("Failed to fetch peripherals");
      return [];
    }
  };

  useEffect(() => {
    getAllAssignments();
    fetchEmployee().then((data) => setEmployees(data));
    fetchPcDetails().then((data) => setPcDetails(data));
    fetchPeripherals().then((data) => setPeripherals(data));
  }, []);

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => e.employeeId === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "-";
  };

  const showAddModal = () => {
    setEditingAssignment(null);
    form.resetFields();
    setSelectedPCs([]);
    setIsModalVisible(true);
  };

  const showEditModal = (id) => {
    const assignment = assignments.find((a) => a.assignmentID === id);
    if (assignment) {
      setEditingAssignment(assignment);
      form.setFieldsValue({
        EmployeeID: assignment.employeeID,
        pcCodes: assignment.pcName?.split(", ") || [],
        assignmentDate: assignment.assignmentDate
          ? dayjs(assignment.assignmentDate)
          : null,
        returnDate: assignment.returnDate
          ? dayjs(assignment.returnDate)
          : null,
      });
      setSelectedPCs(assignment.pcName?.split(", ") || []);
      setIsModalVisible(true);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingAssignment(null);
    setSelectedPCs([]);
  };

  // Add / Update Assignment
  const handleSubmit = async (values) => {
    try {
      const selectedEmp = employees.find(
        (e) => e.employeeId === values.EmployeeID
      );

      const payload = {
        EmployeeID: values.EmployeeID?.toString().trim() || "",
        EmployeeName: selectedEmp
          ? `${selectedEmp.firstName} ${selectedEmp.lastName}`
          : "",
        PCName: Array.isArray(values.pcCodes)
          ? values.pcCodes.join(", ")
          : values.pcCodes?.toString().trim() || "",
        AssignmentDate: values.assignmentDate
          ? dayjs(values.assignmentDate).format("YYYY-MM-DD")
          : null,
        ReturnDate: values.returnDate
          ? dayjs(values.returnDate).format("YYYY-MM-DD")
          : null,
      };

      if (editingAssignment) {
        payload.AssignmentID = editingAssignment.assignmentID;
        await axios.put(
          `${ApiURL}/api/Assignments/${editingAssignment.assignmentID}`,
          payload
        );
        toast.success("Assignment updated successfully!");
      } else {
        await axios.post(`${ApiURL}/api/Assignments`, payload);
        toast.success("Assignment saved successfully!");
      }

      await getAllAssignments();
      handleCancel();
    } catch (err) {
      console.error("Error saving assignment:", err.response?.data || err.message);
      toast.error("Failed to save assignment");
    }
  };

  // Delete Assignment
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${ApiURL}/api/Assignments/${id}`);
      await getAllAssignments();
      toast.success("Assignment deleted successfully!");
    } catch (err) {
      console.error("Error deleting assignment:", err);
      toast.error("Failed to delete assignment");
    }
  };

  const filtered = assignments.filter((a) => {
    const empName = getEmployeeName(a.employeeID).toLowerCase();
    const pcName = a.pcName?.toLowerCase() || "";
    return (
      empName.includes(search.toLowerCase()) ||
      pcName.includes(search.toLowerCase())
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  useEffect(() => setCurrentPage(1), [search]);

  return (
    <div className="assign-page-container">

      <ToastContainer position="top-right" autoClose={2000} />

      <div className="assign-card">
        <h2 className="assign-title">🧾 PC Assignments</h2>

        <div className="assign-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddModal}
          >
            Assign PC
          </Button>

          <Input
            placeholder="Search by Employee/PC Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250, marginLeft: 10 }}
            suffix={<SearchOutlined />}
          />
        </div>

        {/* MODAL */}
        <Modal
          title={editingAssignment ? "Edit Assignment" : "Add Assignment"}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Employee"
              name="EmployeeID"
              rules={[{ required: true, message: "Please select Employee" }]}
            >
              <Select placeholder="Select Employee" style={{ width: "100%" }}>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <Select.Option
                      key={emp.employeeId}
                      value={emp.employeeId}
                    >
                      {emp.employeeId +
                        " / " +
                        emp.firstName +
                        " " +
                        emp.lastName}
                    </Select.Option>
                  ))
                ) : (
                  <Select.Option disabled>No Employees Found</Select.Option>
                )}
              </Select>
            </Form.Item>

            <Form.Item
              label="PC Code"
              name="pcCodes"
              rules={[
                { required: true, message: "Please select at least one PC" },
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Select PC(s)"
                style={{ width: "100%" }}
                value={form.getFieldValue("pcCodes")}
                onChange={(value) => {
                  form.setFieldValue("pcCodes", value);
                  setSelectedPCs(value);
                }}
              >
                {pcDetails.length > 0 ? (
                  pcDetails.map((pc) => (
                    <Select.Option key={pc.pcid} value={pc.pcName}>
                      {pc.pcName + " / " + pc.type}
                    </Select.Option>
                  ))
                ) : (
                  <Select.Option disabled>No PC Details Found</Select.Option>
                )}
              </Select>
            </Form.Item>

            <Form.Item
              label="Assignment Date"
              name="assignmentDate"
              rules={[{ required: true, message: "Please select date" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Return Date" name="returnDate">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: "10px",
                }}
              >
                <Button type="primary" htmlType="submit">
                  {editingAssignment ? "Update" : "Save"}
                </Button>
                <Button onClick={handleCancel}>Cancel</Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* TABLE */}
        <table className="assign-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>PC Name</th>
              <th>Assignment Date</th>
              <th>Return Date</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5">Loading...</td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((a) => (
                <tr key={a.assignmentID}>
                  <td>{a.employeeID}</td>
                  <td>{a.pcName}</td>
                  <td>{dayjs(a.assignmentDate).format("YYYY-MM-DD")}</td>
                  <td>
                    {a.returnDate
                      ? dayjs(a.returnDate).format("YYYY-MM-DD")
                      : "-"}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Button
                        type="primary"
                        className="pc-edit-btn"
                        icon={<EditOutlined />}
                        onClick={() => showEditModal(a.assignmentID)}
                      ></Button>

                      <Popconfirm
                        title="Delete this assignment?"
                        onConfirm={() => handleDelete(a.assignmentID)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          danger
                          className="pc-delete-btn1"
                          icon={<DeleteOutlined />}
                        ></Button>
                      </Popconfirm>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No assignments found</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          onChange={handlePageChange}
          showSizeChanger
          pageSizeOptions={["5", "10", "20"]}
          style={{ marginTop: 20, textAlign: "right" }}
        />
      </div>
    </div>
  );
};

export default AssignmentsPage;
