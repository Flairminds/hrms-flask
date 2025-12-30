import { Button, DatePicker, Modal, Select, Table, Typography } from "antd";
import React, { useEffect, useState } from "react";
import stylesForm from "./LeadForm.module.css";
import moment from "moment";
import tickIcon from "../../assets/HR/tick.svg";
import { getEmployeeList, postForm, GetEmployeeReport } from "../../services/api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCookie } from "../../util/CookieSet";

export const LeadForm = () => {
  const categoryOptions = [
    { label: 'Behavioral', value: 'Behavioral' },
    { label: 'Technical', value: 'Technical' },
    { label: 'Operational', value: 'Operational' },
    { label: 'Quality', value: 'Quality' }
  ];

  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [goal, setGoal] = useState("");
  const [measure, setMeasure] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const [category, setCategory] = useState("");
  const [isGoalFocused, setIsGoalFocused] = useState(false);
  const [isMeasureFocused, setIsMeasureFocused] = useState(false);
  const [isReviewCommentsFocused, setIsReviewCommentsFocused] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGoalComplete, setIsGoalComplete] = useState(false);
  const [isMeasureComplete, setIsMeasureComplete] = useState(false);
  const [isReviewCommentsComplete, setIsReviewCommentsComplete] = useState(false);


  const [entries, setEntries] = useState([]);
  const [noGoalMessage, setNoGoalMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [isEmployeeSelected, setIsEmployeeSelected] = useState(false);
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

  const loadEntries = async (employeeId) => {
    try {
      const response = await GetEmployeeReport(employeeId);

      if (!response.data || response.data.length === 0) {
        setNoGoalMessage("No goals set for this employee.");
        setEntries([]);
        toast.info("No data present for this employee.");
      } else {
        setNoGoalMessage("");
        const formattedEntries = response.data.map(item => ({
          key: item.feedBackId,
          goal: item.goal[0] || "",
          measure: item.measure[0] || "",
          comments: item.comments[0] || "",
          employeeId: item.employeeId,
          category: item.category || "",
          targetDate: moment(item.targetDate).format("YYYY-MM-DD")
        }));
        setEntries(formattedEntries);
      }
    } catch (error) {
      console.log(error);
      toast.error("No data for this employee.");
      setEntries([]);
    }
  };

  const employeeOptions = employeeList.map(employee => ({
    value: employee.employeeId,
    label: `${employee.firstName} ${employee.lastName}`,
  }));

  const handleEmployeeChange = async (value, option) => {
    setSelectedEmployee(value);
    setSelectedEmployeeName(option.label);
    setIsEmployeeSelected(true);
    await loadEntries(value);
  };

  const onChangeDate = (date, dateString) => {
    setDueDate(date);
  };

  const handleGoalInput = (e) => {
    setGoal(e.target.value);
  };

  const handleMeasureInput = (e) => {
    setMeasure(e.target.value);
  };

  const handleReviewCommentsInput = (e) => {
    setReviewComments(e.target.value);
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
  };

  const handleSaveGoal = () => {
    setIsGoalComplete(true);
    setIsGoalFocused(false);
  };

  const handleSaveMeasure = () => {
    setIsMeasureComplete(true);
    setIsMeasureFocused(false);
  };

  const handleSaveReview = () => {
    setIsReviewCommentsComplete(true);
    setIsReviewCommentsFocused(false);
  };

  const resetForm = () => {
    setGoal("");
    setMeasure("");
    setReviewComments("");
    setDueDate(null);
    setCategory("");
    setIsGoalComplete(false);
    setIsMeasureComplete(false);
    setIsReviewCommentsComplete(false);
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setGoal(record.goal);
    setMeasure(record.measure);
    setReviewComments(record.comments);
    setCategory(record.category);
    setDueDate(moment(record.targetDate));
    setIsModalVisible(true);
    setIsEditing(true);
    setEditingKey(record.key);
  };

  const handleOk = async () => {
    const today = new Date();
    const defaultDueDate = today.toISOString().split('T')[0];
    const defaultMeasure = "N/A";
    const defaultCategory = "Behavioral";

    const formData = {
      goal: [goal],
      measure: [measure || defaultMeasure],
      comments: [reviewComments],
      employeeId: selectedEmployee,
      category: category || defaultCategory,
      targetDate: dueDate ? dueDate.format("YYYY-MM-DD") : null,
    };

    try {
      setIsAdding(true);
      const feedbackId = isEditing ? editingKey : 0;
      const formDataWithId = { ...formData, feedbackId };

      const res = await postForm(formDataWithId);

      if (res.status === 200) {
        const { feedbackId: responseFeedbackId } = res.data;

        toast.success("Data Added");

        if (isEditing) {
          setEntries(prevEntries =>
            prevEntries.map(entry =>
              entry.key === editingKey ? {
                ...entry,
                goal,
                measure: measure || defaultMeasure,
                comments: reviewComments,
                category: category || defaultCategory,
                targetDate: dueDate ? dueDate.format("YYYY-MM-DD") : null,
                feedbackId: responseFeedbackId
              } : entry
            )
          );
        } else {
          setEntries(prevEntries => [
            ...prevEntries,
            {
              key: prevEntries.length + 1,
              goal,
              measure: measure || defaultMeasure,
              comments: reviewComments,
              employeeId: selectedEmployee,
              category: category || defaultCategory,
              targetDate: dueDate ? dueDate.format("YYYY-MM-DD") : null,
              feedbackId: responseFeedbackId
            }
          ]);
        }

        resetForm();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
      setIsModalVisible(false);
      setIsEditing(false);
      setEditingKey(null);
    }

  };
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const columns = [
    { title: 'Goal', dataIndex: 'goal', key: 'goal' },
    { title: 'Measure', dataIndex: 'measure', key: 'measure' },
    { title: 'Comments', dataIndex: 'comments', key: 'comments' },
    { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Target Date', dataIndex: 'targetDate', key: 'targetDate' },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Button onClick={() => handleEdit(record)} className={stylesForm.addButtonContainer}>Edit</Button>
      ),
    },
  ];

  return (
    <div className={stylesForm.main}>
      {!isEmployeeSelected && <div className={stylesForm.messageone}>Please select Employee first*</div>}
      <div className={stylesForm.formatdiv}>
        <div className={stylesForm.nameDivSelect}>
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
        <Button
          className={stylesForm.addButtonContainer}
          onClick={showModal}
          loading={isAdding}
          disabled={isAdding || !selectedEmployee}
        >
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
      </div>
      <Modal
        title={<span className={stylesForm.titleHeading}>Add Goal Details</span>}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={isAdding}
        footer={
          <div>
            <Button key="cancel" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              key="submit"
              className={stylesForm.addButtonContainer}
              onClick={handleOk}
              loading={isAdding}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className={stylesForm.gridDiv}>
          <div>
            <div className={stylesForm.nameDiv}>
              <span className={stylesForm.heading}>Goal</span>
              <div className={stylesForm.nameDiv}>
                <div className={stylesForm.inputImg}>
                  <input
                    value={goal}
                    onChange={handleGoalInput}
                    className={stylesForm.input}
                    onFocus={() => setIsGoalFocused(true)}
                    style={{ width: "97%" }}
                  />
                  {isGoalFocused && (
                    <img
                      src={tickIcon}
                      alt="Tick Icon"
                      onClick={handleSaveGoal}
                      style={{ cursor: 'pointer', visibility: isGoalComplete ? 'visible' : 'hidden' }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className={stylesForm.nameDiv}>
              <span className={stylesForm.heading}>Category</span>
              <div className={stylesForm.nameDiv}>
                <Select
                  style={{ width: 455 }}
                  options={categoryOptions}
                  value={category || undefined}
                  onChange={handleCategoryChange}
                  placeholder="Category"
                />
              </div>
            </div>
            <div className={stylesForm.nameDiv}>
              <span className={stylesForm.heading}>Measure</span>
              <div className={stylesForm.nameDiv}>
                <div className={stylesForm.inputImg}>
                  <input
                    value={measure}
                    onChange={handleMeasureInput}
                    className={stylesForm.input}
                    onFocus={() => setIsMeasureFocused(true)}
                    style={{ width: "97%" }}
                  />
                  {isMeasureFocused && (
                    <img
                      src={tickIcon}
                      alt="Tick Icon"
                      onClick={handleSaveMeasure}
                      style={{ cursor: 'pointer', visibility: isMeasureComplete ? 'visible' : 'hidden' }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className={stylesForm.nameDiv}>
              <span className={stylesForm.heading}>Due Date</span>
              <div className={stylesForm.nameDiv}>
                <DatePicker
                  value={dueDate ? dueDate : null}
                  onChange={onChangeDate}
                  format="YYYY-MM-DD"
                  style={{ width: 455 }}
                />
              </div>
            </div>
            <div style={{ paddingTop: "0.4rem" }} className={stylesForm.nameDiv}>
              <span className={stylesForm.heading}>Review Comments</span>
              <div className={stylesForm.nameDiv}>
                <div className={stylesForm.inputImg}>
                  <input
                    value={reviewComments}
                    onChange={handleReviewCommentsInput}
                    className={stylesForm.input}
                    onFocus={() => setIsReviewCommentsFocused(true)}
                    style={{ width: "97%" }}
                  />
                  {isReviewCommentsFocused && (
                    <img
                      src={tickIcon}
                      alt="Tick Icon"
                      onClick={handleSaveReview}
                      style={{ cursor: 'pointer', visibility: isReviewCommentsComplete ? 'visible' : 'hidden' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <ToastContainer />
      {noGoalMessage ? (
        <Typography.Text type="danger">{noGoalMessage}</Typography.Text>
      ) : (
        <div className={stylesForm.tableContainer}>
          <table className={stylesForm.customTable}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.key}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.title === 'Actions' ? (
                        <Button onClick={() => handleEdit(entry)} className={stylesForm.addButtonContainer}>Edit</Button>
                      ) : (
                        entry[col.dataIndex]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
};

