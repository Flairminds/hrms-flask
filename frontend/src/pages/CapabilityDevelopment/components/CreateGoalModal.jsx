import React, { useState, useEffect } from 'react';
import {
    Modal, Form, Input, Select, InputNumber, DatePicker,
    Button, Tag, Descriptions, Popconfirm, message
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    createGoalForSelf,
    updateGoalDetails,
    updateGoalProgress,
    deleteGoal
} from '../../../services/api';

const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLOR = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
};
const STATUS_LABEL = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

/**
 * Unified Goal Modal.
 *
 * Props:
 *   visible     – boolean
 *   onClose     – () => void
 *   onSuccess   – () => void  (refresh table)
 *   goal        – goal object for view/edit, null for create
 */
const CreateGoalModal = ({ visible, onClose, onSuccess, goal }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    // mode: 'view' | 'edit' | 'create'
    const [mode, setMode] = useState('create');

    // Determine mode whenever modal opens
    useEffect(() => {
        if (visible) {
            if (goal) {
                setMode('view');
                // Populate form for potential edit
                form.setFieldsValue({
                    goalType: goal.type || goal.goalType,
                    goalTitle: goal.title || goal.goalTitle,
                    goalDescription: goal.description || goal.goalDescription,
                    goalCategory: goal.category || goal.goalCategory,
                    deadline: goal.dueDate ? dayjs(goal.dueDate) : goal.deadline ? dayjs(goal.deadline) : null,
                    status: goal.status,
                    progress: goal.progress ?? goal.progressPercentage ?? 0,
                });
            } else {
                setMode('create');
                form.resetFields();
            }
        }
    }, [visible, goal, form]);

    const handleClose = () => {
        setMode('create');
        form.resetFields();
        onClose();
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                goalType: values.goalType,
                goalTitle: values.goalTitle,
                goalDescription: values.goalDescription,
                goalCategory: values.goalCategory,
                deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
                status: values.status,
                progress: values.progress,
            };

            if (mode === 'create') {
                await createGoalForSelf(payload);
                message.success('Goal created successfully');
            } else if (mode === 'edit') {
                await updateGoalDetails(goal.goalId, payload);
                if (values.progress !== undefined) {
                    await updateGoalProgress(goal.goalId, {
                        progress: values.progress,
                        notes: values.goalDescription
                    });
                }
                message.success('Goal updated successfully');
            }
            onSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            message.error(mode === 'create' ? 'Failed to create goal' : 'Failed to update goal');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteGoal(goal.goalId);
            message.success('Goal deleted');
            onSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            message.error('Failed to delete goal');
        } finally {
            setLoading(false);
        }
    };

    /* ───────────── View mode ───────────── */
    const renderViewContent = () => (
        <>
            <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Type">
                    <Tag color="purple">{goal?.type || goal?.goalType || '-'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                    {goal?.category || goal?.goalCategory || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                    <Tag color={STATUS_COLOR[goal?.status]}>
                        {STATUS_LABEL[goal?.status] || goal?.status || '-'}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Progress">
                    {goal?.progress ?? goal?.progressPercentage ?? 0}%
                </Descriptions.Item>
                <Descriptions.Item label="Deadline">
                    {goal?.dueDate
                        ? new Date(goal.dueDate).toLocaleDateString()
                        : goal?.deadline
                            ? new Date(goal.deadline).toLocaleDateString()
                            : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                    {goal?.description || goal?.goalDescription || '-'}
                </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Popconfirm
                    title="Delete this goal?"
                    description="This action cannot be undone."
                    onConfirm={handleDelete}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancel"
                >
                    <Button danger icon={<DeleteOutlined />} loading={loading}>
                        Delete
                    </Button>
                </Popconfirm>
                <Button type="primary" icon={<EditOutlined />} onClick={() => setMode('edit')}>
                    Edit
                </Button>
            </div>
        </>
    );

    /* ───────────── Create / Edit form ───────────── */
    const renderForm = () => (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
                name="goalType"
                label="Goal Type"
                rules={[{ required: true, message: 'Please select goal type' }]}
            >
                <Select placeholder="Select type">
                    <Option value="skill">Skill Development</Option>
                    <Option value="other">Other</Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="goalTitle"
                label="Title"
                rules={[{ required: true, message: 'Title is required' }]}
            >
                <Input placeholder="Goal title" />
            </Form.Item>

            <Form.Item name="goalCategory" label="Category">
                <Input placeholder="e.g. Certification, Training" />
            </Form.Item>

            <Form.Item name="goalDescription" label="Description">
                <TextArea rows={3} placeholder="Describe the goal..." />
            </Form.Item>

            <Form.Item
                name="deadline"
                label="Deadline"
                rules={[{ required: true, message: 'Please select a deadline' }]}
            >
                <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            {mode === 'edit' && (
                <>
                    <Form.Item name="status" label="Status">
                        <Select>
                            <Option value="pending">Pending</Option>
                            <Option value="in_progress">In Progress</Option>
                            <Option value="completed">Completed</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="progress"
                        label="Progress (%)"
                        rules={[{
                            validator: (_, v) => v >= 0 && v <= 100
                                ? Promise.resolve()
                                : Promise.reject(new Error('Must be 0–100'))
                        }]}
                    >
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                </>
            )}

            <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button onClick={mode === 'edit' ? () => setMode('view') : handleClose}>
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {mode === 'create' ? 'Create Goal' : 'Save Changes'}
                    </Button>
                </div>
            </Form.Item>
        </Form>
    );

    const title = mode === 'create' ? 'Create New Goal'
        : mode === 'edit' ? 'Edit Goal'
            : (goal?.title || goal?.goalTitle || 'Goal Details');

    return (
        <Modal
            title={title}
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={560}
            style={{ top: 15 }}
            destroyOnClose
        >
            {mode === 'view' ? renderViewContent() : renderForm()}
        </Modal>
    );
};

export default CreateGoalModal;
