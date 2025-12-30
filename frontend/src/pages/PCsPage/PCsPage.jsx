import React, { useEffect, useState } from "react";
import { Button, Modal, Form, Input, Pagination } from "antd";
import axios from "axios";
import "./PCsPage.css";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Select } from "antd";

const ApiURL = 'https://hrms.flairminds.com';

const PCsPage = () => {
  const [pcs, setPcs] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const { confirm } = Modal;
  const [form] = Form.useForm();

  // Fetch all PCs
  const getAllPCs = async () => {
    try {
      const res = await axios.get(`${ApiURL}/api/PCs`);
      setPcs(res.data);
    } catch (err) {
      console.error("Error fetching PCs:", err);
    }
  };

  const handleDelete = async (pcId) => {
    if (!window.confirm("Are you sure you want to delete this PC?")) return;

    try {
      const res = await axios.delete(`${ApiURL}/api/PCs/${pcId}`);
      console.log("Delete response:", res.data);

      await getAllPCs();
      toast.success("PC deleted successfully!");
    } catch (err) {
      console.error("Error deleting PC:", err);
      toast.error("Failed to delete PC. Please try again.");
    }
  };

  // Edit PC
  const handleEdit = async (pcId) => {
    try {
      const res = await axios.get(`${ApiURL}/api/PCs/${pcId}`);
      const pcData = res.data;
      console.log("pcData", pcData);

      const formatLocalDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      };

      const formattedPurchaseDate = formatLocalDate(pcData.purchaseDate);
      const formattedWarrantyTill = formatLocalDate(pcData.warrantyTill);

      form.setFieldsValue({
        pcid: pcData.pcid,
        pcName: pcData.pcName,
        type: pcData.type,
        purchaseDate: formattedPurchaseDate,
        warrantyTill: formattedWarrantyTill,
      });

      setIsModalVisible(true);
    } catch (err) {
      console.error("Error fetching PC data:", err);
    }
  };

  // Show Add PC Modal
  const showModal = () => {
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Submit new PC
  const handleAddPC = async (values) => {
    try {
      const formattedValues = {
        ...values,
        purchaseDate: values.purchaseDate || null,
        warrantyTill: values.warrantyTill || null,
      };

      if (formattedValues.pcid) {
        await axios.post(`${ApiURL}/api/PCs`, formattedValues);
        toast.success("PC updated successfully!");
      } else {
        await axios.post(`${ApiURL}/api/PCs`, formattedValues);
        toast.success("PC saved successfully!");
      }

      await getAllPCs();
      setIsModalVisible(false);
      form.resetFields();
    } catch (err) {
      console.error("Error saving PC:", err);
      toast.error("Failed to save PC data");
    }
  };

  // Filter by search
  const filteredPCs = pcs.filter(
    (pc) =>
      pc.pcName?.toLowerCase().includes(search.toLowerCase()) ||
      pc.brand?.toLowerCase().includes(search.toLowerCase()) ||
      pc.model?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination slice
  const paginatedPCs = filteredPCs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    getAllPCs();
  }, []);

  return (
    <div className="pc-page-container">
      <div className="pc-card">
        <h1 className="pc-title">💻 PC Management</h1>

        <div className="pc-actions">
          <Button type="primary" className="pc-add-btn" onClick={showModal}>
            + Add PC
          </Button>

          <input
            placeholder="Search by PC Code..."
            className="pc-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250, marginLeft: 10 }}
          />
        </div>

        

        {/* Add PC Modal */}
        <Modal
          title="Add New PC"
          visible={isModalVisible}
          onCancel={handleCancel}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleAddPC}>
            <Form.Item label="id" name="pcid" style={{ display: "none" }}>
              <Input />
            </Form.Item>

            <Form.Item
              label="PC Code"
              name="pcName"
              rules={[{ required: true, message: "Please enter PC Name" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: "Please select Type" }]}
            >
              <Select placeholder="Select Type" style={{ width: "100%" }}>
                {[
                  { id: "CPU", name: "CPU" },
                  { id: "Monitor", name: "Monitor" },
                  { id: "Mouse", name: "Mouse" },
                  { id: "Keyboard", name: "Keyboard" },
                  { id: "Headphone", name: "Headphone" },
                ].map((pc) => (
                  <Select.Option key={pc.id} value={pc.name}>
                    {pc.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Purchase Date"
              name="purchaseDate"
              rules={[
                { message: "Please select Purchase Date" },
              ]}
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item
              label="Warranty Till"
              name="warrantyTill"
              rules={[
                { message: "Please select Warranty Till" },
              ]}
            >
              <Input type="date" />
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
                  Save
                </Button>
                <Button onClick={handleCancel}>Cancel</Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* PCs Table */}
        <table className="pc-table">
          <thead>
            <tr>
              <th>PC Code</th>
              <th>Type</th>
              <th>PurchaseDate</th>
              <th>WarrantyTill</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPCs.map((pc) => (
              <tr key={pc.id}>
                <td>{pc.pcName}</td>
                <td>{pc.type}</td>
                <td>{pc.purchaseDate ? pc.purchaseDate.split("T")[0] : ""}</td>
                <td>{pc.warrantyTill ? pc.warrantyTill.split("T")[0] : ""}</td>

                <td>
                  <div className="action-buttons">
                    <Button
                      type="primary"
                      className="pc-edit-btn"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(pc.pcid)}
                    ></Button>

                    <Button
                      danger
                      className="pc-delete-btn1"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(pc.pcid)}
                    ></Button>
                  </div>
                </td>
              </tr>
            ))}

            {paginatedPCs.length === 0 && (
              <tr>
                <td colSpan="8" className="no-data">
                  No PCs found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filteredPCs.length}
          onChange={handlePageChange}
          showSizeChanger
          pageSizeOptions={["5", "10", "20"]}
          style={{ marginTop: "20px", textAlign: "right" }}
        />
      </div>

      {/* Toast Container (required) */}
      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

export default PCsPage;
