import React, { useState, useEffect } from 'react';
import {
    Modal, Form, Input, Select, DatePicker,
    Button, Tag, Descriptions, Popconfirm, message
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    createGoalForSelf,
    deleteGoal,
    getMasterSkills
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

const GOAL_CATEGORIES = [
    'Self-Training',
    'Certification',
    'Project Related Training',
    'Other',
];

/**
 * Unified Goal Modal — Create & View/Delete only.
 * Once a goal is created it cannot be edited.
 *
 * Props:
 *   visible   – boolean
 *   onClose   – () => void
 *   onSuccess – () => void  (refresh table)
 *   goal      – goal object (view mode) | null (create mode)
 */
const CreateGoalModal = ({ visible, onClose, onSuccess, goal }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [masterSkills, setMasterSkills] = useState([]);
    const [goalType, setGoalType] = useState(null);   // track for conditional skill field

    const isCreate = !goal;

    /* ── Fetch master skills once ── */
    useEffect(() => {
        getMasterSkills()
            .then(res => {
                const list = res.data?.data || [];
                setMasterSkills(list.map(s => ({ value: s.skillId, label: s.skillName })));
            })
            .catch(() => message.error('Failed to load skills list'));
    }, []);

    /* ── Populate / reset form when modal opens ── */
    useEffect(() => {
        if (visible) {
            if (goal) {
                setGoalType(goal.goalType || goal.type);
            } else {
                setGoalType(null);
                form.resetFields();
            }
        }
    }, [visible, goal, form]);

    const handleClose = () => {
        form.resetFields();
        setGoalType(null);
        onClose();
    };

    /* ── Create ── */
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                goalType: values.goalType,
                goalTitle: values.goalTitle,
                skillId: values.skillId || null,
                goalDescription: values.goalDescription || '',
                goalCategory: values.goalCategory || null,
                deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
            };
            await createGoalForSelf(payload);
            message.success('Goal created successfully');
            onSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            message.error('Failed to create goal');
        } finally {
            setLoading(false);
        }
    };

    /* ── Delete ── */
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

    /* ─────────────────── VIEW mode ─────────────────── */
    const renderViewContent = () => {
        const deadline = goal?.dueDate || goal?.deadline;

        return (
            <>
                <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Type">
                        <Tag color="purple">
                            {(goal?.goalType || goal?.type) === 'skill' ? 'Skill Development' : 'Other'}
                        </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Title">
                        {goal?.goalTitle || '-'}
                    </Descriptions.Item>

                    {(goal?.goalType || goal?.type) === 'skill' && goal?.skillName && (
                        <Descriptions.Item label="Skill">
                            {goal.skillName}
                        </Descriptions.Item>
                    )}

                    <Descriptions.Item label="Category">
                        {goal?.goalCategory || goal?.category || '-'}
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
                        {deadline ? new Date(deadline).toLocaleDateString() : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                        {goal?.description || goal?.goalDescription || '-'}
                    </Descriptions.Item>
                </Descriptions>

                {/* <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
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
                </div> */}
            </>
        );
    };

    /* ─────────────────── CREATE form ─────────────────── */
    const renderCreateForm = () => (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* Goal Type */}
            <Form.Item
                name="goalType"
                label="Goal Type"
                rules={[{ required: true, message: 'Please select a goal type' }]}
            >
                <Select
                    placeholder="Select type"
                    onChange={(val) => {
                        setGoalType(val);
                        // Clear the fields that depend on goal type
                        form.setFieldsValue({ skillId: undefined, goalTitle: undefined });
                    }}
                >
                    <Option value="skill">Skill Development</Option>
                    <Option value="other">Other</Option>
                </Select>
            </Form.Item>

            {/* Title — always shown */}
            <Form.Item
                name="goalTitle"
                label="Title"
                rules={[{ required: true, message: 'Title is required' }]}
            >
                <Input placeholder="Goal title" />
            </Form.Item>

            {/* Skill — only when type = skill */}
            {goalType === 'skill' && (
                <Form.Item
                    name="skillId"
                    label="Skill"
                    rules={[{ required: true, message: 'Please select a skill' }]}
                >
                    <Select
                        placeholder="Select a skill"
                        showSearch
                        filterOption={(input, option) =>
                            option.children.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {masterSkills.map(s => (
                            <Option key={s.value} value={s.value}>{s.label}</Option>
                        ))}
                    </Select>
                </Form.Item>
            )}

            {/* Category dropdown */}
            <Form.Item
                name="goalCategory"
                label="Category"
                rules={[{ required: true, message: 'Please select a category' }]}
            >
                <Select placeholder="Select category">
                    {GOAL_CATEGORIES.map(c => (
                        <Option key={c} value={c}>{c}</Option>
                    ))}
                </Select>
            </Form.Item>

            {/* Description */}
            <Form.Item name="goalDescription" label="Description">
                <TextArea rows={3} placeholder="Describe the goal..." />
            </Form.Item>

            {/* Deadline */}
            <Form.Item
                name="deadline"
                label="Deadline"
                rules={[{ required: true, message: 'Please select a deadline' }]}
            >
                <DatePicker style={{ width: '100%' }} disabledDate={d => d && d < dayjs().startOf('day')} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Create Goal
                    </Button>
                </div>
            </Form.Item>
        </Form>
    );

    const title = isCreate
        ? 'Create New Goal'
        : (goal?.skillName || goal?.title || goal?.goalTitle || 'Goal Details');

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
            {isCreate ? renderCreateForm() : renderViewContent()}
        </Modal>
    );
};

export default CreateGoalModal;
