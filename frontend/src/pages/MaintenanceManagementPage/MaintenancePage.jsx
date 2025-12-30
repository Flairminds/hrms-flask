import React, { useEffect, useState } from "react";
import axios from "axios";
import {Button,Modal,Form,Input,DatePicker,Pagination,Popconfirm,Select,} from "antd";
import {PlusOutlined,EditOutlined,SearchOutlined,DeleteOutlined,} from "@ant-design/icons";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./MaintenancePage.css";

const { Option } = Select;
const ApiURL = 'https://hrms.flairminds.com';

const MaintenancePage = () => {
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [pcDetails, setPcDetails] = useState([]);

  const [formData, setFormData] = useState({
    pcid: "",
    issueDescription: "",
    maintenanceDate: "",
    status: "",
    notes: "",
  });

  // Fetch maintenance
  const getAllMaintenance = async () => {
    try {
      const res = await axios.get(`${ApiURL}/api/Maintenance`);
      const data =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.$values)
          ? res.data.$values
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];
      setMaintenanceLogs(data);
    } catch (err) {
      console.error("Error fetching maintenance logs:", err);
      toast.error("Failed to load maintenance records");
      setMaintenanceLogs([]);
    }
  };

  // Fetch PCs
  const getAllPCs = async () => {
    try {
      const res = await axios.get(`${ApiURL}/api/PCs`);
      setPcDetails(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching PCs:", err);
      toast.error("Failed to load PC details");
    }
  };

  // Open Modal
  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        pcid: record.pcid,
        issueDescription: record.issueDescription,
        maintenanceDate: record.maintenanceDate?.split("T")[0],
        status: record.status,
        notes: record.notes,
      });
      form.setFieldsValue({
        pcid: record.pcid,
        issueDescription: record.issueDescription,
        maintenanceDate: record.maintenanceDate?.split("T")[0],
        status: record.status,
        notes: record.notes,
      });
    } else {
      setEditingRecord(null);
      setFormData({
        pcid: "",
        issueDescription: "",
        maintenanceDate: "",
        status: "",
        notes: "",
      });
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // Save
  const handleSave = async () => {
    try {
      if (!formData.pcid || !formData.issueDescription) {
        toast.warning("Please fill all required fields");
        return;
      }

      if (editingRecord) {
        await axios.put(
          `${ApiURL}/api/Maintenance/${editingRecord.maintenanceID}`,
          formData
        );
        toast.success("Maintenance updated successfully");
      } else {
        await axios.post(`${ApiURL}/api/Maintenance`, formData);
        toast.success("Maintenance record added successfully");
      }

      setIsModalOpen(false);
      getAllMaintenance();
    } catch (err) {
      console.error("Error saving maintenance:", err);
      toast.error("Failed to save maintenance record");
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`${ApiURL}/api/Maintenance/${id}`);
      toast.success("Maintenance deleted successfully");
      getAllMaintenance();
    } catch (err) {
      console.error("Error deleting maintenance:", err);
      toast.error("Failed to delete maintenance record");
    }
  };

  // Search Filter
  const filteredLogs = Array.isArray(maintenanceLogs)
    ? maintenanceLogs.filter(
        (m) =>
          m.pcName?.toLowerCase().includes(search.toLowerCase()) ||
          m.status?.toLowerCase().includes(search.toLowerCase()) ||
          m.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  useEffect(() => {
    getAllMaintenance();
    getAllPCs();
  }, []);

  return (
    <div className="maint-page-container">
      <ToastContainer position="top-right" autoClose={2000} />

      <div className="maint-card">
        <h1 className="maint-title">🛠️ PC Maintenance Management</h1>

        <div className="maint-actions">
          <Button
            type="primary"
            className="maint-add-btn"
            onClick={() => openModal()}
          >
            + Add Maintenance
          </Button>

           <Input
                      placeholder="Search by Status/Issue..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: 250, marginLeft: 10 }}
                      suffix={<SearchOutlined />}
                    />
        </div>

        {/* Table */}
        <table className="maint-table">
          <thead>
            <tr>
              <th>PC Name</th>
              <th>Issue</th>
              <th>Maintenance Date</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((m) => (
                <tr key={m.maintenanceID}>
                  <td>
                    {pcDetails.find((pc) => pc.pcid === m.pcid)?.pcName ||
                      `PC-${m.pcid}`}
                  </td>
                  <td>{m.issueDescription}</td>
                  <td>{m.maintenanceDate?.split("T")[0]}</td>
                  <td>{m.status}</td>
                  <td>{m.notes}</td>

                  <td>
                    <div className="action-buttons">
                      <Button
                        type="primary"
                        className="pc-edit-btn"
                        icon={<EditOutlined />}
                        onClick={() => openModal(m)}
                      />

                      <Popconfirm
                        title="Delete this maintenance record?"
                        onConfirm={() => handleDelete(m.maintenanceID)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          danger
                          className="pc-delete-btn1"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  No maintenance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Edit Maintenance" : "Add Maintenance"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
      >
        <div className="modal-form">
          <Form layout="vertical" form={form}>
            <Form.Item
              label="PC Code"
              name="pcid"
              rules={[{ required: true, message: "Please select PC Code" }]}
            >
              <Select
                placeholder="Select PC"
                style={{ width: "100%" }}
                value={formData.pcid}
                onChange={(value) => setFormData({ ...formData, pcid: value })}
              >
                {pcDetails.length > 0 ? (
                  pcDetails.map((pc) => (
                    <Option key={pc.pcid} value={pc.pcid}>
                      {pc.pcName + " / " + pc.type}
                    </Option>
                  ))
                ) : (
                  <Option disabled>No PC Details Found</Option>
                )}
              </Select>
            </Form.Item>

            <Form.Item label="Issue Description" name="issueDescription">
              <Input
                placeholder="Enter issue description"
                value={formData.issueDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    issueDescription: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Form.Item label="Maintenance Date" name="maintenanceDate">
              <Input
                type="date"
                value={formData.maintenanceDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maintenanceDate: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Form.Item label="Status" name="status">
              <Select
                placeholder="Select Status"
                value={formData.status}
                onChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <Option value="Pending">Pending</Option>
                <Option value="In Progress">In Progress</Option>
                <Option value="Completed">Completed</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Notes" name="notes">
              <Input.TextArea
                rows={3}
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
